import { Header } from "@/components/landing/Header";
import { Upload, DollarSign, Download, Shield, CheckCircle, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <Gamepad2 className="w-4 h-4 text-accent" />
            <span className="text-sm text-accent font-medium">The Ultimate Save Point</span>
          </div>
          
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
            The <span className="gradient-text">Final Save</span> Before Delivery
          </h1>
          
          <p className="text-xl text-muted-foreground mb-4">
            Think of us as the last save file before your client gets the final boss — your premium video content. 
            No more "I lost the file" or "can you send it again?" disasters.
          </p>
          
          <p className="text-lg text-muted-foreground/80 italic">
            🎮 Because nobody wants to replay the entire project from the beginning, right?
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <StepCard
            step={1}
            icon={<Upload className="w-8 h-8" />}
            title="Upload Your Video"
            description="Drag and drop your finished video. Set your price and add a description. Your content is securely stored and ready for delivery."
          />
          <StepCard
            step={2}
            icon={<DollarSign className="w-8 h-8" />}
            title="Client Pays"
            description="Share the link with your client. They pay securely through Stripe. No awkward invoice chasing or payment delays."
          />
          <StepCard
            step={3}
            icon={<Download className="w-8 h-8" />}
            title="Instant Access"
            description="After payment, your client gets immediate access to download. The final save is delivered — mission complete!"
          />
        </div>

        {/* Why Final Save */}
        <div className="glass-card p-8 md:p-12 mb-16">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            Why <span className="gradient-text">Final Save</span>?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureItem
              icon={<Shield className="w-5 h-5" />}
              title="Secure Until Payment"
              description="Videos are locked behind a paywall. No payment = no download. It's that simple."
            />
            <FeatureItem
              icon={<CheckCircle className="w-5 h-5" />}
              title="No More File Sharing Headaches"
              description="Stop juggling WeTransfer links, Google Drive permissions, and expired downloads."
            />
            <FeatureItem
              icon={<DollarSign className="w-5 h-5" />}
              title="Get Paid First"
              description="Your work has value. Final Save ensures you're compensated before delivery."
            />
            <FeatureItem
              icon={<Gamepad2 className="w-5 h-5" />}
              title="The Last Save Point"
              description="Like that crucial save before the final boss — except the boss is your client's happiness. 😉"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="font-display text-2xl font-bold mb-4">Ready to make your final save?</h3>
          <p className="text-muted-foreground mb-6">Start uploading your videos and get paid for your work.</p>
          <Link to="/upload">
            <Button variant="hero" size="xl">
              <Upload className="w-5 h-5 mr-2" />
              Upload Your First Video
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

const StepCard = ({
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
  <div className="glass-card p-6 text-center relative group hover:border-accent/30 transition-all duration-300">
    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center text-sm">
      {step}
    </div>
    <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-4 mt-2 group-hover:bg-accent/20 transition-colors">
      {icon}
    </div>
    <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

const FeatureItem = ({
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
