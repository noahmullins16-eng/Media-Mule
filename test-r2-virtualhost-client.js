import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

console.log("Using credentials from .env with virtual-hosted endpoint");
console.log("Account ID:", accountId);
console.log("Bucket:", bucketName);

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

async function runTest() {
  try {
    const key = "3000c959-5d25-4cdd-94a6-61d800f3ab97/test-virtual-endpoint.txt";
    console.log(`Trying to PutObject to key: ${key}`);
    const response = await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: "Hello from test upload script with virtual hosted endpoint!",
      ContentType: "text/plain",
    }));
    console.log("✅ PutObject SUCCESS", response);
  } catch (error) {
    console.error("❌ PutObject FAILED", error);
  }
}

runTest();
