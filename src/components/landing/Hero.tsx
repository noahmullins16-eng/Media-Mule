import { Button } from "@/components/ui/button";
import { Upload, Play, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 hero-glow opacity-50" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-secondary/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      
      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8 animate-fade-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-sm text-accent font-medium">Monetize Your Content</span>
          </div>

          {/* Main heading */}
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Upload Videos.
            <br />
            <span className="gradient-text">Get Paid.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Share your premium video content and let your audience download it after payment. Simple, secure, and seamless.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/upload">
              <Button variant="hero" size="xl" className="gap-3">
                <Upload className="w-5 h-5" />
                Upload Your Video
              </Button>
            </Link>
            <Link to="/my-videos">
              <Button variant="heroOutline" size="xl" className="gap-3">
                <Play className="w-5 h-5" />
                My Videos
              </Button>
            </Link>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <FeatureCard
              icon={<Upload className="w-6 h-6" />}
              title="Upload Easily"
              description="Drag and drop your video files. We handle the rest."
            />
            <FeatureCard
              icon={<DollarSign className="w-6 h-6" />}
              title="Set Your Price"
              description="Choose how much your content is worth."
            />
            <FeatureCard
              icon={<Play className="w-6 h-6" />}
              title="Secure Downloads"
              description="Buyers get instant access after payment."
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string 
}) => (
  <div className="glass-card p-6 text-left group hover:border-accent/30 transition-all duration-300">
    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:bg-accent/20 transition-colors">
      {icon}
    </div>
    <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);