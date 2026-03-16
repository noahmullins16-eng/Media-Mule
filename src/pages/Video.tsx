import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/landing/Header";
import { VideoPaywall } from "@/components/video/VideoPaywall";
import { supabase } from "@/integrations/supabase/client";

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<{
    title: string;
    description: string;
    price: number;
    creator: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchVideo = async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("title, description, price, user_id")
        .eq("id", id)
        .eq("status", "published")
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setVideo({
          title: data.title,
          description: data.description || "",
          price: Number(data.price),
          creator: "Creator",
        });
      }
      setLoading(false);
    };

    fetchVideo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  if (notFound || !video) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="font-display text-4xl font-bold mb-4">Video Not Found</h1>
          <p className="text-muted-foreground">The video you're looking for doesn't exist.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <VideoPaywall
          title={video.title}
          description={video.description}
          thumbnail=""
          price={video.price}
          duration=""
          creator={video.creator}
        />
      </main>
    </div>
  );
};

export default Video;
