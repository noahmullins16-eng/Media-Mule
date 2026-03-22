import { useParams, Link, Navigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Rocket, ArrowLeft } from "lucide-react";
import { TIER_CONFIG, type SubscriptionTier } from "@/lib/subscription-tiers";

const tierIcons: Record<string, typeof Zap> = {
  basic: Zap,
  studio: Crown,
  enterprise: Rocket,
};

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

  if (!tierKey || !VALID_TIERS.includes(tierKey)) {
    return <Navigate to="/pricing" replace />;
  }

  const tier = TIER_CONFIG[tierKey as SubscriptionTier];
  const Icon = tierIcons[tierKey] || Zap;
  const description = tierDescriptions[tierKey] || "";
  const isEnterprise = tierKey === "enterprise";

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
                <Icon className="w-7 h-7 text-accent" />
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

            {/* CTA */}
            {isEnterprise ? (
              <a href="mailto:contact@example.com" className="block">
                <Button variant="hero" size="xl" className="w-full">
                  Contact Us
                </Button>
              </a>
            ) : (
              <Link to="/auth" className="block">
                <Button variant="hero" size="xl" className="w-full">
                  Get Started with {tier.label}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PricingTier;
