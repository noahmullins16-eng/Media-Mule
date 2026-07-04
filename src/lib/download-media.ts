import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { storage } from "./storage";

export const downloadMedia = async (filePath: string, title: string) => {
  let signedUrl = "";
  try {
    console.log("📥 [Download] Requesting download for:", filePath);

    // Check if the file is in R2 by querying videos or video_files table
    const { data: videoData } = await supabase
      .from("videos")
      .select("r2_url")
      .eq("file_path", filePath)
      .maybeSingle();

    let isR2 = !!videoData?.r2_url && videoData.r2_url.includes("r2.cloudflarestorage.com");

    if (!isR2) {
      const { data: fileData } = await supabase
        .from("video_files")
        .select("storage_url")
        .eq("file_path", filePath)
        .maybeSingle();
      isR2 = !!fileData?.storage_url && fileData.storage_url.includes("r2.cloudflarestorage.com");
    }

    if (isR2) {
      signedUrl = await storage.getSignedUrl(filePath, 300);
    } else {
      console.log("📥 [Download] Fetching legacy Supabase signed URL");
      const { data, error } = await supabase.storage
        .from("videos")
        .createSignedUrl(filePath, 300);
      if (error) throw error;
      signedUrl = data?.signedUrl || "";
    }
  } catch (err) {
    console.error("❌ [Download] Failed to generate download URL:", err);
    toast.error("Failed to generate download link");
    return;
  }

  if (!signedUrl) {
    toast.error("Failed to generate download link");
    return;
  }

  console.log("✅ [Download] Triggering download");
  const a = document.createElement("a");
  a.href = signedUrl;
  a.download = title;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast.success("Download started");
};
