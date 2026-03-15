import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Play, Download, CreditCard, Check } from "lucide-react";

interface VideoPaywallProps {
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  duration: string;
  creator: string;
}

export const VideoPaywall = ({
  title,
  description,
  thumbnail,
  price,
  duration,
  creator,
}: VideoPaywallProps) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);

  const handlePurchase = () => {
    // Payment integration coming soon - do not process mock purchases
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card overflow-hidden">
        {/* Video Preview */}
        <div className="relative aspect-video">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
          
          {!isPurchased ? (
            <>
              {/* Blur overlay */}
              <div className="absolute inset-0 backdrop-blur-xl bg-background/60" />
              
              {/* Lock indicator */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center mb-6">
                  <Lock className="w-10 h-10 text-accent" />
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
                  This video is protected
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Purchase to unlock instant download access
                </p>
                <Button
                  variant="premium"
                  size="xl"
                  disabled
                  className="gap-3"
                >
                  <CreditCard className="w-5 h-5" />
                  Coming Soon
                </Button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/50 cursor-pointer hover:scale-110 transition-transform">
                <Play className="w-10 h-10 text-accent-foreground ml-1" fill="currentColor" />
              </div>
            </div>
          )}

          {/* Duration badge */}
          <div className="absolute bottom-4 right-4 px-3 py-1 rounded bg-background/80 backdrop-blur text-sm font-medium">
            {duration}
          </div>
        </div>

        {/* Video Info */}
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">
                {title}
              </h1>
              <p className="text-muted-foreground mb-4">{description}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-accent">
                      {creator.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">by {creator}</span>
                </div>
              </div>
            </div>

            {isPurchased ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Purchase Complete</span>
                </div>
                <Button variant="hero" size="lg" className="gap-2">
                  <Download className="w-5 h-5" />
                  Download Video
                </Button>
                <Button variant="heroOutline" size="lg" className="gap-2">
                  <Play className="w-5 h-5" />
                  Watch Online
                </Button>
              </div>
            ) : (
              <div className="glass-card p-6 text-center min-w-[240px]">
                <div className="text-4xl font-display font-bold gradient-text mb-2">
                  ${price.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  One-time payment
                </p>
                <Button
                  variant="premium"
                  size="lg"
                  className="w-full gap-2"
                  disabled
                >
                  <CreditCard className="w-5 h-5" />
                  Coming Soon
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Payment integration coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};