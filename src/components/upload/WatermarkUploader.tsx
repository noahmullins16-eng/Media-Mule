import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface WatermarkUploaderProps {
  onWatermarkUrl: (url: string | null) => void;
}

export const WatermarkUploader = ({ onWatermarkUrl }: WatermarkUploaderProps) => {
  const { user } = useAuth();
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchExisting = async () => {
      const { data } = await supabase
        .from("creator_profiles")
        .select("custom_watermark_path")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.custom_watermark_path) {
        const { data: urlData } = supabase.storage
          .from("watermarks")
          .getPublicUrl(data.custom_watermark_path);
        const url = urlData?.publicUrl || null;
        setWatermarkUrl(url);
        onWatermarkUrl(url);
      }
      setLoading(false);
    };
    fetchExisting();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG recommended for transparency)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Watermark image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/watermark.${ext}`;

      // Remove old watermark if exists
      await supabase.storage.from("watermarks").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("watermarks")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      // Save path to profile
      const { error: dbError } = await supabase
        .from("creator_profiles")
        .update({ custom_watermark_path: filePath } as any)
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      const { data: urlData } = supabase.storage
        .from("watermarks")
        .getPublicUrl(filePath);

      const url = urlData?.publicUrl || null;
      setWatermarkUrl(url);
      onWatermarkUrl(url);
      toast.success("Custom watermark saved to your profile!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload watermark");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("creator_profiles")
        .select("custom_watermark_path")
        .eq("user_id", user.id)
        .single();

      if (data?.custom_watermark_path) {
        await supabase.storage.from("watermarks").remove([data.custom_watermark_path]);
      }

      await supabase
        .from("creator_profiles")
        .update({ custom_watermark_path: null } as any)
        .eq("user_id", user.id);

      setWatermarkUrl(null);
      onWatermarkUrl(null);
      toast.success("Custom watermark removed. Default watermark will be used.");
    } catch (err: any) {
      toast.error("Failed to remove watermark");
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-4 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium">Custom Watermark</p>
          <p className="text-xs text-muted-foreground">
            Upload a PNG logo to use as your watermark (saved to your profile)
          </p>
        </div>
      </div>

      {watermarkUrl ? (
        <div className="flex items-center gap-3 mt-3">
          <div className="w-20 h-20 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
            <img
              src={watermarkUrl}
              alt="Custom watermark"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs text-accent">
              <Check className="w-3.5 h-3.5" />
              Saved to profile
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById("watermark-replace-input")?.click()}
              >
                {uploading ? "Uploading..." : "Replace"}
              </Button>
              <input
                id="watermark-replace-input"
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                <X className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <label className="mt-3 inline-block">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
            <span className="gap-1.5">
              <ImagePlus className="w-4 h-4" />
              {uploading ? "Uploading..." : "Upload Watermark Image"}
            </span>
          </Button>
        </label>
      )}
    </div>
  );
};
