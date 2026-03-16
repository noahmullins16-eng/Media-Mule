import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { VideoPaywall } from "@/components/video/VideoPaywall";
import { supabase } from "@/integrations/supabase/client";

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<{
    title: string;
    description: string;
    thumbnail: string;
    price: number;
    duration: string;
    creator: string;
    videoUrl: string;
    watermarksEnabled: boolean;
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
        .select("title, description, price, thumbnail_url, status, file_path")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching video:", error);
        setVideo(null);
        setLoading(false);
        return;
      }

      // Get a signed URL for preview playback
      let videoUrl = "";
      if (data.file_path) {
        const { data: signedData } = await supabase.storage
          .from("videos")
          .createSignedUrl(data.file_path, 3600);
        if (signedData?.signedUrl) {
          videoUrl = signedData.signedUrl;
        }
      }

      setVideo({
        title: data.title,
        description: data.description || "No description provided.",
        thumbnail: data.thumbnail_url || "/placeholder.svg",
        price: Number(data.price),
        duration: data.status === "published" ? "Available now" : "Processing",
        creator: "Media Mule Creator",
        videoUrl,
      });
      setLoading(false);
    };

    fetchVideo();
  }, [id]);

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
        <VideoPaywall {...video} />
      </main>
    </div>
  );
};

export default Video;
