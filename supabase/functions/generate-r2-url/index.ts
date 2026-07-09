import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "npm:@aws-sdk/client-s3@3.535.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.535.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};

const normalizeObjectKey = (value: string) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      return new URL(value).pathname.replace(/^\/+/, "");
    } catch {
      return value;
    }
  }
  return value;
};

const isPublicAssetKey = (value: string) => {
  const normalized = normalizeObjectKey(value);
  return normalized.startsWith("previews/") || normalized.startsWith("watermarks/");
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse Request Body
    const {
      fileName,
      folder,
      action = "upload",
      contentType,
      expiresIn = 3600,
      uploadId,
      partNumber,
      parts,
      fileSize,
      chunkSize,
      key,
    } = await req.json();

    // 2. Build or resolve Object Key
    const resolvedKey = normalizeObjectKey(key || (folder ? `${folder}/${fileName}` : fileName));

    // 3. Ownership / Authorization Check
    let isPublic = false;
    if (action === "download") {
      // 1. Previews and watermarks are public assets
      if (isPublicAssetKey(resolvedKey)) {
        isPublic = true;
      } else {
        // 2. Check if file is in videos table as a published video (and is not audio)
        const { data: videoData } = await supabaseClient
          .from("videos")
          .select("id, status, preview_path")
          .eq("file_path", resolvedKey)
          .eq("status", "published")
          .maybeSingle();

        if (!videoData) {
          const { data: previewVideoData } = await supabaseClient
            .from("videos")
            .select("id, status, preview_path")
            .eq("preview_path", resolvedKey)
            .eq("status", "published")
            .maybeSingle();

          if (previewVideoData) {
            const ext = resolvedKey.split(".").pop()?.toLowerCase() || "";
            const isAudio = ["mp3", "wav", "ogg", "aac", "m4a"].includes(ext);
            if (!isAudio) {
              isPublic = true;
            }
          }
        } else {
          const ext = resolvedKey.split(".").pop()?.toLowerCase() || "";
          const isAudio = ["mp3", "wav", "ogg", "aac", "m4a"].includes(ext);
          if (!isAudio) {
            isPublic = true;
          }
        }

        if (!isPublic) {
          // 3. Check if file is in video_files associated with a published video (and is not audio)
          let fileData = null;
          const { data: dbFileData } = await supabaseClient
            .from("video_files")
            .select("video_id, file_type")
            .eq("file_path", resolvedKey)
            .maybeSingle();

          fileData = dbFileData;

          if (!fileData) {
            const { data: previewFileData } = await supabaseClient
              .from("video_files")
              .select("video_id, file_type")
              .eq("preview_path", resolvedKey)
              .maybeSingle();

            if (previewFileData) {
              fileData = previewFileData;
            }
          }

          if (fileData) {
            const { data: parentVideo } = await supabaseClient
              .from("videos")
              .select("id")
              .eq("id", fileData.video_id)
              .eq("status", "published")
              .maybeSingle();

            if (parentVideo && (fileData.file_type === "video" || fileData.file_type === "image" || fileData.file_type === "pdf")) {
              isPublic = true;
            }
          }
        }
      }
    }

    let userId = null;
    if (!isPublic) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        console.error("Missing Authorization header");
        return jsonResponse({ error: "Unauthorized: Missing Authorization header" }, 401);
      }

      const token = authHeader.replace("Bearer ", "");
      
      // SECURE AUTH: Get the user using supabase client auth API
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError || !user) {
        console.error("Auth verification failed:", authError);
        return jsonResponse({ error: "Unauthorized: Invalid token" }, 401);
      }

      userId = user.id;
      console.log(`🔐 Authenticated request for user: ${userId}`);

      if (action === "download") {
        // Enforce owner / purchase check on download actions
        let isAuthorized = false;

        // Find the video ID and owner ID for the requested key
        let videoId = null;
        let ownerId = null;

        // Try matching video table first
        const { data: videoData } = await supabaseClient
          .from("videos")
          .select("id, user_id")
          .eq("file_path", resolvedKey)
          .maybeSingle();

        if (videoData) {
          videoId = videoData.id;
          ownerId = videoData.user_id;
        } else {
          // Try matching video_files table
          const { data: fileData } = await supabaseClient
            .from("video_files")
            .select("video_id")
            .eq("file_path", resolvedKey)
            .maybeSingle();

          if (fileData) {
            const { data: parentVideo } = await supabaseClient
              .from("videos")
              .select("id, user_id")
              .eq("id", fileData.video_id)
              .maybeSingle();

            if (parentVideo) {
              videoId = parentVideo.id;
              ownerId = parentVideo.user_id;
            }
          }
        }

        // If we found a video record associated with this key:
        if (videoId && ownerId) {
          // Check if they are the owner
          if (userId === ownerId) {
            isAuthorized = true;
            console.log(`✅ User ${userId} is the owner of video ${videoId}`);
          } else {
            // Check if they purchased the video
            const { data: purchaseData } = await supabaseClient
              .from("purchases")
              .select("id")
              .eq("video_id", videoId)
              .eq("buyer_user_id", userId)
              .maybeSingle();

            if (purchaseData) {
              isAuthorized = true;
              console.log(`✅ User ${userId} purchased video ${videoId}`);
            }
          }
        } else {
          // If the key is not in videos or video_files, enforce standard folder check:
          const targetFolder = folder || resolvedKey;
          const isUserFolder = targetFolder.startsWith(userId) || targetFolder.startsWith(`watermarks/${userId}`);
          if (isUserFolder) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          console.warn(`User ${userId} tried to access unauthorized path: ${resolvedKey}`);
          return jsonResponse({ error: "Forbidden: You do not have permission to access this path" }, 403);
        }
      } else {
        // For non-download actions (e.g. upload / write): owner verification
        const targetFolder = folder || resolvedKey;
        const isUserFolder = targetFolder.startsWith(userId) || targetFolder.startsWith(`watermarks/${userId}`) || targetFolder.startsWith(`previews/${userId}`);
        if (!isUserFolder) {
          console.warn(`User ${userId} tried to access unauthorized folder path: ${targetFolder}`);
          return jsonResponse({ error: "Forbidden: You do not have permission to access this path" }, 403);
        }
      }
    } else {
      console.log(`🔓 Public download request for key: ${resolvedKey}`);
    }

    // 4. Setup S3 client for Cloudflare R2
    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");

    if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
      console.error("Missing R2 environment configurations");
      return jsonResponse({ error: "R2 credentials not configured on the server" }, 500);
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    // 5. Handle Actions
    if (action === "upload") {
      // Legacy single-part PUT upload URL
      console.log(`📤 Generating presigned PUT URL for key: ${resolvedKey}`);
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: resolvedKey,
        ContentType: contentType || "application/octet-stream",
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
      const publicUrl = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${resolvedKey}`;

      return jsonResponse({
        uploadUrl,
        publicUrl,
        key: resolvedKey,
      });

    } else if (action === "download") {
      // Generate signed download/GET URL
      console.log(`📥 Generating signed GET URL for key: ${resolvedKey}`);
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: resolvedKey,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

      return jsonResponse({
        signedUrl,
        key: resolvedKey,
      });

    } else if (action === "delete") {
      // Delete object
      console.log(`🗑️ Deleting object for key: ${resolvedKey}`);
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: resolvedKey,
      });

      await s3Client.send(command);

      return jsonResponse({
        success: true,
        key: resolvedKey,
      });

    } else if (action === "initiate-multipart") {
      // 1. Validate file size up to 10 GB (10 * 1024 * 1024 * 1024 bytes)
      if (fileSize && fileSize > 10 * 1024 * 1024 * 1024) {
        return jsonResponse({ error: "File size exceeds the 10 GB limit" }, 400);
      }

      // 2. Rate limiting check per user
      let count = 0;
      try {
        const { data: countData, error: countError } = await supabaseClient
          .from("upload_sessions")
          .select("id")
          .eq("user_id", userId)
          .gt("created_at", new Date(Date.now() - 3600 * 1000).toISOString());
        
        if (!countError && Array.isArray(countData)) {
          count = countData.length;
        }
      } catch (dbErr) {
        console.warn("Could not query upload_sessions for rate limit check, using videos fallback", dbErr);
        // Fallback: Check number of videos created by this user in the last hour
        const { data: countData, error: countError } = await supabaseClient
          .from("videos")
          .select("id")
          .eq("user_id", userId)
          .gt("created_at", new Date(Date.now() - 3600 * 1000).toISOString());
        if (!countError && Array.isArray(countData)) {
          count = countData.length;
        }
      }

      if (count >= 50) {
        return jsonResponse({ error: "Rate limit exceeded. Maximum 50 uploads per hour." }, 429);
      }

      console.log(`🎬 Initiating Multipart Upload for key: ${resolvedKey}`);
      const command = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: resolvedKey,
        ContentType: contentType || "application/octet-stream",
      });

      const response = await s3Client.send(command);

      // Track session in DB
      try {
        await supabaseClient
          .from("upload_sessions")
          .insert({
            user_id: userId,
            upload_id: response.UploadId,
            file_key: resolvedKey,
            file_name: fileName,
            file_size: fileSize || 0,
            chunk_size: chunkSize || 10 * 1024 * 1024,
          });
      } catch (dbErr) {
        console.warn("Failed to insert upload session into database", dbErr);
      }

      return jsonResponse({
        uploadId: response.UploadId,
        key: resolvedKey,
      });

    } else if (action === "get-upload-part-url") {
      if (!uploadId || !partNumber) {
        return jsonResponse({ error: "Missing uploadId or partNumber parameters" }, 400);
      }

      console.log(`🔗 Generating Upload Part URL: Key: ${resolvedKey}, Part: ${partNumber}`);
      const command = new UploadPartCommand({
        Bucket: bucketName,
        Key: resolvedKey,
        UploadId: uploadId,
        PartNumber: Number(partNumber),
      });

      // Part signed URLs expire quickly for safety (15 minutes)
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

      return jsonResponse({
        uploadUrl,
      });

    } else if (action === "complete-multipart") {
      if (!uploadId || !parts || !Array.isArray(parts)) {
        return jsonResponse({ error: "Missing uploadId or parts parameters" }, 400);
      }

      console.log(`🏁 Completing Multipart Upload: Key: ${resolvedKey}, Parts: ${parts.length}`);
      const sortedParts = parts.map(p => ({
        PartNumber: Number(p.PartNumber || p.partNumber),
        ETag: p.ETag || p.etag,
      })).sort((a, b) => a.PartNumber - b.PartNumber);

      const command = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: resolvedKey,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sortedParts,
        },
      });

      await s3Client.send(command);

      // Mark session as completed in DB
      try {
        await supabaseClient
          .from("upload_sessions")
          .update({ completed_at: new Date().toISOString() })
          .eq("upload_id", uploadId);
      } catch (dbErr) {
        console.warn("Failed to mark upload session as completed in database", dbErr);
      }

      const publicUrl = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${resolvedKey}`;

      return jsonResponse({
        success: true,
        publicUrl,
        key: resolvedKey,
      });

    } else if (action === "abort-multipart") {
      if (!uploadId) {
        return jsonResponse({ error: "Missing uploadId parameter" }, 400);
      }

      console.log(`🛑 Aborting Multipart Upload: Key: ${resolvedKey}, UploadId: ${uploadId}`);
      const command = new AbortMultipartUploadCommand({
        Bucket: bucketName,
        Key: resolvedKey,
        UploadId: uploadId,
      });

      await s3Client.send(command);

      // Mark session as aborted in DB
      try {
        await supabaseClient
          .from("upload_sessions")
          .update({ aborted_at: new Date().toISOString() })
          .eq("upload_id", uploadId);
      } catch (dbErr) {
        console.warn("Failed to mark upload session as aborted in database", dbErr);
      }

      return jsonResponse({
        success: true,
      });

    } else if (action === "list-parts") {
      if (!uploadId) {
        return jsonResponse({ error: "Missing uploadId parameter" }, 400);
      }

      console.log(`📋 Listing parts for Key: ${resolvedKey}, UploadId: ${uploadId}`);
      const command = new ListPartsCommand({
        Bucket: bucketName,
        Key: resolvedKey,
        UploadId: uploadId,
      });

      const response = await s3Client.send(command);
      const uploadedParts = response.Parts?.map((p) => ({
        PartNumber: p.PartNumber,
        ETag: p.ETag,
        Size: p.Size,
      })) || [];

      return jsonResponse({
        parts: uploadedParts,
      });

    } else {
      return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Edge function error:", err);
    return jsonResponse({
      error: `Edge Function Error: ${err.message || err}\nStack: ${err.stack || ""}`,
    }, 500);
  }
});
