import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Dedicated Supabase Auth & Pro DB credentials (schedy-pro-db)
const SUPABASE_URL =
  process.env.VITE_AUTH_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://bakikqtlyccvsknwazpm.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_AUTH_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJha2lrcXRseWNjdnNrbndhenBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNjY1MDIsImV4cCI6MjEwNDg0MjUwMn0.PfLAXqRb_TzhU-E2GTWNJ4PuUbDnBSCt_lTs8BBtIjo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Verify Polar standard webhook signature if POLAR_WEBHOOK_SECRET is set
 */
function verifyPolarSignature(req: any, rawBody: string): boolean {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    // If no secret configured in environment, proceed with caution
    return true;
  }

  try {
    const webhookId = req.headers['webhook-id'];
    const webhookTimestamp = req.headers['webhook-timestamp'];
    const webhookSignature = req.headers['webhook-signature'] || req.headers['polar-webhook-signature'];

    if (!webhookSignature || !webhookTimestamp || !webhookId) {
      console.warn('[Polar Webhook] Missing signature headers');
      return false;
    }

    // Standard Webhooks specification
    const secretBytes = secret.startsWith('whsec_')
      ? Buffer.from(secret.slice(6), 'base64')
      : Buffer.from(secret, 'utf-8');

    const toSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;
    const hmac = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');

    const signatures = Array.isArray(webhookSignature)
      ? webhookSignature[0].split(' ')
      : webhookSignature.split(' ');

    const expectedSig = `v1,${hmac}`;
    return signatures.some((sig: string) => sig === expectedSig || sig === hmac);
  } catch (err) {
    console.error('[Polar Webhook] Signature verification error:', err);
    return false;
  }
}

export default async function handler(req: any, res: any) {
  // Graceful response for health checks or manual browser GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Schedy Polar Webhook',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let payload = req.body;
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
    }

    // Verify signature if secret configured
    if (!verifyPolarSignature(req, rawBody)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const eventType: string = payload?.type || payload?.event || '';
    const eventData = payload?.data || {};

    console.log(`[Polar Webhook] Received event: ${eventType}`, {
      id: eventData?.id,
      customer_email: eventData?.customer?.email || eventData?.customer_email,
    });

    // Extract user identifiers from Polar payload
    const userId =
      eventData?.metadata?.user_id ||
      eventData?.custom_field_data?.user_id ||
      eventData?.customer?.metadata?.user_id ||
      null;

    const userEmail =
      eventData?.customer?.email ||
      eventData?.customer_email ||
      eventData?.email ||
      null;

    const subscriptionId = eventData?.id || eventData?.subscription_id || null;
    const customerId = eventData?.customer_id || eventData?.customer?.id || null;

    if (!userId && !userEmail && !subscriptionId) {
      console.warn('[Polar Webhook] No user identifiers found in payload', eventData);
      return res.status(200).json({ received: true, notice: 'No user identifiers found in payload' });
    }

    // -------------------------------------------------------------------------
    // 1. PRO UPGRADE / ACTIVE / RENEWAL EVENTS
    // -------------------------------------------------------------------------
    const isProActivationEvent =
      eventType === 'subscription.created' ||
      eventType === 'subscription.active' ||
      eventType === 'order.created' ||
      (eventType === 'subscription.updated' && eventData?.status === 'active');

    if (isProActivationEvent) {
      console.log(`[Polar Webhook] Activating Pro for user (ID: ${userId}, Email: ${userEmail})`);

      // 1a. Call database RPC function
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'upgrade_to_pro_by_identifier',
        {
          user_uuid: userId,
          user_email: userEmail,
          customer_id: customerId,
          subscription_id: subscriptionId,
        }
      );

      // 1b. Fallback direct update if Service Role Key is active
      if (rpcError) {
        console.warn('[Polar Webhook] RPC upgrade failed, trying direct update:', rpcError.message);
        let query = supabase.from('profiles').update({
          is_pro: true,
          plan_tier: 'pro',
          polar_customer_id: customerId,
          polar_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        });

        if (userId) {
          query = query.eq('id', userId);
        } else if (userEmail) {
          query = query.ilike('email', userEmail);
        }

        const { error: directError } = await query;
        if (directError) {
          console.error('[Polar Webhook] Direct update error:', directError.message);
        }
      }

      return res.status(200).json({
        received: true,
        action: 'pro_activated',
        user: { id: userId, email: userEmail },
      });
    }

    // -------------------------------------------------------------------------
    // 2. CANCELLATION / EXPIRATION / REVOCATION EVENTS
    // -------------------------------------------------------------------------
    const isDowngradeEvent =
      eventType === 'subscription.revoked' ||
      eventType === 'subscription.canceled' ||
      eventType === 'order.refunded' ||
      (eventType === 'subscription.updated' &&
        (eventData?.status === 'canceled' || eventData?.status === 'revoked' || eventData?.status === 'unpaid'));

    if (isDowngradeEvent) {
      console.log(`[Polar Webhook] Downgrading to Free tier for user (ID: ${userId}, Email: ${userEmail}, Sub: ${subscriptionId})`);

      // 2a. Call database RPC function
      const { data: rpcResult, error: rpcError } = await supabase.rpc('downgrade_from_pro', {
        user_uuid: userId,
        user_email: userEmail,
        sub_id: subscriptionId,
      });

      // 2b. Fallback direct update if Service Role Key is active
      if (rpcError) {
        console.warn('[Polar Webhook] RPC downgrade failed, trying direct update:', rpcError.message);
        let query = supabase.from('profiles').update({
          is_pro: false,
          plan_tier: 'free',
          updated_at: new Date().toISOString(),
        });

        if (userId) {
          query = query.eq('id', userId);
        } else if (subscriptionId) {
          query = query.eq('polar_subscription_id', subscriptionId);
        } else if (userEmail) {
          query = query.ilike('email', userEmail);
        }

        const { error: directError } = await query;
        if (directError) {
          console.error('[Polar Webhook] Direct update error:', directError.message);
        }
      }

      return res.status(200).json({
        received: true,
        action: 'pro_downgraded',
        user: { id: userId, email: userEmail },
      });
    }

    // Default acknowledgement for other events
    return res.status(200).json({ received: true, event: eventType });
  } catch (err: any) {
    console.error('[Polar Webhook] Unhandled exception:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
