import { useRef, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, CreditCard, Volume2, VolumeX, ShieldCheck } from "lucide-react";
import { MovingWatermark } from "./MovingWatermark";
import { TiledWatermark, ForensicWatermark, useScreenRecordingGuard } from "./VideoProtection";
import { toast } from "sonner";

interface VideoPaywallProps {
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  duration: string;
  creator: string;
  videoUrl?: string;
  watermarksEnabled?: boolean;
}

export const VideoPaywall = ({
  title,
  description,
  thumbnail,
  price,
  duration,
  creator,
  videoUrl,
}: VideoPaywallProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Generate a unique session fingerprint for forensic watermarking
  const sessionId = useMemo(
    () => `MM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
    []
  );

  const handleRecordingDetected = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    toast.error("Screen recording detected. Video has been paused.", {
      icon: <ShieldCheck className="w-4 h-4" />,
    });
  }, []);

  useScreenRecordingGuard(videoRef, isPlaying, handleRecordingDetected);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card overflow-hidden">
        {/* Video Player / Preview */}
        <div
          className="relative aspect-video bg-black overflow-hidden select-none"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
          {videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                muted={isMuted}
                playsInline
                onEnded={() => setIsPlaying(false)}
                onContextMenu={(e) => e.preventDefault()}
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture
                style={{ pointerEvents: "none" }}
              />

              {/* Protection layers */}
              <TiledWatermark />
              <MovingWatermark />
              <ForensicWatermark sessionId={sessionId} />

              {/* Transparent click-capture layer prevents direct video interaction */}
              <div
                className="absolute inset-0"
                style={{ zIndex: 25 }}
                onClick={togglePlay}
                onContextMenu={(e) => e.preventDefault()}
              />

              {/* Play / Pause overlay */}
              {!isPlaying && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/30"
                  style={{ zIndex: 26 }}
                >
                  <button
                    onClick={togglePlay}
                    className="w-20 h-20 rounded-full bg-accent/90 flex items-center justify-center shadow-lg shadow-accent/50 hover:scale-110 transition-transform"
                  >
                    <Play className="w-10 h-10 text-accent-foreground ml-1" fill="currentColor" />
                  </button>
                </div>
              )}

              {/* Controls bar */}
              {isPlaying && (
                <div
                  className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-2"
                  style={{ zIndex: 27 }}
                >
                  <button onClick={togglePlay} className="text-white hover:text-accent transition-colors">
                    <Pause className="w-5 h-5" />
                  </button>
                  <button onClick={toggleMute} className="text-white hover:text-accent transition-colors">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent/70" />
                    <span className="text-xs text-white/70 font-medium">DRM PROTECTED</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 backdrop-blur-xl bg-background/60 flex items-center justify-center">
                <p className="text-muted-foreground">Video preview unavailable</p>
              </div>
            </>
          )}
        </div>

        {/* Video Info */}
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold mb-3">{title}</h1>
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
                <span className="text-xs text-muted-foreground">{duration}</span>
              </div>

              {/* Protection badge */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Content Protected
              </div>
            </div>

            <div className="glass-card p-6 text-center min-w-[240px]">
              <div className="text-4xl font-display font-bold gradient-text mb-2">
                ${price.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mb-4">One-time payment</p>
              <Button variant="premium" size="lg" className="w-full gap-2" disabled>
                <CreditCard className="w-5 h-5" />
                Coming Soon
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Payment integration coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
