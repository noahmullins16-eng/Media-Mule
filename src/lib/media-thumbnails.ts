import { supabase } from "@/integrations/supabase/client";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "ogg", "ogv", "avi", "mkv"]);

const getFileExtension = (path: string) => path.split("?")[0].split(".").pop()?.toLowerCase() || "";

const extractStoragePath = (bucket: string, value: string) => {
  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\/+/, "");
  }

  try {
    const { pathname } = new URL(value);
    const patterns = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/render/image/public/${bucket}/`,
      `/storage/v1/render/image/authenticated/${bucket}/`,
    ];

    for (const pattern of patterns) {
      const index = pathname.indexOf(pattern);
      if (index !== -1) {
        return decodeURIComponent(pathname.slice(index + pattern.length));
      }
    }
  } catch {
    return null;
  }

  return null;
};

export const resolveStorageAssetUrl = async (
  bucket: string,
  value: string | null | undefined,
  expiresIn = 3600,
) => {
  if (!value) return null;

  const path = extractStoragePath(bucket, value);
  if (!path) {
    return value;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    console.warn(`Failed to resolve storage asset in ${bucket}:`, error.message);
    return /^https?:\/\//i.test(value) ? value : null;
  }

  return data?.signedUrl || null;
};

const createVideoFrameThumbnail = (src: string): Promise<string | null> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    let captured = false;

    const cleanup = () => {
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const captureFrame = () => {
      if (captured) return;
      captured = true;

      const width = video.videoWidth || 160;
      const height = video.videoHeight || 90;
      const scale = Math.min(160 / width, 90 / height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        resolve(null);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      cleanup();
      resolve(dataUrl);
    };

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.onloadeddata = () => {
      const targetTime = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(1, video.duration / 4)
        : 0;

      if (targetTime <= 0) {
        captureFrame();
        return;
      }

      video.currentTime = targetTime;
    };
    video.onseeked = captureFrame;
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = src;
  });

export const resolveMediaThumbnail = async ({
  bucket = "videos",
  thumbnailValue,
  filePath,
}: {
  bucket?: string;
  thumbnailValue?: string | null;
  filePath?: string | null;
}) => {
  const storedThumbnail = await resolveStorageAssetUrl(bucket, thumbnailValue);
  if (storedThumbnail) {
    return storedThumbnail;
  }

  if (!filePath) return null;

  const sourceUrl = await resolveStorageAssetUrl(bucket, filePath);
  if (!sourceUrl) return null;

  const extension = getFileExtension(filePath);
  if (IMAGE_EXTENSIONS.has(extension)) {
    return sourceUrl;
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return createVideoFrameThumbnail(sourceUrl);
  }

  return null;
};