import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Trash2, ExternalLink, Link2, ShieldCheck, FolderInput, Download } from "lucide-react";
import { downloadMedia } from "@/lib/download-media";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MediaFolder } from "@/components/folders/FolderSidebar";

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
}

interface MediaItemRowProps {
  video: VideoItem;
  folders: MediaFolder[];
  onUpdate: (updated: VideoItem) => void;
  onDelete: (id: string) => void;
}

export const MediaItemRow = ({ video, folders, onUpdate, onDelete }: MediaItemRowProps) => {
  const navigate = useNavigate();
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.storage.from("videos").createSignedUrl(video.file_path, 3600);
      if (!data?.signedUrl || cancelled) return;
      const vid = document.createElement("video");
      vid.crossOrigin = "anonymous";
      vid.muted = true;
      vid.preload = "metadata";
      vid.src = data.signedUrl;
      vid.addEventListener("loadeddata", () => { vid.currentTime = 1; });
      vid.addEventListener("seeked", () => {
        const c = document.createElement("canvas");
        c.width = 160; c.height = 90;
        const ctx = c.getContext("2d");
        if (ctx && !cancelled) {
          ctx.drawImage(vid, 0, 0, c.width, c.height);
          setThumbnail(c.toDataURL("image/jpeg", 0.7));
        }
      });
    };
    load();
    return () => { cancelled = true; };
  }, [video.file_path]);

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
    await supabase.storage.from("videos").remove([video.file_path]);
    const { error } = await supabase.from("videos").delete().eq("id", video.id);
    if (error) {
      toast.error("Failed to delete video");
    } else {
      toast.success("Video deleted");
      onDelete(video.id);
    }
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
      {thumbnail ? (
        <img src={thumbnail} alt={video.title} className="w-24 h-14 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-24 h-14 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Video className="w-6 h-6 text-accent" />
        </div>
      )}
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
