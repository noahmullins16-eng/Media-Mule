import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { storage } from "@/lib/storage";

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
      try {
        const { data } = await supabase
          .from("creator_profiles")
          .select("custom_watermark_path")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.custom_watermark_path) {
          let url = "";
          if (data.custom_watermark_path.startsWith("http")) {
            url = data.custom_watermark_path;
          } else if (data.custom_watermark_path.includes("watermark")) {
            // It's in R2 (stored as watermarks/userId/watermark.ext or userId/watermark.ext)
            url = await storage.getSignedUrl(data.custom_watermark_path);
          } else {
            // Legacy Supabase storage path
            const { data: urlData } = supabase.storage
              .from("watermarks")
              .getPublicUrl(data.custom_watermark_path);
            url = urlData?.publicUrl || null;
          }
          setWatermarkUrl(url);
          onWatermarkUrl(url);
        }
      } catch (err) {
        console.error("Error fetching custom watermark:", err);
      } finally {
        setLoading(false);
      }
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
      const folderPath = `watermarks/${user.id}`;
      const fileName = `watermark.${ext}`;
      const filePath = `${folderPath}/${fileName}`;

      // Remove old watermark from R2 / Supabase if it exists
      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("custom_watermark_path")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.custom_watermark_path) {
        try {
          if (profile.custom_watermark_path.includes("watermark")) {
            await storage.deleteFile(profile.custom_watermark_path);
          } else {
            // Legacy Supabase cleanup
            await supabase.storage.from("watermarks").remove([profile.custom_watermark_path]);
          }
        } catch (delErr) {
          console.warn("Failed to delete old watermark:", delErr);
        }
      }

      console.log("📤 Uploading custom watermark to R2:", filePath);
      const publicUrl = await storage.uploadFile(file, fileName, folderPath);

      if (!publicUrl) throw new Error("Failed to upload watermark image to R2");

      // Save path to profile
      const { error: dbError } = await supabase
        .from("creator_profiles")
        .update({ custom_watermark_path: filePath } as any)
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      const url = await storage.getSignedUrl(filePath);
      setWatermarkUrl(url);
      onWatermarkUrl(url);
      toast.success("Custom watermark saved to your profile!");
    } catch (err: any) {
      console.error("Watermark upload error:", err);
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
        try {
          if (data.custom_watermark_path.includes("watermark")) {
            await storage.deleteFile(data.custom_watermark_path);
          } else {
            await supabase.storage.from("watermarks").remove([data.custom_watermark_path]);
          }
        } catch (delErr) {
          console.warn("Failed to delete watermark file:", delErr);
        }
      }

      await supabase
        .from("creator_profiles")
        .update({ custom_watermark_path: null } as any)
        .eq("user_id", user.id);

      setWatermarkUrl(null);
      onWatermarkUrl(null);
      toast.success("Custom watermark removed. Default watermark will be used.");
    } catch (err: any) {
      console.error("Watermark removal error:", err);
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
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                  <span>{uploading ? "Uploading..." : "Replace"}</span>
                </Button>
              </label>
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
