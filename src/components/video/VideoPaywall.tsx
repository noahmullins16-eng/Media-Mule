import { useRef, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Pause, CreditCard, Volume2, VolumeX, ShieldCheck, Link2, ImagePlus, Video, Image, Package, Loader2 } from "lucide-react";
import { Music } from "lucide-react";
import { MovingWatermark } from "./MovingWatermark";
import { TiledWatermark, ForensicWatermark, useScreenRecordingGuard } from "./VideoProtection";
import { AudioWatermark } from "./AudioWatermark";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { BundleFile } from "@/pages/Video";

interface VideoPaywallProps {
  sold?: boolean;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  duration: string;
  creator: string;
  videoUrl?: string;
  watermarksEnabled?: boolean;
  videoId?: string;
  isOwner?: boolean;
  onToggleWatermark?: (newValue: boolean) => void;
  customWatermarkUrl?: string | null;
  useCustomWatermark?: boolean;
  onToggleCustomWatermark?: (newValue: boolean) => void;
  bundleFiles?: BundleFile[];
}

export const VideoPaywall = ({
  title,
  description,
  thumbnail,
  price,
  duration,
  creator,
  videoUrl,
  watermarksEnabled = true,
  videoId,
  isOwner = false,
  onToggleWatermark,
  customWatermarkUrl,
  useCustomWatermark = false,
  onToggleCustomWatermark,
  bundleFiles = [],
  sold = false,
}: VideoPaywallProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const activeFile = bundleFiles[activeFileIndex];
  const activeUrl = activeFile?.signedUrl || videoUrl || "";
  const activeType = activeFile?.file_type || "video";
  const isAudio = activeType === "audio";

  const mediaRef = isAudio ? audioRef : videoRef;

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
    const el = isAudio ? audioRef.current : videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const el = isAudio ? audioRef.current : videoRef.current;
    if (!el) return;
    const newMuted = !isMuted;
    el.muted = newMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      el.volume = 0;
    } else {
      el.volume = volume || 1;
    }
  };

  const handleTimeUpdate = () => {
    const el = isAudio ? audioRef.current : videoRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
  };

  const handleLoadedMetadata = () => {
    const el = isAudio ? audioRef.current : videoRef.current;
    if (!el) return;
    setVideoDuration(el.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = isAudio ? audioRef.current : videoRef.current;
    if (!el) return;
    const time = parseFloat(e.target.value);
    el.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = isAudio ? audioRef.current : videoRef.current;
    if (!el) return;
    const vol = parseFloat(e.target.value);
    el.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
    el.muted = vol === 0;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const switchFile = (index: number) => {
    const el = isAudio ? audioRef.current : videoRef.current;
    if (el) {
      el.pause();
      setIsPlaying(false);
    }
    setActiveFileIndex(index);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card overflow-hidden">
        {/* Main Player / Preview */}
        <div
          className="relative aspect-video bg-black overflow-hidden select-none"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
          {activeUrl && isAudio ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted/60 to-background">
              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                src={activeUrl}
                muted={isMuted}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                preload="metadata"
              />

              {/* Audio watermark */}
              {watermarksEnabled && <AudioWatermark isPlaying={isPlaying} intervalSeconds={15} />}

              {/* Visual representation */}
              <div className="flex flex-col items-center gap-4">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isPlaying ? "bg-accent/20 animate-pulse" : "bg-accent/10"}`}>
                  <Music className="w-12 h-12 text-accent" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">{title}</p>
                {watermarksEnabled && (
                  <div className="flex items-center gap-1.5 text-xs text-accent/70">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Audio Watermark Active
                  </div>
                )}
              </div>

              {/* Play overlay */}
              {!isPlaying && (
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={togglePlay}
                  style={{ zIndex: 26 }}
                >
                  <button className="w-20 h-20 rounded-full bg-accent/90 flex items-center justify-center shadow-lg shadow-accent/50 hover:scale-110 transition-transform">
                    <Play className="w-10 h-10 text-accent-foreground ml-1" fill="currentColor" />
                  </button>
                </div>
              )}

              {/* Controls bar */}
              <div
                className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-1.5"
                style={{ zIndex: 27 }}
              >
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 appearance-none bg-white/20 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  style={{
                    background: videoDuration
                      ? `linear-gradient(to right, hsl(var(--accent)) ${(currentTime / videoDuration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / videoDuration) * 100}%)`
                      : undefined,
                  }}
                />
                <div className="flex items-center gap-2">
                  <button onClick={togglePlay} className="text-white hover:text-accent transition-colors">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
                  </button>
                  <span className="text-xs text-white/70 font-mono min-w-[70px]">
                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button onClick={toggleMute} className="text-white hover:text-accent transition-colors">
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 appearance-none bg-white/20 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
                      }}
                    />
                    <ShieldCheck className="w-3.5 h-3.5 text-accent/70 ml-2" />
                    <span className="text-xs text-white/70 font-medium">DRM</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeUrl && activeType === "video" ? (
            <>
              <video
                ref={videoRef}
                src={activeUrl}
                className="w-full h-full object-contain"
                muted={isMuted}
                playsInline
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onContextMenu={(e) => e.preventDefault()}
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture
                style={{ pointerEvents: "none" }}
              />

              {watermarksEnabled && (
                <>
                  <TiledWatermark customImageUrl={useCustomWatermark ? customWatermarkUrl : null} />
                  <MovingWatermark customImageUrl={useCustomWatermark ? customWatermarkUrl : null} />
                  <ForensicWatermark sessionId={sessionId} />
                </>
              )}

              <div
                className="absolute top-0 left-0 right-0"
                style={{ zIndex: 25, bottom: "52px" }}
                onClick={togglePlay}
                onContextMenu={(e) => e.preventDefault()}
              />

              {!isPlaying && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/30"
                  style={{ zIndex: 26, pointerEvents: "none" }}
                >
                  <button
                    onClick={togglePlay}
                    style={{ pointerEvents: "auto" }}
                    className="w-20 h-20 rounded-full bg-accent/90 flex items-center justify-center shadow-lg shadow-accent/50 hover:scale-110 transition-transform"
                  >
                    <Play className="w-10 h-10 text-accent-foreground ml-1" fill="currentColor" />
                  </button>
                </div>
              )}

              {/* Controls bar - always visible */}
              <div
                className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-1.5"
                style={{ zIndex: 27 }}
              >
                {/* Timeline scrubber */}
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 appearance-none bg-white/20 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  style={{
                    background: videoDuration
                      ? `linear-gradient(to right, hsl(var(--accent)) ${(currentTime / videoDuration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / videoDuration) * 100}%)`
                      : undefined,
                  }}
                />
                {/* Controls row */}
                <div className="flex items-center gap-2">
                  <button onClick={togglePlay} className="text-white hover:text-accent transition-colors">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
                  </button>
                  <span className="text-xs text-white/70 font-mono min-w-[70px]">
                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button onClick={toggleMute} className="text-white hover:text-accent transition-colors">
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 appearance-none bg-white/20 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
                      }}
                    />
                    <ShieldCheck className="w-3.5 h-3.5 text-accent/70 ml-2" />
                    <span className="text-xs text-white/70 font-medium">DRM</span>
                  </div>
                </div>
              </div>
            </>
          ) : activeUrl && activeType === "image" ? (
            <div className="relative w-full h-full">
              <img
                src={activeUrl}
                alt={title}
                className="w-full h-full object-contain"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
              {watermarksEnabled && (
                <>
                  <TiledWatermark customImageUrl={useCustomWatermark ? customWatermarkUrl : null} />
                  <MovingWatermark customImageUrl={useCustomWatermark ? customWatermarkUrl : null} />
                </>
              )}
            </div>
          ) : (
            <>
              <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 backdrop-blur-xl bg-background/60 flex items-center justify-center">
                <p className="text-muted-foreground">Preview unavailable</p>
              </div>
            </>
          )}
        </div>

        {/* Bundle file thumbnails */}
        {bundleFiles.length > 1 && (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">
                Bundle · {bundleFiles.length} files
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {bundleFiles.map((bf, index) => (
                <button
                  key={bf.id}
                  onClick={() => switchFile(index)}
                  className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                    index === activeFileIndex
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  {bf.file_type === "image" && bf.signedUrl ? (
                    <img src={bf.signedUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-accent/10 flex items-center justify-center">
                      {bf.file_type === "video" ? (
                        <Video className="w-5 h-5 text-accent" />
                      ) : (
                        <Image className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

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
                {bundleFiles.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {bundleFiles.filter(f => f.file_type === "video").length} videos · {bundleFiles.filter(f => f.file_type === "image").length} images
                  </span>
                )}
              </div>

              {isOwner && (
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Watermarks</span>
                    <Switch
                      checked={watermarksEnabled}
                      onCheckedChange={(checked) => {
                        onToggleWatermark?.(checked);
                        toast.success(checked ? "Watermarks enabled" : "Watermarks disabled");
                      }}
                      className="scale-90"
                    />
                  </div>
                  {customWatermarkUrl ? (
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm cursor-pointer">
                      <Checkbox
                        checked={useCustomWatermark}
                        onCheckedChange={(checked) => {
                          onToggleCustomWatermark?.(!!checked);
                          toast.success(checked ? "Custom watermark enabled" : "Using default watermark");
                        }}
                        className="scale-90"
                      />
                      <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Custom Watermark</span>
                    </label>
                  ) : (
                    <a href="/my-media" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm hover:bg-muted/80 transition-colors">
                      <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Upload Custom Watermark</span>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const url = `https://mediamuleco.com/video/${videoId}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Purchase link copied!");
                    }}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Copy Link
                  </Button>
                </div>
              )}

              {!isOwner && (
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Content Protected
                </div>
              )}
            </div>

            <div className="glass-card p-6 text-center min-w-[240px]">
              {price > 0 ? (
                <>
                  <div className="text-4xl font-display font-bold gradient-text mb-2">
                    ${price.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {bundleFiles.length > 1 ? `${bundleFiles.length} files · One-time payment` : "One-time payment"}
                  </p>
                  {sold ? (
                    <>
                      <Button variant="premium" size="lg" className="w-full gap-2" disabled>
                        <ShieldCheck className="w-5 h-5" />
                        Sold
                      </Button>
                      <p className="text-xs text-muted-foreground mt-3">
                        This content has been purchased
                      </p>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="premium"
                        size="lg"
                        className="w-full gap-2"
                        disabled={purchasing || isOwner}
                        onClick={async () => {
                          if (!videoId) return;
                          setPurchasing(true);
                          try {
                            const { data, error } = await supabase.functions.invoke("create-payment", {
                              body: { videoId },
                            });
                            if (error) throw error;
                            if (data?.error) throw new Error(data.error);
                            if (data?.url) {
                              window.location.href = data.url;
                            }
                          } catch (err: any) {
                            toast.error(err.message || "Failed to start purchase");
                          }
                          setPurchasing(false);
                        }}
                      >
                        {purchasing ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <CreditCard className="w-5 h-5" />
                        )}
                        {isOwner ? "Your Content" : purchasing ? "Processing..." : "Purchase Now"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-3">
                        Secure payment via Stripe
                      </p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="text-2xl font-display font-bold text-muted-foreground mb-2">
                    Storage Only
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This content is not for sale
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
