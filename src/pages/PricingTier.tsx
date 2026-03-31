import { useState, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { TIER_CONFIG, type SubscriptionTier } from "@/lib/subscription-tiers";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";

const stripePromise = loadStripe(
  "pk_live_51TDlwTCrctthKOPTSxaCpNfyW3Yl9VFgB2v2NcfWCsyhfv8h2BdI7pVnUqUxMpR5eGaqxCFO8rLJq7D0T5t2pxEv00eE2OWqDT"
);


const tierDescriptions: Record<string, string> = {
  basic:
    "A streamlined platform for managing and selling digital content, featuring 100GB storage, access on 2 devices, and bulk uploads for efficiency. Customize previews with watermark controls or enable full-quality viewing. Includes built-in invoicing and low 3–4% transaction fees (excluding Stripe fees).",
  studio:
    "A powerful, all-in-one platform for managing and selling digital content, offering 1TB of storage and access across 8 devices. Enjoy unlimited bulk uploads, full-quality preview options, and fully customizable watermark previews using your own logo.\n\nRun your business seamlessly with no transaction fees (excluding Stripe fees), built-in invoicing, a dedicated revision dashboard, and the ability to accept deposit payments.",
  enterprise:
    "An enterprise-grade solution built for scale, offering advanced customization, premium support, and powerful workflow tools tailored to your business. Contact us for custom pricing and features.",
};

const VALID_TIERS = ["basic", "studio", "enterprise"];

const PricingTier = () => {
  const { tier: tierKey } = useParams<{ tier: string }>();
  const { user } = useAuth();
  const { subscribed, tier: currentTier, openPortal } = useSubscription();
  const { toast } = useToast();
  const [showCheckout, setShowCheckout] = useState(false);

  const isValidTier = tierKey && VALID_TIERS.includes(tierKey);
  const tier = isValidTier ? TIER_CONFIG[tierKey as SubscriptionTier] : null;
  const Icon = tierKey ? tierIcons[tierKey] : undefined;
  const description = tierKey ? tierDescriptions[tierKey] || "" : "";
  const isEnterprise = tierKey === "enterprise";
  const isCurrentPlan = subscribed && currentTier === tierKey;

  const fetchClientSecret = useCallback(async () => {
    if (!tier?.stripePriceId) throw new Error("No price configured");
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId: tier.stripePriceId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.clientSecret as string;
  }, [tier?.stripePriceId]);

  if (!isValidTier || !tier) {
    return <Navigate to="/pricing" replace />;
  }

  const handleGetStarted = () => {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setShowCheckout(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pricing
        </Link>

        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-8 md:p-12">
            {/* Tier header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                {tierKey === "studio" ? (
                  <img src={studioMuleIcon} alt="Studio" className="w-8 h-8 object-contain" />
                ) : tierKey === "basic" ? (
                  <img src={basicMuleIcon} alt="Basic" className="w-8 h-8 object-contain" />
                ) : tierKey === "enterprise" ? (
                  <img src={enterpriseMuleIcon} alt="Enterprise" className="w-8 h-8 object-contain" />
                ) : Icon ? (
                  <Icon className="w-7 h-7 text-accent" />
                ) : (
                  <Zap className="w-7 h-7 text-accent" />
                )}
              </div>
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-bold">
                  {tier.label}
                </h1>
                {tier.price ? (
                  <p className="text-muted-foreground text-lg">
                    <span className="text-foreground font-bold text-2xl">
                      ${tier.price.toFixed(2)}
                    </span>
                    /month
                  </p>
                ) : (
                  <p className="text-muted-foreground text-lg font-semibold">
                    Custom Pricing
                  </p>
                )}
              </div>
            </div>

            {isCurrentPlan && (
              <div className="mb-6 rounded-lg border border-accent/50 bg-accent/5 p-3 text-center text-sm font-medium text-accent">
                ✓ This is your current plan
              </div>
            )}

            {/* Description */}
            <div className="mb-8">
              {description.split("\n\n").map((paragraph, i) => (
                <p
                  key={i}
                  className="text-muted-foreground leading-relaxed mb-3 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Features */}
            <div className="border-t border-border pt-8 mb-8">
              <h2 className="font-display font-semibold text-lg mb-4">
                What's included
              </h2>
              <ul className="space-y-4">
                {tier.features.map((feature) => (
                  <li
                    key={feature.text}
                    className="flex items-start gap-3 text-sm"
                  >
                    <Check className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA / Embedded Checkout */}
            {showCheckout && tier.stripePriceId ? (
              <div className="border-t border-border pt-8">
                <h2 className="font-display font-semibold text-lg mb-4">
                  Complete your subscription
                </h2>
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{ fetchClientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : isCurrentPlan ? (
              <Button
                variant="heroOutline"
                size="xl"
                className="w-full"
                onClick={() => openPortal()}
              >
                Manage Subscription
              </Button>
            ) : isEnterprise ? (
              <a href="mailto:contact@example.com" className="block">
                <Button variant="hero" size="xl" className="w-full">
                  Contact Us
                </Button>
              </a>
            ) : (
              <Button
                variant="hero"
                size="xl"
                className="w-full"
                onClick={handleGetStarted}
              >
                Get Started with {tier.label}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PricingTier;
