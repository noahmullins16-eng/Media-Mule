/**
 * Example: How to integrate R2 storage with your VideoUploader component
 *
 * This file shows how to modify the existing uploadSingleFile function
 * to use Cloudflare R2 instead of Supabase storage.
 */

import { r2Storage } from "@/lib/r2-storage";
import { supabase } from "@/integrations/supabase/client";

/**
 * OPTION 1: Replace Supabase storage with R2 storage
 *
 * Replace the uploadSingleFile function in VideoUploader.tsx with this:
 */
export const uploadSingleFileWithR2 = async (
  uploadFile: { file: File; type: "video" | "image" | "audio" },
  fileTitle: string,
  fileDescription: string,
  priceNum: number,
  userId: string,
  watermarksEnabled: boolean,
  folderId: string | null
) => {
  // Generate unique filename
  const ext = uploadFile.file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const folderPath = `users/${userId}`;

  // Upload to R2
  const r2Url = await r2Storage.uploadFile(
    uploadFile.file,
    fileName,
    folderPath
  );

  if (!r2Url) throw new Error("Failed to upload file to R2");

  // Create database record in Supabase
  const { data: videoRecord, error: dbError } = await supabase
    .from("videos")
    .insert({
      user_id: userId,
      title: fileTitle,
      description: fileDescription || null,
      price: priceNum,
      file_path: `${folderPath}/${fileName}`, // Path for reference
      file_size: uploadFile.file.size,
      status: "published",
      watermarks_enabled: watermarksEnabled,
      folder_id: folderId || null,
      r2_url: r2Url, // Store R2 URL in database
    })
    .select("id")
    .single();

  if (dbError || !videoRecord) throw dbError || new Error("Failed to create record");

  // Store file metadata
  const { error: fileError } = await supabase
    .from("video_files")
    .insert({
      video_id: videoRecord.id,
      file_path: `${folderPath}/${fileName}`,
      file_type: uploadFile.type,
      file_size: uploadFile.file.size,
      sort_order: 0,
      storage_provider: "r2", // Track which storage provider was used
      storage_url: r2Url,
    });

  if (fileError) throw fileError;
};

/**
 * OPTION 2: Use both Supabase AND R2 (Hybrid approach)
 *
 * Keep Supabase as primary storage but also backup to R2:
 */
export const uploadSingleFileHybrid = async (
  uploadFile: { file: File; type: "video" | "image" | "audio" },
  fileTitle: string,
  fileDescription: string,
  priceNum: number,
  userId: string,
  watermarksEnabled: boolean,
  folderId: string | null
) => {
  const ext = uploadFile.file.name.split(".").pop();
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  // Upload to Supabase (primary storage)
  const { error: supabaseError } = await supabase.storage
    .from("videos")
    .upload(filePath, uploadFile.file, { cacheControl: "3600", upsert: false });

  if (supabaseError) throw supabaseError;

  let r2Url: string | null = null;

  // Also backup to R2 (optional/secondary)
  try {
    r2Url = await r2Storage.uploadFile(
      uploadFile.file,
      `${crypto.randomUUID()}.${ext}`,
      `backup/${userId}`
    );
  } catch (error) {
    console.warn("R2 backup upload failed:", error);
    // Don't fail if R2 backup fails - Supabase is primary
  }

  // Create database record
  const { data: videoRecord, error: dbError } = await supabase
    .from("videos")
    .insert({
      user_id: userId,
      title: fileTitle,
      description: fileDescription || null,
      price: priceNum,
      file_path: filePath,
      file_size: uploadFile.file.size,
      status: "published",
      watermarks_enabled: watermarksEnabled,
      folder_id: folderId || null,
      r2_backup_url: r2Url, // Store R2 backup URL
    })
    .select("id")
    .single();

  if (dbError || !videoRecord) throw dbError || new Error("Failed to create record");

  const { error: fileError } = await supabase
    .from("video_files")
    .insert({
      video_id: videoRecord.id,
      file_path: filePath,
      file_type: uploadFile.type,
      file_size: uploadFile.file.size,
      sort_order: 0,
    });

  if (fileError) throw fileError;
};

