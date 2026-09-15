import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req: any, res: any) {
  // Support GET for testing / health check
  if (req.method === 'GET') {
    return res.status(200).json({
      service: 'Schedy Subscription Sync API',
      status: 'ready',
      polar_configured: Boolean(process.env.POLAR_ACCESS_TOKEN),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON request body' });
      }
    }

    const rawEmail: string | undefined = body?.email;
    const userId: string | undefined = body?.userId || body?.user_id;
    const cleanEmail = rawEmail ? rawEmail.trim().toLowerCase() : undefined;

    if (!cleanEmail && !userId) {
      return res.status(400).json({ error: 'Missing required user identifier (email or userId)' });
    }

    console.log(`[Sync Subscription] Checking status for ${cleanEmail || userId}...`);

    // Create an authenticated client if the user provided an Authorization token
    const authHeader = req.headers['authorization'];
    const dbClient = authHeader
      ? createClient(SUPABASE_URL, SUPABASE_KEY, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false },
        })
      : supabase;

    let polarSub: any = null;
    const polarToken = process.env.POLAR_ACCESS_TOKEN;

    // 1. If POLAR_ACCESS_TOKEN is configured, query Polar API directly
    if (polarToken) {
      try {
        const polarRes = await fetch('https://api.polar.sh/v1/subscriptions/?limit=100', {
          headers: {
            Authorization: `Bearer ${polarToken}`,
            Accept: 'application/json',
          },
        });

        if (polarRes.ok) {
          const polarData = await polarRes.json();
          const items: any[] = polarData?.items || polarData?.data || [];

          polarSub = items.find((sub: any) => {
            const subEmail = (sub?.customer?.email || sub?.customer_email || '').trim().toLowerCase();
            const matchesEmail = cleanEmail && subEmail === cleanEmail;
            const subUserId =
              sub?.metadata?.user_id ||
              sub?.customer?.metadata?.user_id ||
              sub?.customer?.external_id;
            const matchesId = userId && subUserId === userId;
            return matchesEmail || matchesId;
          });

          if (polarSub) {
            console.log(`[Sync Subscription] Found Polar subscription (${polarSub.id}) with status: ${polarSub.status}`);
            const isActive = polarSub.status === 'active' || polarSub.status === 'trialing';

            if (isActive) {
              await supabase.rpc('upgrade_to_pro_by_identifier', {
                user_uuid: userId || null,
                user_email: cleanEmail || null,
                customer_id: polarSub.customer_id || polarSub.customer?.id || null,
                subscription_id: polarSub.id,
              });

              return res.status(200).json({
                success: true,
                is_pro: true,
                plan_tier: 'pro',
                source: 'polar_api',
                subscription_id: polarSub.id,
                status: polarSub.status,
              });
            } else {
              await supabase.rpc('downgrade_from_pro', {
                user_uuid: userId || null,
                user_email: cleanEmail || null,
                sub_id: polarSub.id,
              });

              return res.status(200).json({
                success: true,
                is_pro: false,
                plan_tier: 'free',
                source: 'polar_api',
                status: polarSub.status,
              });
            }
          }
        } else {
          console.warn('[Sync Subscription] Polar API responded with status:', polarRes.status);
        }
      } catch (err) {
        console.error('[Sync Subscription] Failed to query Polar API:', err);
      }
    }

    // 2. Query current profile in Supabase to return latest state
    const { data: profileRpc } = await dbClient.rpc('get_profile_by_identifier', {
      user_uuid: userId || null,
      user_email: cleanEmail || null,
    });

    if (profileRpc?.found) {
      return res.status(200).json({
        success: true,
        is_pro: Boolean(profileRpc.is_pro),
        plan_tier: profileRpc.plan_tier || 'free',
        source: 'database_profile',
        polar_subscription_id: profileRpc.polar_subscription_id,
        polar_customer_id: profileRpc.polar_customer_id,
        ai_credits_remaining: profileRpc.ai_credits_remaining,
      });
    }

    // 3. Fallback direct select on profiles
    let query = dbClient.from('profiles').select('*');
    if (userId) {
      query = query.eq('id', userId);
    } else if (cleanEmail) {
      query = query.ilike('email', cleanEmail);
    }

    const { data: directProfiles } = await query.limit(1);
    const existing = directProfiles?.[0];

    if (existing) {
      return res.status(200).json({
        success: true,
        is_pro: Boolean(existing.is_pro),
        plan_tier: existing.plan_tier || 'free',
        source: 'database_direct',
        polar_subscription_id: existing.polar_subscription_id,
        polar_customer_id: existing.polar_customer_id,
        ai_credits_remaining: existing.ai_credits_remaining,
      });
    }

    return res.status(200).json({
      success: false,
      is_pro: false,
      plan_tier: 'free',
      notice: 'User profile not found yet',
    });
  } catch (err: any) {
    console.error('[Sync Subscription] Unhandled error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
