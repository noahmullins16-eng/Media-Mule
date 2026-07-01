import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || "",
  },
});

export const r2Storage = {
  /**
   * Upload a file to R2
   */
  async uploadFile(
    file: File | Blob,
    fileName: string,
    folder: string = ""
  ): Promise<string> {
    const key = folder ? `${folder}/${fileName}` : fileName;

    try {
      const buffer = await file.arrayBuffer();

      const command = new PutObjectCommand({
        Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
        Key: key,
        Body: new Uint8Array(buffer),
        ContentType: file.type,
      });

      await r2Client.send(command);

      // Return the public URL
      const url = `${import.meta.env.VITE_R2_ENDPOINT}/${import.meta.env.VITE_R2_BUCKET_NAME}/${key}`;
      return url;
    } catch (error) {
      console.error("Error uploading file to R2:", error);
      throw error;
    }
  },

  /**
   * Get a signed URL for a file (useful for private files)
   */
  async getSignedUrl(
    fileName: string,
    folder: string = "",
    expiresIn: number = 3600
  ): Promise<string> {
    const key = folder ? `${folder}/${fileName}` : fileName;

    try {
      const command = new GetObjectCommand({
        Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
        Key: key,
      });

      const url = await getSignedUrl(r2Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw error;
    }
  },

  /**
   * Delete a file from R2
   */
  async deleteFile(fileName: string, folder: string = ""): Promise<void> {
    const key = folder ? `${folder}/${fileName}` : fileName;

    try {
      const command = new DeleteObjectCommand({
        Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
        Key: key,
      });

      await r2Client.send(command);
    } catch (error) {
      console.error("Error deleting file from R2:", error);
      throw error;
    }
  },

  /**
   * List files in a folder
   */
  async listFiles(folder: string = ""): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
        Prefix: folder ? `${folder}/` : "",
      });

      const response = await r2Client.send(command);
      return (response.Contents || [])
        .map((obj) => obj.Key || "")
        .filter(Boolean);
    } catch (error) {
      console.error("Error listing files from R2:", error);
      throw error;
    }
  },

  /**
   * Get public URL for a file
   */
  getPublicUrl(fileName: string, folder: string = ""): string {
    const key = folder ? `${folder}/${fileName}` : fileName;
    return `${import.meta.env.VITE_R2_ENDPOINT}/${import.meta.env.VITE_R2_BUCKET_NAME}/${key}`;
  },
};
