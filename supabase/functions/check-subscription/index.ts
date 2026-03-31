import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

const FEE_THRESHOLD = 9.99;
const BASIC_PRODUCT_ID = "prod_UCAeNObjQO0JQv";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for paid Stripe subscription first
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let hasActiveSub = false;
    let productId: string | null = null;
    let priceId: string | null = null;
    let subscriptionEnd: string | null = null;

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        hasActiveSub = true;
        const sub = subscriptions.data[0];
        subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
        productId = sub.items.data[0].price.product as string;
        priceId = sub.items.data[0].price.id;
        logStep("Active paid subscription found", { productId, priceId, subscriptionEnd });
      }
    }

    // If no paid subscription, check for fee-based Basic upgrade
    if (!hasActiveSub) {
      logStep("No paid subscription, checking fee-based upgrade");

      // Check for an active (non-expired) fee upgrade
      const { data: activeUpgrade } = await supabaseClient
        .from("fee_upgrades")
        .select("*")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);

      if (activeUpgrade && activeUpgrade.length > 0) {
        hasActiveSub = true;
        productId = BASIC_PRODUCT_ID;
        subscriptionEnd = activeUpgrade[0].expires_at;
        logStep("Active fee-based Basic upgrade found", { expires: subscriptionEnd });
      } else {
        // Check accumulated fees and auto-grant if threshold met
        const { data: profile } = await supabaseClient
          .from("creator_profiles")
          .select("accumulated_fees")
          .eq("user_id", user.id)
          .single();

        const accumulatedFees = Number(profile?.accumulated_fees ?? 0);
        logStep("Accumulated fees", { accumulatedFees, threshold: FEE_THRESHOLD });

        if (accumulatedFees >= FEE_THRESHOLD) {
          // Check they haven't already been granted for this fee cycle
          const { data: existingUpgrades } = await supabaseClient
            .from("fee_upgrades")
            .select("accumulated_fees_at_grant")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastGrantFees = existingUpgrades && existingUpgrades.length > 0
            ? Number(existingUpgrades[0].accumulated_fees_at_grant)
            : 0;

          // Grant if fees have crossed a new $9.99 threshold since last grant
          const thresholdsCrossed = Math.floor(accumulatedFees / FEE_THRESHOLD);
          const lastThresholdsCrossed = Math.floor(lastGrantFees / FEE_THRESHOLD);

          if (thresholdsCrossed > lastThresholdsCrossed) {
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);

            const { error: insertError } = await supabaseClient
              .from("fee_upgrades")
              .insert({
                user_id: user.id,
                expires_at: expiresAt.toISOString(),
                accumulated_fees_at_grant: accumulatedFees,
              });

            if (!insertError) {
              hasActiveSub = true;
              productId = BASIC_PRODUCT_ID;
              subscriptionEnd = expiresAt.toISOString();
              logStep("Auto-granted free Basic month", { expires: subscriptionEnd, fees: accumulatedFees });
            } else {
              logStep("Failed to insert fee upgrade", { error: insertError.message });
            }
          }
        }
      }
    }

    if (!hasActiveSub) {
      logStep("No active subscription or upgrade");
    }

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        product_id: productId,
        price_id: priceId,
        subscription_end: subscriptionEnd,
        fee_based: hasActiveSub && !priceId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
