import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload, DollarSign, Link2, Shield, Play, Lock,
  CreditCard, Download, CheckCircle, Eye, FileVideo
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0, 0, 0.2, 1] as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: 0.3 + i * 0.2, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Title */}
        <motion.div
          className="text-center mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            Two Sides. <span className="gradient-text">One Link.</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            See how creators deliver and buyers receive — seamlessly.
          </p>
        </motion.div>

        {/* Two-sided split */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-3 max-w-6xl mx-auto mb-20">
          {/* CREATOR SIDE */}
          <motion.div
            className="relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <div className="glass-card p-6 md:p-8 h-full border-accent/20">
              {/* Side label */}
              <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Creator</h2>
                  <p className="text-xs text-muted-foreground">Your workflow</p>
                </div>
              </motion.div>

              {/* Step 1: Upload */}
              <motion.div variants={scaleIn} custom={0} className="mb-6">
                <StepCard
                  step={1}
                  icon={<FileVideo className="w-5 h-5" />}
                  title="Upload your video"
                  accent
                >
                  <div className="rounded-xl bg-muted/60 border border-border/50 p-4 mt-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                        <Play className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2.5 w-32 rounded-full bg-accent/30" />
                        <div className="h-2 w-20 rounded-full bg-muted-foreground/20 mt-1.5" />
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-accent/20 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        initial={{ width: "0%" }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8, duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">final_edit_v3.mp4</p>
                  </div>
                </StepCard>
              </motion.div>

              {/* Step 2: Set price */}
              <motion.div variants={scaleIn} custom={1} className="mb-6">
                <StepCard
                  step={2}
                  icon={<DollarSign className="w-5 h-5" />}
                  title="Set your price"
                  accent
                >
                  <div className="rounded-xl bg-muted/60 border border-border/50 p-4 mt-3 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <div className="flex items-center gap-1 text-2xl font-display font-bold">
                        <span className="text-muted-foreground">$</span>
                        <motion.span
                          className="gradient-text"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 1.2, duration: 0.4 }}
                        >
                          250
                        </motion.span>
                        <span className="text-xs font-normal text-muted-foreground ml-1">.00</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                      <Shield className="w-3 h-3" />
                      DRM On
                    </div>
                  </div>
                </StepCard>
              </motion.div>

              {/* Step 3: Share link */}
              <motion.div variants={scaleIn} custom={2}>
                <StepCard
                  step={3}
                  icon={<Link2 className="w-5 h-5" />}
                  title="Send the link"
                  accent
                >
                  <div className="rounded-xl bg-muted/60 border border-border/50 p-3 mt-3 flex items-center gap-2">
                    <div className="flex-1 truncate text-xs text-muted-foreground font-mono">
                      mediamule.com/video/aX9k2m
                    </div>
                    <motion.div
                      className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium cursor-default"
                      whileHover={{ scale: 1.05 }}
                    >
                      Copied ✓
                    </motion.div>
                  </div>
                </StepCard>
              </motion.div>
            </div>
          </motion.div>

          {/* BUYER SIDE */}
          <motion.div
            className="relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <div className="glass-card p-6 md:p-8 h-full">
              {/* Side label */}
              <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Buyer</h2>
                  <p className="text-xs text-muted-foreground">Their experience</p>
                </div>
              </motion.div>

              {/* Step 1: Preview */}
              <motion.div variants={scaleIn} custom={0} className="mb-6">
                <StepCard
                  step={1}
                  icon={<Lock className="w-5 h-5" />}
                  title="Preview protected video"
                >
                  <div className="rounded-xl bg-muted/60 border border-border/50 overflow-hidden mt-3">
                    <div className="aspect-[16/8] bg-foreground/5 relative flex items-center justify-center">
                      <Play className="w-8 h-8 text-muted-foreground/40" />
                      {/* Watermark overlay */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 opacity-[0.08] pointer-events-none">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-center text-foreground text-[10px] font-bold -rotate-12">
                            MEDIA MULE
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-1.5 right-2 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                        <Shield className="w-2.5 h-2.5" />
                        Protected
                      </div>
                    </div>
                  </div>
                </StepCard>
              </motion.div>

              {/* Step 2: Pay */}
              <motion.div variants={scaleIn} custom={1} className="mb-6">
                <StepCard
                  step={2}
                  icon={<CreditCard className="w-5 h-5" />}
                  title="Pay securely"
                >
                  <div className="rounded-xl bg-muted/60 border border-border/50 p-4 mt-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-display font-bold text-lg">$250.00</span>
                    </div>
                    <motion.div
                      className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold text-center cursor-default"
                      initial={{ opacity: 0.6 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.4, duration: 0.3 }}
                    >
                      Pay Now
                    </motion.div>
                  </div>
                </StepCard>
              </motion.div>

              {/* Step 3: Download */}
              <motion.div variants={scaleIn} custom={2}>
                <StepCard
                  step={3}
                  icon={<Download className="w-5 h-5" />}
                  title="Download full quality"
                >
                  <div className="rounded-xl bg-muted/60 border border-border/50 p-4 mt-3 flex items-center gap-3">
                    <motion.div
                      className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.6, duration: 0.4, type: "spring" }}
                    >
                      <CheckCircle className="w-5 h-5 text-accent" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-medium">Ready to download</p>
                      <p className="text-xs text-muted-foreground">No watermarks · Full resolution</p>
                    </div>
                  </div>
                </StepCard>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Connecting line between sides (desktop) */}
        <motion.div
          className="hidden lg:flex justify-center -mt-[calc(50%+2.5rem)] mb-[calc(50%-2.5rem)] relative z-20 pointer-events-none"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1, duration: 0.6 }}
        >
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <p className="text-muted-foreground mb-6">Ready to get paid for your work?</p>
          <Link to="/upload">
            <Button variant="hero" size="xl">
              Upload Your First Video
            </Button>
          </Link>
        </motion.div>
      </main>
    </div>
  );
};

const StepCard = ({
  step,
  icon,
  title,
  accent,
  children,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  accent?: boolean;
  children?: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
        accent ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
      }`}>
        {step}
      </div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        accent ? "text-accent" : "text-muted-foreground"
      }`}>
        {icon}
      </div>
      <h3 className="font-display font-semibold text-sm">{title}</h3>
    </div>
    {children}
  </div>
);

export default HowItWorks;
