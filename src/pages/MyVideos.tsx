import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Trash2, ExternalLink, Link2, ShieldCheck, FolderInput, Download } from "lucide-react";
import { downloadMedia } from "@/lib/download-media";
import { toast } from "sonner";
import { WatermarkUploader } from "@/components/upload/WatermarkUploader";
import { FolderSidebar, type MediaFolder } from "@/components/folders/FolderSidebar";

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
  folder_id: string | null;
}

const MyVideos = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchVideos();
      fetchFolders();
    }
  }, [user]);

  const fetchFolders = async () => {
    const { data } = await supabase
      .from("media_folders")
      .select("*")
      .eq("user_id", user!.id)
      .order("sort_order", { ascending: true });
    setFolders((data as MediaFolder[]) || []);
  };

  const fetchVideos = async () => {
    setLoadingVideos(true);
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load videos");
    } else {
      setVideos(data || []);
      (data || []).forEach(async (v: any) => {
        const { data: signedData } = await supabase.storage
          .from("videos")
          .createSignedUrl(v.file_path, 3600);
        if (signedData?.signedUrl) generateThumbnail(v.id, signedData.signedUrl);
      });
    }
    setLoadingVideos(false);
  };

  const generateThumbnail = useCallback((videoId: string, url: string) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    video.src = url;
    video.addEventListener("loadeddata", () => { video.currentTime = 1; });
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnails((prev) => ({ ...prev, [videoId]: canvas.toDataURL("image/jpeg", 0.7) }));
      }
    });
  }, []);

  const handleDelete = async (video: VideoItem) => {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    await supabase.storage.from("videos").remove([video.file_path]);
    const { error } = await supabase.from("videos").delete().eq("id", video.id);
    if (error) {
      toast.error("Failed to delete video");
    } else {
      toast.success("Video deleted");
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
    }
  };

  const handleCopyLink = (videoId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/video/${videoId}`);
    toast.success("Purchase link copied!");
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
      setVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, watermarks_enabled: newValue } : v));
      toast.success(newValue ? "Watermarks enabled" : "Watermarks disabled");
    }
  };

  const handleMoveToFolder = async (videoId: string, folderId: string | null) => {
    const { error } = await supabase
      .from("videos")
      .update({ folder_id: folderId } as any)
      .eq("id", videoId);
    if (error) {
      toast.error("Failed to move video");
    } else {
      setVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, folder_id: folderId } : v));
      toast.success("Video moved");
    }
  };

  const filteredVideos = activeFolderId === null
    ? videos
    : videos.filter((v) => v.folder_id === activeFolderId);

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
          <h1 className="text-3xl font-display font-bold">My Media</h1>
          <Link to="/upload">
            <Button variant="hero">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </Link>
        </div>

        {/* Watermark section */}
        <div className="mb-8">
          <WatermarkUploader onWatermarkUrl={() => {}} />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Folder sidebar */}
          <aside className="lg:w-56 shrink-0">
            <div className="glass-card p-4 lg:sticky lg:top-24">
              <FolderSidebar
                folders={folders}
                activeFolderId={activeFolderId}
                onSelectFolder={setActiveFolderId}
                onFoldersChange={fetchFolders}
                userId={user.id}
              />
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {loadingVideos ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Video className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  {activeFolderId ? "This folder is empty" : "No media yet"}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {activeFolderId
                    ? "Move videos into this folder or upload new content."
                    : "Upload your first video to start selling."}
                </p>
                <Link to="/upload">
                  <Button variant="hero">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Content
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  >
                    {thumbnails[video.id] ? (
                      <img
                        src={thumbnails[video.id]}
                        alt={video.title}
                        className="w-24 h-14 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-14 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Video className="w-6 h-6 text-accent" />
                      </div>
                    )}
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
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* Move to folder */}
                      <Select
                        value={video.folder_id || "__none__"}
                        onValueChange={(val) => handleMoveToFolder(video.id, val === "__none__" ? null : val)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <FolderInput className="w-3.5 h-3.5 mr-1 shrink-0" />
                          <SelectValue placeholder="No folder" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No folder</SelectItem>
                          {folders.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1.5" title="Toggle watermarks">
                        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                        <Switch
                          checked={video.watermarks_enabled}
                          onCheckedChange={() => handleToggleWatermark(video)}
                          className="scale-90"
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleCopyLink(video.id)} title="Copy purchase link">
                        <Link2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/preview/${video.id}`)} title="View">
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyVideos;
