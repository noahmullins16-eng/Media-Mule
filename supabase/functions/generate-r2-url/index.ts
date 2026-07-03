import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.535.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.535.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: any, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse Body
    const { fileName, folder, action = "upload", contentType, expiresIn = 3600 } = await req.json();

    // Build Object Key (Path)
    const key = folder ? `${folder}/${fileName}` : fileName;

    let isPublic = false;
    if (action === "download") {
      // 1. Custom watermarks are public assets overlaid on preview player
      if (key.startsWith("watermarks/")) {
        isPublic = true;
      } else {
        // 2. Check if file is in videos table as a published video
        const { data: videoData } = await supabaseClient
          .from("videos")
          .select("id")
          .eq("file_path", key)
          .eq("status", "published")
          .maybeSingle();

        if (videoData) {
          isPublic = true;
        } else {
          // 3. Check if file is in video_files associated with a published video
          const { data: fileData } = await supabaseClient
            .from("video_files")
            .select("video_id")
            .eq("file_path", key)
            .maybeSingle();

          if (fileData) {
            const { data: parentVideo } = await supabaseClient
              .from("videos")
              .select("id")
              .eq("id", fileData.video_id)
              .eq("status", "published")
              .maybeSingle();

            if (parentVideo) {
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

      // Decode JWT payload directly
      const token = authHeader.replace("Bearer ", "");
      const parts = token.split(".");
      if (parts.length !== 3) {
        console.error("Invalid token format");
        return jsonResponse({ error: "Unauthorized: Invalid token format" }, 401);
      }

      const base64Url = parts[1];
      let payload;
      try {
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padLen = (4 - (base64.length % 4)) % 4;
        const padded = base64 + "=".repeat(padLen);
        const binaryString = atob(padded);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const rawPayload = new TextDecoder().decode(bytes);
        payload = JSON.parse(rawPayload);
      } catch (e) {
        console.error("Failed to decode JWT payload:", e);
        return jsonResponse({ error: "Unauthorized: Invalid token encoding" }, 401);
      }
      userId = payload.sub;

      if (!userId) {
        console.error("User ID not found in token payload");
        return jsonResponse({ error: "Unauthorized: Invalid user payload" }, 401);
      }

      console.log(`🔐 Authenticated request for user: ${userId}`);

      // Owner verification: ensure they are modifying/accessing their own files
      const targetFolder = folder || key;
      const isUserFolder = targetFolder.startsWith(userId) || targetFolder.startsWith(`watermarks/${userId}`);
      if (!isUserFolder) {
        console.warn(`User ${userId} tried to access unauthorized folder path: ${targetFolder}`);
        return jsonResponse({ error: "Forbidden: You do not have permission to access this path" }, 403);
      }
    } else {
      console.log(`🔓 Public download request for key: ${key}`);
    }

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
    });

    if (action === "upload") {
      console.log(`📤 Generating presigned PUT URL for key: ${key}`);
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType || "application/octet-stream",
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
      const publicUrl = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;

      return jsonResponse({
        uploadUrl,
        publicUrl,
        key,
      });
    } else if (action === "download") {
      console.log(`📥 Generating signed GET URL for key: ${key}`);
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

      return jsonResponse({
        signedUrl,
        key,
      });
    } else if (action === "delete") {
      console.log(`🗑️ Deleting object for key: ${key}`);
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);

      return jsonResponse({
        success: true,
        key,
      });
    } else {
      return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
    }
  } catch (error: any) {
    console.error("❌ Edge function error:", error);
    return jsonResponse({
      error: `Edge Function Error: ${error.message || error}\nStack: ${error.stack || ""}`,
    }, 500);
  }
});
