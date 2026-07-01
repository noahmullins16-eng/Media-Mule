import { useState } from "react";
import { r2Storage } from "@/lib/r2-storage";
import { toast } from "sonner";

interface UploadOptions {
  folder?: string;
  onProgress?: (progress: number) => void;
}

export const useR2Upload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (
    file: File,
    fileName: string,
    options: UploadOptions = {}
  ): Promise<string | null> => {
    const { folder = "", onProgress } = options;

    if (!import.meta.env.VITE_R2_ACCESS_KEY_ID) {
      toast.error("R2 credentials not configured");
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for UX (actual upload happens quickly with S3)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 80) return prev + Math.random() * 20;
          return prev;
        });
      }, 200);

      const url = await r2Storage.uploadFile(file, fileName, folder);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (onProgress) onProgress(100);
      toast.success("File uploaded to R2 successfully");

      return url;
    } catch (error) {
      console.error("R2 upload error:", error);
      toast.error("Failed to upload file to R2");
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadMultipleFiles = async (
    files: File[],
    folderPath: string = ""
  ): Promise<string[]> => {
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${Date.now()}-${file.name}`;

      const url = await uploadFile(file, fileName, {
        folder: folderPath,
        onProgress: (progress) => {
          const totalProgress = ((i + progress / 100) / files.length) * 100;
          setUploadProgress(totalProgress);
        },
      });

      if (url) {
        urls.push(url);
      }
    }

    return urls;
  };

  const deleteFile = async (fileName: string, folder: string = ""): Promise<boolean> => {
    try {
      await r2Storage.deleteFile(fileName, folder);
      toast.success("File deleted from R2");
      return true;
    } catch (error) {
      console.error("R2 delete error:", error);
      toast.error("Failed to delete file from R2");
      return false;
    }
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    isUploading,
    uploadProgress,
  };
};
