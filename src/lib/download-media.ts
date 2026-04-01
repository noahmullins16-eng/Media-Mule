import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const downloadMedia = async (filePath: string, title: string) => {
  const { data, error } = await supabase.storage
    .from("videos")
    .createSignedUrl(filePath, 300);

  if (error || !data?.signedUrl) {
    toast.error("Failed to generate download link");
    return;
  }

  const a = document.createElement("a");
  a.href = data.signedUrl;
  a.download = title;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast.success("Download started");
};
