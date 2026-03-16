import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload, Video, Trash2, ExternalLink, Link2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  file_path: string;
  file_size: number | null;
  status: string;
  created_at: string;
  watermarks_enabled: boolean;
}

const MyVideos = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchVideos();
    }
  }, [user]);

  const fetchVideos = async () => {
    setLoadingVideos(true);
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching videos:", error);
      toast.error("Failed to load videos");
    } else {
      setVideos(data || []);
    }
    setLoadingVideos(false);
  };

  const handleDelete = async (video: VideoItem) => {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from("videos")
      .remove([video.file_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
    }

    // Delete record from database
    const { error: dbError } = await supabase
      .from("videos")
      .delete()
      .eq("id", video.id);

    if (dbError) {
      toast.error("Failed to delete video");
    } else {
      toast.success("Video deleted");
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
    }
  };

  const handleCopyLink = (videoId: string) => {
    const url = `${window.location.origin}/video/${videoId}`;
    navigator.clipboard.writeText(url);
    toast.success("Purchase link copied to clipboard!");
  };

  const handleToggleWatermark = async (video: VideoItem) => {
    const newValue = !video.watermarks_enabled;
    const { error } = await supabase
      .from("videos")
      .update({ watermarks_enabled: newValue } as any)
      .eq("id", video.id);

    if (error) {
      toast.error("Failed to update watermark setting");
    } else {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id ? { ...v, watermarks_enabled: newValue } : v
        )
      );
      toast.success(newValue ? "Watermarks enabled" : "Watermarks disabled");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">My Videos</h1>
          <Link to="/upload">
            <Button variant="hero">
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </Link>
        </div>

        {loadingVideos ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Video className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No videos yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Upload your first video to start selling. Your uploaded videos will appear here.
            </p>
            <Link to="/upload">
              <Button variant="hero">
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Video
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Video className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{video.title}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                    <span>${Number(video.price).toFixed(2)}</span>
                    {video.file_size && (
                      <span>{(video.file_size / (1024 * 1024)).toFixed(1)} MB</span>
                    )}
                    <span className="capitalize">{video.status}</span>
                    <span>{new Date(video.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/video/${video.id}`)}
                    title="View"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(video)}
                    className="text-destructive hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyVideos;
