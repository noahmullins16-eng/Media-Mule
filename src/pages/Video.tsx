import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { VideoPaywall } from "@/components/video/VideoPaywall";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

export interface BundleFile {
  id: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  sort_order: number;
  signedUrl?: string;
  storage_url?: string | null;
  preview_path?: string | null;
}

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [video, setVideo] = useState<{
    title: string;
    description: string;
    thumbnail: string;
    price: number;
    duration: string;
    creator: string;
    videoUrl: string;
    watermarksEnabled: boolean;
    userId: string;
    customWatermarkUrl: string | null;
    bundleFiles: BundleFile[];
    sold: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [useCustomWatermark, setUseCustomWatermark] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("videos")
        .select("title, description, price, thumbnail_url, status, file_path, watermarks_enabled, user_id, sold, r2_url, preview_path")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching video:", error);
        setVideo(null);
        setLoading(false);
        return;
      }

      // Check if user is owner or has purchased
      let isOwner = false;
      let hasPurchased = false;

      if (user) {
        if (user.id === data.user_id) {
          isOwner = true;
        } else {
          const { data: purchaseData } = await supabase
            .from("purchases")
            .select("id")
            .eq("video_id", id)
            .eq("buyer_user_id", user.id)
            .maybeSingle();

          if (purchaseData) {
            hasPurchased = true;
          }
        }
      }

      // Fetch bundle files
      const { data: filesData } = await supabase
        .from("video_files")
        .select("*")
        .eq("video_id", id)
        .order("sort_order", { ascending: true });

      const bundleFiles: BundleFile[] = [];
      let primaryVideoUrl = "";

      if (filesData && filesData.length > 0) {
        for (const f of filesData) {
          const shouldUsePreview = !isOwner && !hasPurchased && Boolean(f.preview_path);
          const resolvePath = shouldUsePreview ? f.preview_path : f.file_path;
          const isImageAsset = f.file_type === "image";

          let signedUrl = "";
          try {
            if (isImageAsset && resolvePath) {
              signedUrl = storage.getPublicUrl(resolvePath);
            } else if (resolvePath) {
              signedUrl = await storage.getSignedUrl(resolvePath, 3600);
            }
          } catch (err) {
            console.error("Failed to resolve URL for file:", resolvePath, err);
          }

          if (!signedUrl && f.storage_url) {
            signedUrl = f.storage_url;
          }
          const bf: BundleFile = { ...f, signedUrl };
          bundleFiles.push(bf);
          if (!primaryVideoUrl && (f.file_type === "video" || f.file_type === "audio") && signedUrl) {
            primaryVideoUrl = signedUrl;
          }
        }
      } else if (data.file_path) {
        // Fallback to legacy single file
        const ext = data.file_path.split(".").pop()?.toLowerCase() || "";
        const isAudio = ["mp3", "wav", "ogg", "aac", "m4a"].includes(ext);
        const fileType = isAudio ? "audio" : "video";
        const isImageAsset = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);

        const shouldUsePreview = !isOwner && !hasPurchased && Boolean(data.preview_path);
        const resolvePath = shouldUsePreview ? data.preview_path : data.file_path;

        let signedUrl = "";
        try {
          if (isImageAsset && resolvePath) {
            signedUrl = storage.getPublicUrl(resolvePath);
          } else if (resolvePath) {
            signedUrl = await storage.getSignedUrl(resolvePath, 3600);
          }
        } catch (err) {
          console.error("Failed to resolve URL for legacy path:", resolvePath, err);
        }

        if (!signedUrl && data.r2_url) {
          signedUrl = data.r2_url;
        }
        if (signedUrl) {
          primaryVideoUrl = signedUrl;
          bundleFiles.push({
            id: "primary",
            file_path: data.file_path,
            file_type: fileType,
            file_size: null,
            sort_order: 0,
            signedUrl: signedUrl,
            storage_url: data.r2_url,
            preview_path: data.preview_path,
          });
        }
      }

      let customWatermarkUrl: string | null = null;
      let creatorUsername = "Media Mule Creator";
      const { data: profileData } = await supabase
        .from("creator_profiles_public" as any)
        .select("custom_watermark_path, username")
        .eq("user_id", data.user_id)
        .maybeSingle() as { data: { username: string | null; custom_watermark_path: string | null } | null };

      if (profileData?.username) creatorUsername = profileData.username;
      if (profileData?.custom_watermark_path) {
        try {
          if (profileData.custom_watermark_path.startsWith("http")) {
            customWatermarkUrl = profileData.custom_watermark_path;
          } else if (profileData.custom_watermark_path.includes("watermark")) {
            customWatermarkUrl = await storage.getSignedUrl(profileData.custom_watermark_path);
          } else {
            const { data: wmUrl } = supabase.storage
              .from("watermarks")
              .getPublicUrl(profileData.custom_watermark_path);
            customWatermarkUrl = wmUrl?.publicUrl || null;
          }
        } catch (err) {
          console.error("Failed to fetch custom watermark URL:", err);
        }
      }

      setVideo({
        title: data.title,
        description: data.description || "No description provided.",
        thumbnail: data.thumbnail_url || "/placeholder.svg",
        price: Number(data.price),
        duration: data.status === "published" ? "Available now" : "Processing",
        creator: creatorUsername,
        videoUrl: primaryVideoUrl,
        watermarksEnabled: data.watermarks_enabled !== false,
        userId: data.user_id,
        customWatermarkUrl,
        bundleFiles,
        sold: (hasPurchased || data.sold) ?? false,
      });
      if (customWatermarkUrl) setUseCustomWatermark(true);
      setLoading(false);
    };

    fetchVideo();
  }, [id, user]);

  const handleToggleWatermark = async (newValue: boolean) => {
    if (!id) return;
    const { error } = await supabase
      .from("videos")
      .update({ watermarks_enabled: newValue })
      .eq("id", id);
    if (!error && video) setVideo({ ...video, watermarksEnabled: newValue });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header minimal />
        <main className="container mx-auto px-4 pt-24 pb-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Header minimal />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="mb-4 font-display text-4xl font-bold">Video Not Found</h1>
          <p className="text-muted-foreground">
            This video is unavailable or you don&apos;t have access to it.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header minimal />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <VideoPaywall
          {...video}
          videoId={id}
          isOwner={!!(user && video && user.id === video.userId)}
          useCustomWatermark={useCustomWatermark}
          onToggleCustomWatermark={setUseCustomWatermark}
          onToggleWatermark={handleToggleWatermark}
          sold={video.sold}
        />
      </main>
    </div>
  );
};

export default Video;
