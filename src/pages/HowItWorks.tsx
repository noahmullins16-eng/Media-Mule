import { Header } from "@/components/landing/Header";
import { Upload, Link2, CreditCard, Download, Lock, Zap, Shield, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Your Work. <span className="gradient-text">Your Terms.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload once. Share a link. Get paid before they download. 
            It's that simple.
          </p>
        </div>

        {/* Visual Flow */}
        <div className="relative mb-20">
          {/* Connection Line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent/30 to-transparent -translate-y-1/2 z-0" />
          
          <div className="grid md:grid-cols-4 gap-6 relative z-10">
            <FlowStep
              step={1}
              icon={<Upload className="w-6 h-6" />}
              title="Upload"
              description="Drop your finished video and set your price"
            />
            <FlowStep
              step={2}
              icon={<Link2 className="w-6 h-6" />}
              title="Share"
              description="Send the unique link to your client"
            />
            <FlowStep
              step={3}
              icon={<CreditCard className="w-6 h-6" />}
              title="Get Paid"
              description="Client pays securely via Stripe"
            />
            <FlowStep
              step={4}
              icon={<Download className="w-6 h-6" />}
              title="Deliver"
              description="Instant access to download after payment"
            />
          </div>
        </div>

        {/* What Your Client Sees */}
        <div className="mb-20">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-10">
            What Your Client Sees
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <ClientView
              icon={<Eye className="w-5 h-5" />}
              title="Before Payment"
              items={[
                "Video preview with watermark",
                "Your title & description",
                "Clear pricing",
                "Secure payment button"
              ]}
              variant="locked"
            />
            <ClientView
              icon={<Download className="w-5 h-5" />}
              title="After Payment"
              items={[
                "Full quality download",
                "No watermarks",
                "Instant access",
                "Download receipt"
              ]}
              variant="unlocked"
            />
          </div>
        </div>

        {/* Why This Works */}
        <div className="glass-card p-8 md:p-12 mb-16 max-w-4xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">
            Built for Creators
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <BenefitItem
              icon={<Lock className="w-5 h-5" />}
              title="Protected Until Paid"
              description="Your video stays locked until payment clears. No exceptions."
            />
            <BenefitItem
              icon={<Zap className="w-5 h-5" />}
              title="No More Chasing"
              description="Stop sending invoices. Payment happens before delivery."
            />
            <BenefitItem
              icon={<Shield className="w-5 h-5" />}
              title="Secure & Simple"
              description="Bank-level security. No account needed for your clients."
            />
            <BenefitItem
              icon={<Link2 className="w-5 h-5" />}
              title="One Link Does It All"
              description="Preview, pay, and download — all from a single URL."
            />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-6">Ready to get paid for your work?</p>
          <Link to="/upload">
            <Button variant="hero" size="xl">
              Upload Your First Video
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

const FlowStep = ({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center text-center">
    <div className="w-14 h-14 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center mb-4 shadow-lg">
      {icon}
    </div>
    <div className="text-xs text-muted-foreground mb-1">Step {step}</div>
    <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const ClientView = ({
  icon,
  title,
  items,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  variant: "locked" | "unlocked";
}) => (
  <div className={`glass-card p-6 ${variant === "unlocked" ? "border-accent/30" : ""}`}>
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        variant === "unlocked" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
      }`}>
        {icon}
      </div>
      <h3 className="font-display font-semibold">{title}</h3>
    </div>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={`w-1.5 h-1.5 rounded-full ${
            variant === "unlocked" ? "bg-accent" : "bg-muted-foreground/50"
          }`} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const BenefitItem = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex gap-4">
    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-display font-semibold mb-1">{title}</h4>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  </div>
);

export default HowItWorks;
