import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { VideoPaywall } from "@/components/video/VideoPaywall";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("videos")
        .select("title, description, price, thumbnail_url, status, file_path, watermarks_enabled, user_id")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching video:", error);
        setVideo(null);
        setLoading(false);
        return;
      }

      let videoUrl = "";
      if (data.file_path) {
        const { data: signedData } = await supabase.storage
          .from("videos")
          .createSignedUrl(data.file_path, 3600);
        if (signedData?.signedUrl) {
          videoUrl = signedData.signedUrl;
        }
      }

      // Fetch creator's custom watermark
      let customWatermarkUrl: string | null = null;
      const { data: profileData } = await supabase
        .from("creator_profiles")
        .select("custom_watermark_path")
        .eq("user_id", data.user_id)
        .single();

      if (profileData?.custom_watermark_path) {
        const { data: wmUrl } = supabase.storage
          .from("watermarks")
          .getPublicUrl(profileData.custom_watermark_path);
        customWatermarkUrl = wmUrl?.publicUrl || null;
      }

      setVideo({
        title: data.title,
        description: data.description || "No description provided.",
        thumbnail: data.thumbnail_url || "/placeholder.svg",
        price: Number(data.price),
        duration: data.status === "published" ? "Available now" : "Processing",
        creator: "Media Mule Creator",
        videoUrl,
        watermarksEnabled: data.watermarks_enabled !== false,
        userId: data.user_id,
        customWatermarkUrl,
      });
      setLoading(false);
    };

    fetchVideo();
  }, [id]);

  const handleToggleWatermark = async (newValue: boolean) => {
    if (!id) return;
    const { error } = await supabase
      .from("videos")
      .update({ watermarks_enabled: newValue })
      .eq("id", id);
    if (!error && video) {
      setVideo({ ...video, watermarksEnabled: newValue });
    }
  };

  const isOwner = !!(user && video && user.id === video.userId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <VideoPaywall
          {...video}
          videoId={id}
          isOwner={isOwner}
          onToggleWatermark={handleToggleWatermark}
        />
      </main>
    </div>
  );
};

export default Video;
