import { useState } from "react";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Building2, Rocket, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const tiers = [
  {
    name: "Starter Creator",
    price: 9,
    icon: Zap,
    description: "Perfect for getting started with media distribution",
    features: [
      "1 TB cloud storage",
      "100 GB maximum file size",
      "Unlimited downloads for buyers",
      "Ad-free download pages",
      "Instant media previews",
      "Password protected links",
      "Expiring download links",
      "Basic download analytics",
    ],
    popular: false,
  },
  {
    name: "Creator Pro",
    price: 19,
    icon: Crown,
    description: "For creators ready to scale their distribution",
    features: [
      "5 TB cloud storage",
      "250 GB maximum file size",
      "Advanced analytics dashboard",
      "Custom branded download pages",
      "Download tracking & link analytics",
      "Priority transfer speeds",
      "Watermarked file downloads",
      "Basic anti-piracy protection",
    ],
    popular: true,
  },
  {
    name: "Studio Plan",
    price: 49,
    icon: Building2,
    description: "Built for teams and professional studios",
    features: [
      "20 TB cloud storage",
      "1 TB maximum file size",
      "Global CDN acceleration",
      "Team collaboration accounts",
      "Folder sharing for large projects",
      "Video streaming previews",
      "Version history for files",
      "Bulk media distribution tools",
    ],
    popular: false,
  },
  {
    name: "Enterprise Mule",
    price: 149,
    icon: Rocket,
    description: "Maximum power for media businesses",
    features: [
      "100 TB cloud storage",
      "5 TB maximum file size",
      "Dedicated CDN acceleration",
      "Unlimited team members",
      "White-label download portals",
      "Advanced analytics dashboards",
      "API access for automation",
      "Enterprise security controls",
    ],
    popular: false,
  },
];

const addOns = [
  {
    name: "Bandwidth Boost",
    price: 10,
    period: "/mo",
    description: "Faster global download speeds in $10/month increments",
  },
  {
    name: "Secure Delivery Pack",
    price: 7,
    period: "/mo",
    description: "Expiring links, self-destruct downloads, and IP restrictions",
  },
  {
    name: "Creator Storefront",
    price: 12,
    period: "/mo",
    description: "Digital product sales pages and integrated checkout",
  },
];

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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {tiers.map((tier) => {
            const displayPrice = annual ? Math.round(tier.price * 0.8) : tier.price;
            const Icon = tier.icon;
            return (
              <div
                key={tier.name}
                className={`glass-card p-6 flex flex-col relative ${
                  tier.popular ? "border-accent/50 ring-1 ring-accent/20" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-display font-bold text-lg">{tier.name}</h3>
                </div>

                <p className="text-sm text-muted-foreground mb-5">{tier.description}</p>

                <div className="mb-6">
                  <span className="font-display text-4xl font-bold">${displayPrice}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/auth">
                  <Button
                    variant={tier.popular ? "hero" : "heroOutline"}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Add-Ons */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Optional Add-Ons</h2>
            <p className="text-muted-foreground">Enhance any plan with powerful extras</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {addOns.map((addon) => (
              <div key={addon.name} className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4 text-accent" />
                  <h4 className="font-display font-semibold">{addon.name}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{addon.description}</p>
                <span className="font-display font-bold text-lg">
                  ${addon.price}<span className="text-sm text-muted-foreground font-normal">{addon.period}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
