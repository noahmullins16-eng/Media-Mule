import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Music, Trash2, ExternalLink, Link2, ShieldCheck, FolderInput, Download } from "lucide-react";
import { downloadMedia } from "@/lib/download-media";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MediaFolder } from "@/components/folders/FolderSidebar";
import { storage } from "@/lib/storage";

export interface VideoItem {
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
  r2_url?: string | null;
}

interface MediaItemRowProps {
  video: VideoItem;
  folders: MediaFolder[];
  onUpdate: (updated: VideoItem) => void;
  onDelete: (id: string) => void;
}

export const MediaItemRow = ({ video, folders, onUpdate, onDelete }: MediaItemRowProps) => {
  const navigate = useNavigate();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let url = "";
      try {
        if (video.r2_url && video.r2_url.includes("r2.cloudflarestorage.com")) {
          url = await storage.getSignedUrl(video.file_path, 3600);
        } else {
          const { data } = await supabase.storage.from("videos").createSignedUrl(video.file_path, 3600);
          url = data?.signedUrl || "";
        }
      } catch (err) {
        console.error("Failed to generate signed URL for MediaItemRow preview:", err);
      }
      if (!cancelled) {
        setSignedUrl(url);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [video.file_path, video.r2_url]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://mediamuleco.com/video/${video.id}`);
    toast.success("Purchase link copied!");
  };

  const handleToggleWatermark = async () => {
    const newValue = !video.watermarks_enabled;
    const { error } = await supabase
      .from("videos")
      .update({ watermarks_enabled: newValue } as any)
      .eq("id", video.id);
    if (error) {
      toast.error("Failed to update watermark setting");
    } else {
      onUpdate({ ...video, watermarks_enabled: newValue });
      toast.success(newValue ? "Watermarks enabled" : "Watermarks disabled");
    }
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    const { error } = await supabase
      .from("videos")
      .update({ folder_id: folderId } as any)
      .eq("id", video.id);
    if (error) {
      toast.error("Failed to move video");
    } else {
      onUpdate({ ...video, folder_id: folderId });
      toast.success("Video moved");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    try {
      if (video.r2_url && video.r2_url.includes("r2.cloudflarestorage.com")) {
        await storage.deleteFile(video.file_path);
      } else {
        await supabase.storage.from("videos").remove([video.file_path]);
      }
    } catch (err) {
      console.warn("Failed to delete file from storage:", err);
    }
    const { error } = await supabase.from("videos").delete().eq("id", video.id);
    if (error) {
      toast.error("Failed to delete video");
    } else {
      toast.success("Video deleted");
      onDelete(video.id);
    }
  };

  const ext = video.file_path.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
  const isAudio = ["mp3", "wav", "ogg", "aac", "m4a"].includes(ext);

  const renderThumbnail = () => {
    if (!signedUrl) {
      return (
        <div className="w-24 h-14 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-accent"></div>
        </div>
      );
    }

    if (isImage) {
      return (
        <img src={signedUrl} alt={video.title} className="w-24 h-14 rounded-lg object-cover shrink-0" />
      );
    }

    if (isAudio) {
      return (
        <div className="w-24 h-14 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Music className="w-6 h-6 text-accent" />
        </div>
      );
    }

    return (
      <div className="relative w-24 h-14 rounded-lg overflow-hidden shrink-0">
        <video src={signedUrl} className="w-full h-full object-cover" preload="metadata" muted playsInline />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <Video className="w-4 h-4 text-white opacity-85" />
        </div>
      </div>
    );
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/video-id", video.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-grab active:cursor-grabbing"
    >
      {renderThumbnail()}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate text-sm">{video.title}</h3>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
          <span>${Number(video.price).toFixed(2)}</span>
          {video.file_size && <span>{(video.file_size / (1024 * 1024)).toFixed(1)} MB</span>}
          <span className="capitalize">{video.status}</span>
          <span>{new Date(video.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        <Select
          value={video.folder_id || "__none__"}
          onValueChange={(val) => handleMoveToFolder(val === "__none__" ? null : val)}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
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
        <div className="flex items-center gap-1" title="Toggle watermarks">
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
          <Switch checked={video.watermarks_enabled} onCheckedChange={handleToggleWatermark} className="scale-75" />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadMedia(video.file_path, video.title)} title="Download">
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyLink} title="Copy purchase link">
          <Link2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/preview/${video.id}`)} title="View">
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} title="Delete">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
