import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Disable default Vercel bodyParser so we can access the exact raw bytes for Standard Webhooks HMAC verification
export const config = {
  api: {
    bodyParser: false,
  },
};

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
 * Read raw body stream from IncomingMessage (Vercel Serverless Function)
 */
async function readRawBody(req: any): Promise<string> {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Verify Polar Standard Webhook signature
 */
function verifyPolarSignature(req: any, rawBody: string): { valid: boolean; error?: string } {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Polar Webhook] POLAR_WEBHOOK_SECRET is not configured in environment. Skipping verification.');
    return { valid: true };
  }

  try {
    const webhookId = req.headers['webhook-id'];
    const webhookTimestamp = req.headers['webhook-timestamp'];
    const webhookSignature = req.headers['webhook-signature'] || req.headers['polar-webhook-signature'];

    if (!webhookSignature || !webhookTimestamp || !webhookId) {
      return {
        valid: false,
        error: 'Missing required webhook signature headers (webhook-id, webhook-timestamp, webhook-signature)',
      };
    }

    // Check timestamp tolerance (5 minutes = 300 seconds)
    const timestampSec = parseInt(Array.isArray(webhookTimestamp) ? webhookTimestamp[0] : webhookTimestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (isNaN(timestampSec) || Math.abs(nowSec - timestampSec) > 300) {
      return {
        valid: false,
        error: `Webhook timestamp out of tolerance (${Math.abs(nowSec - timestampSec)}s delta > 300s)`,
      };
    }

    // Decode Standard Webhooks secret (whsec_ prefix is base64 encoded)
    const secretBytes = secret.startsWith('whsec_')
      ? Buffer.from(secret.slice(6), 'base64')
      : Buffer.from(secret, 'utf-8');

    const toSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;
    const hmac = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
    const expectedSig = `v1,${hmac}`;

    const sigsHeader = Array.isArray(webhookSignature) ? webhookSignature.join(' ') : webhookSignature;
    const signatures = sigsHeader.split(' ');

    const isValid = signatures.some((sig: string) => {
      try {
        if (sig === expectedSig || sig === hmac) return true;
        const sigBuffer = Buffer.from(sig);
        const expectedBuffer = Buffer.from(expectedSig);
        if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
          return true;
        }
      } catch {}
      return false;
    });

    if (!isValid) {
      return { valid: false, error: 'Signature mismatch' };
    }

    return { valid: true };
  } catch (err: any) {
    console.error('[Polar Webhook] Signature verification error:', err);
    return { valid: false, error: err.message };
  }
}

export default async function handler(req: any, res: any) {
  // Health check response for GET requests
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
    const rawBody = await readRawBody(req);
    if (!rawBody || rawBody.trim() === '') {
      return res.status(400).json({ error: 'Empty payload' });
    }

    // Verify HMAC signature
    const verification = verifyPolarSignature(req, rawBody);
    if (!verification.valid) {
      console.warn('[Polar Webhook] Rejected unauthorized payload:', verification.error);
      return res.status(401).json({ error: verification.error || 'Invalid webhook signature' });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const eventType: string = (payload?.type || payload?.event || '').trim().toLowerCase();
    const eventData = payload?.data || {};

    console.log(`[Polar Webhook] Received event: ${eventType}`, {
      id: eventData?.id,
      customer_email: eventData?.customer?.email || eventData?.customer_email,
      status: eventData?.status,
    });

    // Disambiguate subscription ID vs order ID
    let subscriptionId: string | null = null;
    let orderId: string | null = null;

    if (eventType.startsWith('subscription.')) {
      subscriptionId = eventData?.id || eventData?.subscription_id || null;
    } else if (eventType.startsWith('order.')) {
      orderId = eventData?.id || null;
      subscriptionId = eventData?.subscription_id || null;
    } else {
      subscriptionId = eventData?.subscription_id || eventData?.id || null;
    }

    // Customer ID
    const customerId: string | null =
      eventData?.customer_id ||
      eventData?.customer?.id ||
      eventData?.customer_metadata?.customer_id ||
      null;

    // Normalize customer email
    const rawEmail: string | null =
      eventData?.customer?.email ||
      eventData?.customer_email ||
      eventData?.email ||
      eventData?.user?.email ||
      null;
    const userEmail: string | null = rawEmail ? rawEmail.trim().toLowerCase() : null;

    // User UUID in Supabase
    const userId: string | null =
      eventData?.metadata?.user_id ||
      eventData?.customer?.metadata?.user_id ||
      eventData?.customer_metadata?.user_id ||
      eventData?.custom_field_data?.user_id ||
      eventData?.customer?.external_id ||
      null;

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
      eventType === 'subscription.uncanceled' ||
      eventType === 'subscription.cycled' ||
      (eventType === 'subscription.updated' && ['active', 'trialing'].includes(eventData?.status)) ||
      (eventType === 'order.created' && eventData?.status === 'paid') ||
      eventType === 'order.paid' ||
      (eventType === 'checkout.updated' && ['succeeded', 'confirmed'].includes(eventData?.status));

    if (isProActivationEvent) {
      console.log(`[Polar Webhook] Activating Pro for user (ID: ${userId}, Email: ${userEmail}, Sub: ${subscriptionId})`);

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

      let activated = !rpcError && rpcResult?.success && (rpcResult?.affected_rows ?? 1) > 0;

      // 1b. Fallback direct update if RPC failed or affected 0 rows
      if (!activated) {
        console.warn('[Polar Webhook] RPC upgrade did not update rows, attempting direct query fallback. RPC:', rpcResult, rpcError);
        let query = supabase.from('profiles').update({
          is_pro: true,
          plan_tier: 'pro',
          polar_customer_id: customerId,
          polar_subscription_id: subscriptionId,
          ai_credits_remaining: 999,
          updated_at: new Date().toISOString(),
        });

        if (userId) {
          query = query.eq('id', userId);
        } else if (userEmail) {
          query = query.ilike('email', userEmail);
        }

        const { error: directError, data: directData } = await query.select();
        if (directError) {
          console.error('[Polar Webhook] Direct update error:', directError.message);
        } else if (directData && directData.length > 0) {
          activated = true;
        }
      }

      return res.status(200).json({
        received: true,
        action: 'pro_activated',
        success: activated,
        user: { id: userId, email: userEmail },
        subscription_id: subscriptionId,
        order_id: orderId,
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
        ['canceled', 'revoked', 'unpaid', 'past_due', 'incomplete_expired'].includes(eventData?.status));

    if (isDowngradeEvent) {
      console.log(`[Polar Webhook] Downgrading to Free tier for user (ID: ${userId}, Email: ${userEmail}, Sub: ${subscriptionId})`);

      // 2a. Call database RPC function
      const { data: rpcResult, error: rpcError } = await supabase.rpc('downgrade_from_pro', {
        user_uuid: userId,
        user_email: userEmail,
        sub_id: subscriptionId,
      });

      let downgraded = !rpcError && rpcResult?.success;

      // 2b. Fallback direct update
      if (!downgraded) {
        console.warn('[Polar Webhook] RPC downgrade failed or affected 0 rows, attempting direct update:', rpcError?.message);
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
          console.error('[Polar Webhook] Direct downgrade update error:', directError.message);
        } else {
          downgraded = true;
        }
      }

      return res.status(200).json({
        received: true,
        action: 'pro_downgraded',
        success: downgraded,
        user: { id: userId, email: userEmail },
      });
    }

    // Default acknowledgement for informational events
    return res.status(200).json({ received: true, event: eventType });
  } catch (err: any) {
    console.error('[Polar Webhook] Unhandled exception:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
