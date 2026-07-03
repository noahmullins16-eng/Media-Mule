import { supabase } from "@/integrations/supabase/client";

export const storage = {
  async uploadFile(
    file: File | Blob,
    fileName: string,
    folder: string = ""
  ): Promise<string> {
    try {
      console.log("📤 [Storage] Requesting presigned PUT URL from Edge Function", { fileName, folder, type: file.type });

      // Call Edge Function to get presigned URL
      const { data, error } = await supabase.functions.invoke("generate-r2-url", {
        body: {
          fileName,
          folder,
          action: "upload",
          contentType: file.type || "application/octet-stream",
        },
      });

      // Defensive JSON parsing if server returned string instead of object
      let parsedData = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse response data as JSON:", e);
        }
      }

      if (error || !parsedData?.uploadUrl) {
        console.error("❌ [Storage] Presigned URL generation failed", error, parsedData);
        throw new Error(parsedData?.error || error?.message || "Failed to generate presigned URL");
      }

      const { uploadUrl, publicUrl } = parsedData;
      console.log("🔗 [Storage] Successfully generated presigned PUT URL", { uploadUrl, publicUrl });

      // Upload file directly using the presigned URL
      console.log("📤 [Storage] Uploading file to R2...", { size: (file as any).size || "unknown" });
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("❌ [Storage] R2 upload request failed", {
          status: response.statusText,
          statusCode: response.status,
          error: errorBody,
        });
        throw new Error(`R2 upload failed (${response.status}): ${response.statusText}. ${errorBody.slice(0, 200)}`);
      }

      console.log("✅ [Storage] Upload to R2 successful", { publicUrl });
      return publicUrl;
    } catch (error) {
      console.error("❌ [Storage] Upload process error", error);
      throw error;
    }
  },

  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      console.log("🔑 [Storage] Requesting signed GET URL", { filePath, expiresIn });

      const { data, error } = await supabase.functions.invoke("generate-r2-url", {
        body: {
          fileName: filePath,
          folder: "",
          action: "download",
          expiresIn,
        },
      });

      // Defensive JSON parsing
      let parsedData = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse response data as JSON:", e);
        }
      }

      if (error || !parsedData?.signedUrl) {
        console.error("❌ [Storage] Signed GET URL generation failed", error, parsedData);
        throw new Error(parsedData?.error || error?.message || "Failed to generate signed GET URL");
      }

      console.log("✅ [Storage] Successfully generated signed GET URL");
      return parsedData.signedUrl;
    } catch (error) {
      console.error("❌ [Storage] Signed URL process error", error);
      throw error;
    }
  },

  async deleteFile(filePath: string): Promise<void> {
    try {
      console.log("🗑️ [Storage] Requesting object deletion from R2", { filePath });

      const { data, error } = await supabase.functions.invoke("generate-r2-url", {
        body: {
          fileName: filePath,
          folder: "",
          action: "delete",
        },
      });

      // Defensive JSON parsing
      let parsedData = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse response data as JSON:", e);
        }
      }

      if (error || !parsedData?.success) {
        console.error("❌ [Storage] R2 delete failed", error, parsedData);
        throw new Error(parsedData?.error || error?.message || "Failed to delete file from R2");
      }

      console.log("✅ [Storage] Successfully deleted object from R2", { filePath });
    } catch (error) {
      console.error("❌ [Storage] Delete process error", error);
      throw error;
    }
  },

  getPublicUrl(fileName: string, folder: string = ""): string {
    const key = folder ? `${folder}/${fileName}` : fileName;
    const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
    const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
  },
};
