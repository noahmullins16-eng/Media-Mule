import { Button } from "@/components/ui/button";
import { Upload, Play, DollarSign, Shield, Zap, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoFull from "@/assets/logo-full.png";
import { motion } from "framer-motion";

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Floating background effects with parallax */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1 }}
          style={{ y: 0 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] hero-glow"
        />
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          whileInView={{ y: [0, -30, 0] }}
          viewport={{ once: false }}
          style={{ y: 0 }}
          className="absolute top-[20%] left-[10%] w-72 h-72 bg-accent/8 rounded-full blur-3xl animate-pulse-glow"
        />
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.2 }}
          whileInView={{ y: [0, 40, 0] }}
          viewport={{ once: false }}
          className="absolute top-[40%] right-[5%] w-96 h-96 bg-accent-secondary/6 rounded-full blur-3xl animate-pulse-glow" 
          style={{ animationDelay: "1.5s" }}
        />
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.6, delay: 0.4 }}
          whileInView={{ y: [0, -20, 0], x: [0, 20, 0] }}
          viewport={{ once: false }}
          className="absolute bottom-[10%] left-[30%] w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse-glow" 
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* Nav bar */}
      <header className="relative z-50 w-full">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Media Mule Co." className="w-10 h-10 object-contain" />
              <span className="font-display text-xl font-bold tracking-tight">Media Mule Co.</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              {user && (
                <>
                  <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
                  <Link to="/my-videos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">My Media</Link>
                </>
              )}
            </nav>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="hidden sm:inline text-sm text-muted-foreground">{user.email}</span>
                  <Button variant="ghost" size="sm" onClick={() => signOut()}>Sign Out</Button>
                </>
              ) : (
                <>
                  <Link to="/auth"><Button variant="ghost" size="sm">Sign In</Button></Link>
                  <Link to="/auth"><Button variant="hero" size="sm">Get Started</Button></Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex items-center justify-center min-h-[85vh] pt-8">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span className="text-sm text-accent font-medium">The Creator's Distribution Platform</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display text-5xl sm:text-6xl md:text-8xl font-bold leading-[0.95] mb-6"
            >
              Your Content.
              <br />
              <span className="gradient-text">Your Revenue.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
            >
              Upload premium video content, set your price, and let your audience pay to download — all in one seamless platform built for creators.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
            >
              <Link to={user ? "/upload" : "/auth"}>
                <Button variant="hero" size="xl" className="gap-3 min-w-[220px]">
                  <Upload className="w-5 h-5" />
                  Start Uploading
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button variant="heroOutline" size="xl" className="gap-3 min-w-[220px]">
                  <Play className="w-5 h-5" />
                  See How It Works
                </Button>
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-8 md:gap-16 mb-20"
            >
              <StatItem value="Simple" label="Upload & Sell" />
              <div className="w-px h-8 bg-border hidden md:block" />
              <StatItem value="Secure" label="Payment Processing" />
              <div className="w-px h-8 bg-border hidden md:block" />
              <StatItem value="Instant" label="Digital Delivery" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="relative z-10 pb-32">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="grid md:grid-cols-3 gap-6"
            >
              <FeatureCard
                icon={<Upload className="w-6 h-6" />}
                title="Drag & Drop Upload"
                description="Upload videos up to your tier limit. We optimize and host everything for you."
              />
              <FeatureCard
                icon={<DollarSign className="w-6 h-6" />}
                title="Set Your Price"
                description="Full control over your pricing. Charge what your content is worth."
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="Secure Downloads"
                description="Paywalled content with instant delivery after verified payment."
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid md:grid-cols-3 gap-6 mt-6"
            >
              <FeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="Lightning Fast"
                description="Optimized CDN delivery so your buyers get instant access."
              />
              <FeatureCard
                icon={<TrendingUp className="w-6 h-6" />}
                title="Creator Dashboard"
                description="Track views, sales, and revenue all from one clean dashboard."
              />
              <FeatureCard
                icon={<Play className="w-6 h-6" />}
                title="Preview Support"
                description="Show buyers a preview before they purchase your content."
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative z-10 pb-20">
        <div className="container px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto glass-card p-12 md:p-16 text-center glow-effect"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to monetize your content?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join Media Mule Co. and start earning from your videos today. No complicated setup — just upload, price, and share.
            </p>
            <Link to={user ? "/upload" : "/auth"}>
              <Button variant="premium" size="xl" className="gap-3">
                <Upload className="w-5 h-5" />
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Media Mule Co." className="w-6 h-6 object-contain" />
              <span className="text-sm text-muted-foreground">© 2026 Media Mule Co. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <div className="font-display text-2xl font-bold gradient-text">{value}</div>
    <div className="text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="glass-card p-6 group hover:border-accent/30 transition-all duration-300">
    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:bg-accent/20 transition-colors">
      {icon}
    </div>
    <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

export default Index;