/**
 * OPTION 3: Smart routing based on file size
 *
 * Use R2 for large files, Supabase for small files:
 */
export const uploadSingleFileSmartRouting = async (
  uploadFile: { file: File; type: "video" | "image" | "audio" },
  fileTitle: string,
  fileDescription: string,
  priceNum: number,
  userId: string,
  watermarksEnabled: boolean,
  folderId: string | null
) => {
  const ext = uploadFile.file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;

  // Files larger than 500MB go to R2
  const shouldUseR2 = uploadFile.file.size > 500 * 1024 * 1024;

  let storageProvider: "supabase" | "r2" = "supabase";
  let storagePath = `${userId}/${fileName}`;

  if (shouldUseR2) {
    // Upload to R2
    const r2Url = await r2Storage.uploadFile(
      uploadFile.file,
      fileName,
      `users/${userId}`
    );

    if (!r2Url) throw new Error("Failed to upload to R2");

    storageProvider = "r2";
    storagePath = r2Url;
  } else {
    // Upload to Supabase
    const { error } = await supabase.storage
      .from("videos")
      .upload(storagePath, uploadFile.file, { cacheControl: "3600", upsert: false });

    if (error) throw error;
  }

  // Create database record
  const { data: videoRecord, error: dbError } = await supabase
    .from("videos")
    .insert({
      user_id: userId,
      title: fileTitle,
      description: fileDescription || null,
      price: priceNum,
      file_path: storagePath,
      file_size: uploadFile.file.size,
      status: "published",
      watermarks_enabled: watermarksEnabled,
      folder_id: folderId || null,
      storage_provider: storageProvider,
    })
    .select("id")
    .single();

  if (dbError || !videoRecord) throw dbError || new Error("Failed to create record");

  const { error: fileError } = await supabase
    .from("video_files")
    .insert({
      video_id: videoRecord.id,
      file_path: storagePath,
      file_type: uploadFile.type,
      file_size: uploadFile.file.size,
      sort_order: 0,
    });

  if (fileError) throw fileError;
};

/**
 * Helper function: Get file URL from storage provider
 */
export const getFileUrl = async (
  storagePath: string,
  storageProvider: "supabase" | "r2" = "supabase"
): Promise<string> => {
  if (storageProvider === "r2" && storagePath.startsWith("http")) {
    // Already a full R2 URL
    return storagePath;
  }

  if (storageProvider === "r2") {
    // Generate public R2 URL
    const [folder, fileName] = storagePath.split("/").slice(-2);
    return r2Storage.getPublicUrl(fileName, folder);
  }

  // Get Supabase URL
  const { data } = supabase.storage.from("videos").getPublicUrl(storagePath);
  return data.publicUrl;
};

/**
 * Helper function: Delete file from storage
 */
export const deleteFileFromStorage = async (
  storagePath: string,
  storageProvider: "supabase" | "r2" = "supabase"
): Promise<void> => {
  if (storageProvider === "r2") {
    const [folder, fileName] = storagePath.split("/").slice(-2);
    await r2Storage.deleteFile(fileName, folder);
  } else {
    await supabase.storage.from("videos").remove([storagePath]);
  }
};

/**
 * DATABASE SCHEMA UPDATES
 *
 * Add these columns to your videos and video_files tables:
 *
 * ALTER TABLE videos ADD COLUMN (
 *   storage_provider TEXT DEFAULT 'supabase',
 *   r2_url TEXT,
 *   r2_backup_url TEXT
 * );
 *
 * ALTER TABLE video_files ADD COLUMN (
 *   storage_provider TEXT DEFAULT 'supabase',
 *   storage_url TEXT
 * );
 */
