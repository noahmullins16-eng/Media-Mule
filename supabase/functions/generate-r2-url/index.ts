import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.535.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.535.0";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return jsonResponse({ error: "Unauthorized: Missing Authorization header" }, 401);
    }

    // Decode JWT payload directly (the Supabase Gateway already verified the signature)
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
    const userId = payload.sub;

    if (!userId) {
      console.error("User ID not found in token payload");
      return jsonResponse({ error: "Unauthorized: Invalid user payload" }, 401);
    }

    console.log(`🔐 Authenticated request for user: ${userId}`);

    // Parse Body
    const { fileName, folder, action = "upload", contentType, expiresIn = 3600 } = await req.json();

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

    // Build Object Key (Path)
    const key = folder ? `${folder}/${fileName}` : fileName;

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
