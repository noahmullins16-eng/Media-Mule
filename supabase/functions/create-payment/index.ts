import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Platform fee percentages by tier
const TIER_FEE: Record<string, number> = {
  starter: 0.04,
  basic: 0.04,
  pro: 0.02,
  studio: 0,
  enterprise: 0,
};

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
    const { videoId } = await req.json();
    if (!videoId) throw new Error("Missing videoId");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://pay-for-play-vid.lovable.app";

    // Fetch video
    const { data: video, error: videoError } = await supabaseClient
      .from("videos")
      .select("id, title, price, user_id, sold, status")
      .eq("id", videoId)
      .single();

    if (videoError || !video) throw new Error("Video not found");
    if (video.sold) throw new Error("This content has already been sold");
    if (video.status !== "published") throw new Error("This content is not available for purchase");
    if (video.price <= 0) throw new Error("Invalid price");

    // Get creator's Connect account and tier
    const { data: creatorProfile } = await supabaseClient
      .from("creator_profiles")
      .select("stripe_account_id, tier")
      .eq("user_id", video.user_id)
      .single();

    if (!creatorProfile?.stripe_account_id) {
      throw new Error("Creator has not set up payments yet");
    }

    const feeRate = TIER_FEE[creatorProfile.tier] ?? 0.04;
    const priceInCents = Math.round(video.price * 100);
    const platformFee = Math.round(priceInCents * feeRate);

    // Create a checkout session with destination charge
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: video.title,
              metadata: { video_id: video.id },
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creatorProfile.stripe_account_id,
        },
        metadata: {
          video_id: video.id,
          creator_id: video.user_id,
        },
      },
      success_url: `${origin}/video/${video.id}?payment=success`,
      cancel_url: `${origin}/video/${video.id}`,
      metadata: {
        video_id: video.id,
        creator_id: video.user_id,
      },
    });

    // Mark video as sold and track accumulated fees
    await supabaseClient
      .from("videos")
      .update({ sold: true })
      .eq("id", video.id);

    // Increment accumulated fees for fee-based upgrade tracking
    const feeAmount = platformFee / 100;
    const { data: currentProfile } = await supabaseClient
      .from("creator_profiles")
      .select("accumulated_fees")
      .eq("user_id", video.user_id)
      .single();

    const newFees = Number(currentProfile?.accumulated_fees ?? 0) + feeAmount;
    await supabaseClient
      .from("creator_profiles")
      .update({ accumulated_fees: newFees })
      .eq("user_id", video.user_id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
