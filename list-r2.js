import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// Manually parse .env file
const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const accountId = env.VITE_R2_ACCOUNT_ID;
const bucketName = env.VITE_R2_BUCKET_NAME;
const accessKeyId = env.VITE_R2_ACCESS_KEY_ID;
const secretAccessKey = env.VITE_R2_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function listObjects() {
  try {
    const response = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 50 }));
    console.log("SUCCESS_LIST");
    if (response.Contents) {
      response.Contents.forEach((obj) => {
        console.log(`- ${obj.Key} (${obj.Size} bytes)`);
      });
    } else {
      console.log("No objects found.");
    }
  } catch (error) {
    console.log("ERROR_LIST");
    console.error(error);
  }
}

listObjects();
