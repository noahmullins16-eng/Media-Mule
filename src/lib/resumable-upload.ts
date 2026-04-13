import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Fixed chunk size that stays within Supabase's upload limit
const CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB

export interface UploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
  chunkSize: number; // current adaptive chunk size
}

export interface ResumableUploadOptions {
  bucket: string;
  path: string;
  file: File;
  contentType?: string;
  cacheControl?: string;
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
}

export const resumableUpload = async ({
  bucket,
  path,
  file,
  contentType,
  cacheControl = "3600",
  onProgress,
  onError,
}: ResumableUploadOptions): Promise<{ path: string }> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error("Not authenticated");

  return new Promise((resolve, reject) => {
    let lastBytes = 0;
    let lastTime = Date.now();
    let currentSpeed = 0;

    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      chunkSize: CHUNK_SIZE,
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: contentType || file.type || "application/octet-stream",
        cacheControl: cacheControl,
      },
      onError: (error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        reject(err);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        const bytesDelta = bytesUploaded - lastBytes;

        if (elapsed >= 0.5) {
          const instantSpeed = bytesDelta / elapsed;
          currentSpeed = currentSpeed === 0
            ? instantSpeed
            : 0.3 * instantSpeed + 0.7 * currentSpeed;

          lastBytes = bytesUploaded;
          lastTime = now;
        }

        const remaining = bytesTotal - bytesUploaded;
        const eta = currentSpeed > 0 ? remaining / currentSpeed : 0;

        onProgress?.({
          bytesUploaded,
          bytesTotal,
          percentage: Math.round((bytesUploaded / bytesTotal) * 100),
          speed: currentSpeed,
          eta,
          chunkSize: currentChunk,
        });
      },
      onSuccess: () => {
        resolve({ path });
      },
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
};

/** Format bytes to human-readable string */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/** Format seconds to human-readable duration */
export const formatEta = (seconds: number): string => {
  if (seconds <= 0 || !isFinite(seconds)) return "calculating...";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};
