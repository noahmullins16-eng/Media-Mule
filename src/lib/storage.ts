import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabase } from "@/integrations/supabase/client";

export interface MultipartUploadProgressInfo {
  percent: number;
  loaded: number;
  total: number;
  speed: number; // MB/s
  eta: number; // seconds
}

export type MultipartUploadState = "idle" | "uploading" | "paused" | "completed" | "error" | "retrying";

export interface MultipartUploadOptions {
  onProgress?: (progress: MultipartUploadProgressInfo) => void;
  onStateChange?: (state: MultipartUploadState) => void;
  concurrency?: number;
  chunkSize?: number;
}

export class MultipartUploader {
  private file: File;
  private fileName: string;
  private folder: string;
  private options: MultipartUploadOptions;

  private uploadId: string | null = null;
  private key: string | null = null;
  private state: MultipartUploadState = "idle";

  private activeControllers: Map<number, XMLHttpRequest> = new Map();
  private uploadedParts: { PartNumber: number; ETag: string }[] = [];

  private loadedBytes: Map<number, number> = new Map();
  private chunkSize: number;
  private totalParts: number;
  private totalBytes: number;

  private startTime: number = 0;
  private totalUploadedBeforeCurrentRun: number = 0;

  constructor(file: File, fileName: string, folder: string, options: MultipartUploadOptions = {}) {
    this.file = file;
    this.fileName = fileName;
    this.folder = folder;
    this.options = options;
    this.totalBytes = file.size;

    // Optimize chunk size dynamically (5MB–50MB depending on file size)
    if (options.chunkSize) {
      this.chunkSize = options.chunkSize;
    } else if (this.totalBytes <= 100 * 1024 * 1024) {
      this.chunkSize = 5 * 1024 * 1024; // 5MB
    } else if (this.totalBytes <= 1024 * 1024 * 1024) {
      this.chunkSize = 10 * 1024 * 1024; // 10MB
    } else if (this.totalBytes <= 5 * 1024 * 1024 * 1024) {
      this.chunkSize = 25 * 1024 * 1024; // 25MB
    } else {
      this.chunkSize = 50 * 1024 * 1024; // 50MB
    }

    this.totalParts = Math.ceil(this.totalBytes / this.chunkSize);

    // Look for existing session in localStorage for resumption
    const fileSignature = `mp-upload:${this.file.name}-${this.file.size}-${this.file.lastModified}`;
    const storedSession = localStorage.getItem(fileSignature);
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        this.uploadId = session.uploadId;
        this.key = session.key;
        this.chunkSize = session.chunkSize || this.chunkSize;
        this.totalParts = Math.ceil(this.totalBytes / this.chunkSize);
        console.log("Found existing upload session in localStorage, ready to resume:", {
          uploadId: this.uploadId,
          key: this.key,
        });
      } catch (e) {
        console.warn("Failed to parse stored upload session:", e);
      }
    }
  }

  public getUploadId(): string | null {
    return this.uploadId;
  }

  public getKey(): string | null {
    return this.key;
  }

  public getState(): MultipartUploadState {
    return this.state;
  }

  public pause(): void {
    if (this.state !== "uploading" && this.state !== "retrying") return;
    
    console.log("⏸️ Pausing upload...");
    this.state = "paused";
    if (this.options.onStateChange) {
      this.options.onStateChange("paused");
    }

    // Abort active XHR requests
    for (const xhr of this.activeControllers.values()) {
      try {
        xhr.abort();
      } catch (e) {
        console.warn("Failed to abort XHR:", e);
      }
    }
    this.activeControllers.clear();
    this.loadedBytes.clear();
    this.updateProgress();
  }

  public async abort(): Promise<void> {
    console.log("🗑️ Aborting upload entirely...");
    const oldState = this.state;
    this.state = "idle";
    
    // Abort active XHR requests first
    for (const xhr of this.activeControllers.values()) {
      try {
        xhr.abort();
      } catch (e) {
        console.warn("Failed to abort XHR:", e);
      }
    }
    this.activeControllers.clear();
    this.loadedBytes.clear();

    if (this.uploadId && this.key) {
      try {
        await supabase.functions.invoke("generate-r2-url", {
          body: {
            action: "abort-multipart",
            uploadId: this.uploadId,
            key: this.key,
          },
        });
      } catch (e) {
        console.warn("Failed to notify backend of aborted multipart upload:", e);
      }
    }

    const fileSignature = `mp-upload:${this.file.name}-${this.file.size}-${this.file.lastModified}`;
    localStorage.removeItem(fileSignature);

    this.uploadId = null;
    this.key = null;
    this.uploadedParts = [];
    this.totalUploadedBeforeCurrentRun = 0;

    if (this.options.onStateChange) {
      this.options.onStateChange("idle");
    }
  }

  public async start(): Promise<string> {
    if (this.state === "uploading" || this.state === "completed") {
      throw new Error(`Upload is already in state: ${this.state}`);
    }

    console.log("🚀 Starting upload flow...");
    this.state = "uploading";
    if (this.options.onStateChange) {
      this.options.onStateChange("uploading");
    }

    this.startTime = Date.now();

    try {
      // 1. Initiate upload if not already created
      if (!this.uploadId) {
        console.log("Initiating new Multipart upload on server...");
        const { data, error } = await supabase.functions.invoke("generate-r2-url", {
          body: {
            action: "initiate-multipart",
            fileName: this.fileName,
            folder: this.folder,
            contentType: this.file.type || "application/octet-stream",
            fileSize: this.totalBytes,
            chunkSize: this.chunkSize,
          },
        });

        if (error || !data?.uploadId) {
          throw new Error(data?.error || error?.message || "Failed to initiate multipart upload");
        }

        this.uploadId = data.uploadId;
        this.key = data.key;

        // Save session in localStorage
        const fileSignature = `mp-upload:${this.file.name}-${this.file.size}-${this.file.lastModified}`;
        localStorage.setItem(
          fileSignature,
          JSON.stringify({
            uploadId: this.uploadId,
            key: this.key,
            chunkSize: this.chunkSize,
            fileName: this.fileName,
            folder: this.folder,
          })
        );
      } else {
        // Resuming: Get currently completed parts from Cloudflare R2
        console.log("Fetching completed parts from server to resume...");
        const { data, error } = await supabase.functions.invoke("generate-r2-url", {
          body: {
            action: "list-parts",
            uploadId: this.uploadId,
            key: this.key,
          },
        });

        if (!error && data?.parts) {
          const partsList = data.parts as { PartNumber: number; ETag: string }[];
          this.uploadedParts = partsList.map((p) => ({
            PartNumber: p.PartNumber,
            ETag: p.ETag,
          }));
          console.log(`Resumed upload: ${this.uploadedParts.length} parts already uploaded.`);
        } else {
          console.warn("Failed to fetch completed parts, starting from scratch...", error);
          this.uploadedParts = [];
        }
      }

      // Calculate how many bytes were already uploaded in past runs
      let completedBytes = 0;
      const completedPartNumbers = new Set(this.uploadedParts.map((p) => p.PartNumber));
      for (let partNum = 1; partNum <= this.totalParts; partNum++) {
        if (completedPartNumbers.has(partNum)) {
          const isLastPart = partNum === this.totalParts;
          const partSize = isLastPart
            ? this.totalBytes - (this.totalParts - 1) * this.chunkSize
            : this.chunkSize;
          completedBytes += partSize;
        }
      }
      this.totalUploadedBeforeCurrentRun = completedBytes;

      this.updateProgress();

      // 2. Upload remaining parts in parallel
      await this.uploadAllParts();

      if (this.state !== "uploading") {
        throw new Error("Upload paused or stopped");
      }

      // 3. Complete multipart upload on R2
      console.log("All chunks uploaded successfully. Completing multipart session...");
      const { data: completeData, error: completeError } = await supabase.functions.invoke("generate-r2-url", {
        body: {
          action: "complete-multipart",
          uploadId: this.uploadId,
          key: this.key,
          parts: this.uploadedParts,
        },
      });

      if (completeError || !completeData?.success) {
        throw new Error(completeData?.error || completeError?.message || "Failed to complete upload");
      }

      // Clean session from localStorage
      const fileSignature = `mp-upload:${this.file.name}-${this.file.size}-${this.file.lastModified}`;
      localStorage.removeItem(fileSignature);

      this.state = "completed";
      if (this.options.onStateChange) {
        this.options.onStateChange("completed");
      }

      return completeData.publicUrl;
    } catch (err: unknown) {
      if (this.state === "uploading" || this.state === "retrying") {
        this.state = "error";
        if (this.options.onStateChange) {
          this.options.onStateChange("error");
        }
      }
      throw err;
    }
  }

  private async uploadAllParts(): Promise<void> {
    const remainingParts: number[] = [];
    const completedPartNumbers = new Set(this.uploadedParts.map((p) => p.PartNumber));

    for (let partNum = 1; partNum <= this.totalParts; partNum++) {
      if (!completedPartNumbers.has(partNum)) {
        remainingParts.push(partNum);
      }
    }

    if (remainingParts.length === 0) return;

    const concurrency = this.options.concurrency || 3;
    let index = 0;

    // Define worker function to consume queue in parallel
    const worker = async () => {
      while (index < remainingParts.length && this.state === "uploading") {
        const partNum = remainingParts[index++];
        await this.uploadPartWithRetry(partNum);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, remainingParts.length) }, worker);
    await Promise.all(workers);
  }

  private async uploadPartWithRetry(partNum: number, attempt = 1): Promise<void> {
    if (this.state !== "uploading") return;

    try {
      await this.uploadPart(partNum);
    } catch (err: unknown) {
      console.warn(`[Uploader] Chunk ${partNum} failed (Attempt ${attempt}/3):`, err);

      if (this.state !== "uploading") return;

      if (attempt < 3) {
        if (this.options.onStateChange) {
          this.options.onStateChange("retrying");
        }
        // Wait with backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        
        // Re-check state after delay before retrying
        if (this.state === "retrying" && this.options.onStateChange) {
          this.options.onStateChange("uploading");
        }
        
        return this.uploadPartWithRetry(partNum, attempt + 1);
      } else {
        throw err;
      }
    }
  }

  private uploadPart(partNum: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.state !== "uploading") {
        reject(new Error("Upload not in active state"));
        return;
      }

      const executeUpload = async () => {
        const start = (partNum - 1) * this.chunkSize;
        const end = Math.min(this.totalBytes, start + this.chunkSize);
        const chunk = this.file.slice(start, end);

        // Get signed URL for this part from the backend
        const { data, error } = await supabase.functions.invoke("generate-r2-url", {
          body: {
            action: "get-upload-part-url",
            uploadId: this.uploadId,
            key: this.key,
            partNumber: partNum,
          },
        });

        if (error || !data?.uploadUrl) {
          throw new Error(data?.error || error?.message || "Failed to generate chunk signed URL");
        }

        const uploadUrl = data.uploadUrl;
        const xhr = new XMLHttpRequest();

        this.activeControllers.set(partNum, xhr);

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", this.file.type || "application/octet-stream");

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            this.loadedBytes.set(partNum, event.loaded);
            this.updateProgress();
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader("ETag");
            if (!etag) {
              reject(new Error(`No ETag returned from storage for chunk ${partNum}`));
              return;
            }

            const cleanETag = etag.replace(/"/g, ""); // strip quotes
            this.uploadedParts.push({
              PartNumber: partNum,
              ETag: cleanETag,
            });

            this.loadedBytes.delete(partNum);
            this.activeControllers.delete(partNum);
            this.updateProgress();
            resolve();
          } else {
            reject(new Error(`Chunk upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          this.activeControllers.delete(partNum);
          reject(new Error("Network error uploading chunk"));
        });

        xhr.addEventListener("abort", () => {
          this.activeControllers.delete(partNum);
          reject(new Error("Chunk upload aborted"));
        });

        xhr.send(chunk);
      };

      executeUpload().catch((err: unknown) => {
        reject(err);
      });
    });
  }

  private updateProgress(): void {
    if (!this.options.onProgress) return;

    let completedBytes = 0;
    const completedPartNumbers = new Set(this.uploadedParts.map((p) => p.PartNumber));

    for (let partNum = 1; partNum <= this.totalParts; partNum++) {
      if (completedPartNumbers.has(partNum)) {
        const isLastPart = partNum === this.totalParts;
        const partSize = isLastPart
          ? this.totalBytes - (this.totalParts - 1) * this.chunkSize
          : this.chunkSize;
        completedBytes += partSize;
      } else {
        completedBytes += this.loadedBytes.get(partNum) || 0;
      }
    }

    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const bytesUploadedThisSession = completedBytes - this.totalUploadedBeforeCurrentRun;

    let speed = 0; // MB/s
    let eta = 0; // seconds

    if (elapsedSeconds > 0 && bytesUploadedThisSession > 0) {
      speed = bytesUploadedThisSession / elapsedSeconds / (1024 * 1024);
      const remainingBytes = this.totalBytes - completedBytes;
      eta = speed > 0 ? remainingBytes / (speed * 1024 * 1024) : 0;
    }

    const percent = Math.min(100, Math.round((completedBytes / this.totalBytes) * 1000) / 10);

    this.options.onProgress({
      percent,
      loaded: completedBytes,
      total: this.totalBytes,
      speed: Number(speed.toFixed(2)),
      eta: Math.max(0, Math.round(eta)),
    });
  }
}

export const storage = {
  // Legacy single-part upload for small files (like watermarks)
  async uploadFile(
    file: File | Blob,
    fileName: string,
    folder: string = ""
  ): Promise<string> {
    try {
      console.log("📤 [Storage] Requesting presigned PUT URL from Edge Function", { fileName, folder, type: file.type });

      // Call Edge Function to get presigned URL
      const { data, error } = await supabase.functions.invoke("generate-r2-url", {
        body: {
          fileName,
          folder,
          action: "upload",
          contentType: file.type || "application/octet-stream",
        },
      });

      let parsedData = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse response data as JSON:", e);
        }
      }

      if (error || !parsedData?.uploadUrl) {
        console.error("❌ [Storage] Presigned URL generation failed", error, parsedData);
        throw new Error(parsedData?.error || error?.message || "Failed to generate presigned URL");
      }

      const { uploadUrl, publicUrl } = parsedData;
      console.log("🔗 [Storage] Successfully generated presigned PUT URL", { uploadUrl, publicUrl });

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("❌ [Storage] R2 upload request failed", {
          status: response.statusText,
          statusCode: response.status,
          error: errorBody,
        });
        throw new Error(`R2 upload failed (${response.status}): ${response.statusText}. ${errorBody.slice(0, 200)}`);
      }

      console.log("✅ [Storage] Upload to R2 successful", { publicUrl });
      return publicUrl;
    } catch (error: unknown) {
      console.warn("⚠️ [Storage] R2 upload failed, falling back to Supabase Storage...", error);
      try {
        const targetPath = folder ? `${folder}/${fileName}` : fileName;
        const bucketName = targetPath.startsWith("watermarks/") ? "watermarks" : "videos";
        const cleanPath = targetPath.startsWith("watermarks/") ? targetPath.replace("watermarks/", "") : targetPath;

        console.log(`📤 [Storage] Uploading to Supabase Storage fallback: bucket='${bucketName}', path='${cleanPath}'`);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(cleanPath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: true,
          });

        if (uploadError) {
          console.error("❌ [Storage] Supabase Storage fallback upload failed:", uploadError);
          throw uploadError;
        }

        console.log("✅ [Storage] Supabase Storage fallback upload successful", uploadData);

        if (bucketName === "watermarks") {
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(cleanPath);
          return publicUrl;
        }

        return cleanPath;
      } catch (fallbackError: unknown) {
        const fallbackErr = fallbackError as Error;
        console.error("❌ [Storage] Both R2 and Supabase Storage uploads failed:", fallbackErr);
        throw new Error(`Upload failed: ${fallbackErr.message || fallbackErr}`);
      }
    }
  },

  // Create instanced multipart uploader
  createMultipartUploader(
    file: File,
    fileName: string,
    folder: string = "",
    options: MultipartUploadOptions = {}
  ): MultipartUploader {
    return new MultipartUploader(file, fileName, folder, options);
  },

  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    if (!filePath) return "";
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;

    try {
      console.log("🔑 [Storage] Requesting signed GET URL", { filePath, expiresIn });

      const { data, error } = await supabase.functions.invoke("generate-r2-url", {
        body: {
          fileName: filePath,
          folder: "",
          action: "download",
          expiresIn,
        },
      });

      let parsedData = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse response data as JSON:", e);
        }
      }

      if (error || !parsedData?.signedUrl) {
        console.warn("⚠️ [Storage] Signed GET URL generation failed, trying client-side signing fallback...", error, parsedData);
        return await this.clientSideSignUrl(filePath, expiresIn);
      }

      console.log("✅ [Storage] Successfully generated signed GET URL via Edge Function");
      return parsedData.signedUrl;
    } catch (error) {
      console.warn("⚠️ [Storage] Edge Function signing threw error, trying client-side signing fallback...", error);
      try {
        return await this.clientSideSignUrl(filePath, expiresIn);
      } catch (fallbackError) {
        console.error("❌ [Storage] Client-side fallback signing also failed:", fallbackError);
        throw error;
      }
    }
  },

  async clientSideSignUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    console.log("🔑 [Storage] Generating signed GET URL on client-side...");
    
    // Dynamic import to prevent bundler bloating
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl: getR2SignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
    const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
      console.error("❌ [Storage] Client-side R2 configurations are missing. Cannot sign URL.");
      throw new Error("Missing client-side R2 configurations for fallback signing");
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filePath,
    });

    const signedUrl = await getR2SignedUrl(s3Client, command, { expiresIn });
    console.log("✅ [Storage] Successfully generated signed GET URL via client-side fallback");
    return signedUrl;
  },

  async deleteFile(filePath: string): Promise<void> {
    try {
      console.log("🗑️ [Storage] Requesting object deletion from R2", { filePath });

      const { data, error } = await supabase.functions.invoke("generate-r2-url", {
        body: {
          fileName: filePath,
          folder: "",
          action: "delete",
        },
      });

      let parsedData = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse response data as JSON:", e);
        }
      }

      if (error || !parsedData?.success) {
        console.error("❌ [Storage] R2 delete failed", error, parsedData);
        throw new Error(parsedData?.error || error?.message || "Failed to delete file from R2");
      }

      console.log("✅ [Storage] Successfully deleted object from R2", { filePath });
    } catch (error) {
      console.error("❌ [Storage] Delete process error", error);
      throw error;
    }
  },

  getPublicUrl(fileName: string, folder: string = ""): string {
    const key = folder ? `${folder}/${fileName}` : fileName;
    const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
    const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
  },
};
