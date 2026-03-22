import { useState } from "react";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { TIER_CONFIG, ACTIVE_TIERS } from "@/lib/subscription-tiers";

const tierIcons = {
  basic: Zap,
  studio: Crown,
  enterprise: Rocket,
} as Record<string, typeof Zap>;

const Pricing = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Simple Pricing for <span className="gradient-text">Creators</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Creators pay for hosting & distribution. Buyers download freely — no subscription required.
          </p>
          <p className="text-sm text-muted-foreground">
            No deceptive ads. No buyer friction. Just clean, professional media delivery.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${annual ? "bg-accent" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-transform ${annual ? "translate-x-7" : "translate-x-0.5"}`} />
            </button>
            <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual <span className="text-accent text-xs font-semibold">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          {ACTIVE_TIERS.map((tierKey) => {
            const tier = TIER_CONFIG[tierKey];
            const Icon = tierIcons[tierKey] || Zap;
            const isPopular = tierKey === "studio";
            const isEnterprise = tierKey === "enterprise";
            const displayPrice = tier.price
              ? annual
                ? (tier.price * 0.8).toFixed(2)
                : tier.price.toFixed(2)
              : null;

            return (
              <div
                key={tierKey}
                className={`glass-card p-6 flex flex-col relative ${
                  isPopular ? "border-accent/50 ring-1 ring-accent/20" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-display font-bold text-lg">{tier.label}</h3>
                </div>

                <p className="text-sm text-muted-foreground mb-5">{tier.description}</p>

                <div className="mb-6">
                  {displayPrice ? (
                    <>
                      <span className="font-display text-4xl font-bold">${displayPrice}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </>
                  ) : (
                    <span className="font-display text-2xl font-bold">Custom Pricing</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>

                {isEnterprise ? (
                  <a href="mailto:contact@example.com">
                    <Button variant="heroOutline" className="w-full">
                      Contact Us
                    </Button>
                  </a>
                ) : (
                  <Link to="/auth">
                    <Button
                      variant={isPopular ? "hero" : "heroOutline"}
                      className="w-full"
                    >
                      Get Started
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Pricing;
