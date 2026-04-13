import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Image, DollarSign, X, Check, ShieldCheck, GripVertical, FolderOpen, Music, Layers, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TIER_CONFIG, type SubscriptionTier } from "@/lib/subscription-tiers";
import { WatermarkUploader } from "./WatermarkUploader";
import { resumableUpload, formatBytes, formatEta, type UploadProgress } from "@/lib/resumable-upload";

interface UploadFile {
  id: string;
  file: File;
  type: "video" | "image" | "audio";
  title: string;
  description: string;
  price: string;
  pricingEnabled: boolean;
  watermarksEnabled: boolean;
  folderId: string | null;
  previewImage: File | null;
}

type UploadMode = "bundle" | "individual";

export const VideoUploader = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploadMode, setUploadMode] = useState<UploadMode>("bundle");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pricingEnabled, setPricingEnabled] = useState(true);
  const [watermarksEnabled, setWatermarksEnabled] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [currentFileProgress, setCurrentFileProgress] = useState<UploadProgress | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [tier, setTier] = useState<SubscriptionTier>("basic");
  const [customWatermarkUrl, setCustomWatermarkUrl] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [bundlePreviewImage, setBundlePreviewImage] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [tierRes, foldersRes] = await Promise.all([
        supabase.from("creator_profiles").select("tier").eq("user_id", user.id).single(),
        supabase.from("media_folders").select("id, name").eq("user_id", user.id).order("sort_order"),
      ]);
      if (tierRes.data?.tier) setTier(tierRes.data.tier as SubscriptionTier);
      if (foldersRes.data) setFolders(foldersRes.data);
    };
    fetchData();
  }, [user]);

  const tierConfig = TIER_CONFIG[tier];

  const getFileType = (file: File): "video" | "image" | "audio" => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/") || ["mp3", "wav", "m4a"].includes(file.name.split(".").pop()?.toLowerCase() || "")) return "audio";
    return "image";
  };

  const validateFile = (f: File): boolean => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    const isSupported = f.type.startsWith("video/") || f.type.startsWith("image/") || f.type.startsWith("audio/") || ["mp3", "wav", "m4a"].includes(ext || "");
    if (!isSupported) {
      toast.error(`"${f.name}" is not a supported file type (video, image, or audio)`);
      return false;
    }
    if (f.size > tierConfig.maxFileSize) {
      toast.error(
        `"${f.name}" exceeds your ${tierConfig.label} plan limit of ${tierConfig.maxFileSizeLabel}.`
      );
      return false;
    }
    return true;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles: UploadFile[] = [];
    for (const f of Array.from(newFiles)) {
      if (validateFile(f)) {
        const nameWithoutExt = f.name.replace(/\.[^/.]+$/, "");
        validFiles.push({
          id: crypto.randomUUID(),
          file: f,
          type: getFileType(f),
          title: nameWithoutExt,
          description: "",
          price: "",
          pricingEnabled: true,
          watermarksEnabled: true,
          folderId: null,
          previewImage: null,
        });
      }
    }
    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, [tierConfig]);

  const updateFileDetail = (id: string, field: keyof UploadFile, value: any) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const generateThumbnail = async (file: File, fileType: "video" | "image" | "audio"): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (fileType === "image") {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 480;
          const scale = Math.min(MAX / img.width, MAX / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7);
          } else {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(file);
      } else if (fileType === "video") {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.onloadeddata = () => {
          video.currentTime = Math.min(1, video.duration / 4);
        };
        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(video.videoWidth, 480);
          canvas.height = Math.min(video.videoHeight, 480);
          const scale = Math.min(480 / video.videoWidth, 480 / video.videoHeight, 1);
          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7);
          } else {
            resolve(null);
          }
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => resolve(null);
        video.src = URL.createObjectURL(file);
      } else {
        resolve(null);
      }
    });
  };

  const uploadThumbnail = async (file: File, fileType: "video" | "image" | "audio", userId: string, previewImage?: File | null): Promise<string | null> => {
    try {
      // For audio files, use the preview image if provided
      const thumbSource = fileType === "audio" && previewImage ? previewImage : file;
      const thumbType = fileType === "audio" && previewImage ? "image" as const : fileType;
      const blob = await generateThumbnail(thumbSource, thumbType);
      if (!blob) return null;
      const thumbPath = `${userId}/thumbs/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("videos")
        .upload(thumbPath, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
      if (error) {
        console.warn("Thumbnail upload failed:", error.message);
        return null;
      }
      return thumbPath;
    } catch (e) {
      console.warn("Thumbnail generation failed:", e);
      return null;
    }
  };

  const uploadFileToStorage = async (file: File, filePath: string, fileName: string): Promise<void> => {
    setCurrentFileName(fileName);
    setCurrentFileProgress(null);
    await resumableUpload({
      bucket: "videos",
      path: filePath,
      file,
      onProgress: (progress) => setCurrentFileProgress(progress),
      onError: (err) => console.error(`Upload error for ${fileName}:`, err),
    });
  };

  const uploadSingleFile = async (uploadFile: UploadFile, fileTitle: string, fileDescription: string, priceNum: number, fileWatermarks: boolean, fileFolderId: string | null) => {
    if (!user) throw new Error("Not authenticated");
    const ext = uploadFile.file.name.split(".").pop();
    const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

    await uploadFileToStorage(uploadFile.file, filePath, uploadFile.file.name);

    const thumbnailUrl = await uploadThumbnail(uploadFile.file, uploadFile.type, user.id, uploadFile.previewImage);

    const { data: videoRecord, error: dbError } = await supabase
      .from("videos")
      .insert({
        user_id: user.id,
        title: fileTitle,
        description: fileDescription || null,
        price: priceNum,
        file_path: filePath,
        file_size: uploadFile.file.size,
        status: "published",
        watermarks_enabled: fileWatermarks,
        folder_id: fileFolderId || null,
        thumbnail_url: thumbnailUrl,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to upload videos");
      navigate("/auth");
      return;
    }

    if (files.length === 0) {
      toast.error("Please add at least one file");
      return;
    }

    if (uploadMode === "bundle" && !title) {
      toast.error("Please enter a title");
      return;
    }

    if (uploadMode === "individual") {
      const missingTitle = files.find((f) => !f.title.trim());
      if (missingTitle) {
        toast.error(`Please enter a title for "${missingTitle.file.name}"`);
        return;
      }
      // Validate per-file prices
      for (const f of files) {
        if (f.pricingEnabled) {
          const p = f.price ? parseFloat(f.price) : 0;
          if (!f.price || isNaN(p) || p < 0.99) {
            toast.error(`Price for "${f.title}" must be at least $0.99 or disable pricing`);
            return;
          }
        }
      }
    }

    const priceNum = price ? parseFloat(price) : 0;
    if (uploadMode === "bundle" && price && (isNaN(priceNum) || priceNum < 0.99)) {
      toast.error("Price must be at least $0.99 or left empty for storage only");
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      if (uploadMode === "individual") {
        for (let i = 0; i < files.length; i++) {
          const uploadFile = files[i];
          const filePrice = uploadFile.pricingEnabled ? parseFloat(uploadFile.price) || 0 : 0;
          await uploadSingleFile(uploadFile, uploadFile.title, uploadFile.description, filePrice, uploadFile.watermarksEnabled, uploadFile.folderId);
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        }
        setUploadedCount(files.length);
      } else {
        // Bundle mode — original behavior
        const primaryFile = files.find((f) => f.type === "video") || files[0];
        const primaryExt = primaryFile.file.name.split(".").pop();
        const primaryPath = `${user.id}/${crypto.randomUUID()}.${primaryExt}`;

        setUploadProgress(10);
        const { error: primaryUploadError } = await supabase.storage
          .from("videos")
          .upload(primaryPath, primaryFile.file, { cacheControl: "3600", upsert: false });
        if (primaryUploadError) throw primaryUploadError;

        setUploadProgress(30);

        // Generate thumbnail: prefer bundle preview image, then image file, then video, then audio preview
        const thumbFile = files.find((f) => f.type === "image") || files.find((f) => f.type === "video") || primaryFile;
        const previewImg = bundlePreviewImage || files.find((f) => f.type === "audio" && f.previewImage)?.previewImage;
        const thumbnailUrl = previewImg
          ? await uploadThumbnail(previewImg, "image", user.id)
          : await uploadThumbnail(thumbFile.file, thumbFile.type, user.id);

        const { data: videoRecord, error: dbError } = await supabase
          .from("videos")
          .insert({
            user_id: user.id,
            title,
            description: description || null,
            price: priceNum,
            file_path: primaryPath,
            file_size: primaryFile.file.size,
            status: "published",
            watermarks_enabled: watermarksEnabled,
            folder_id: folderId || null,
            thumbnail_url: thumbnailUrl,
          })
          .select("id")
          .single();

        if (dbError || !videoRecord) throw dbError || new Error("Failed to create video record");

        setUploadProgress(45);

        const totalFiles = files.length;
        for (let i = 0; i < files.length; i++) {
          const uploadFile = files[i];
          let filePath: string;

          if (uploadFile.id === primaryFile.id) {
            filePath = primaryPath;
          } else {
            const ext = uploadFile.file.name.split(".").pop();
            filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from("videos")
              .upload(filePath, uploadFile.file, { cacheControl: "3600", upsert: false });
            if (uploadError) throw uploadError;
          }

          const { error: fileError } = await supabase
            .from("video_files")
            .insert({
              video_id: videoRecord.id,
              file_path: filePath,
              file_type: uploadFile.type,
              file_size: uploadFile.file.size,
              sort_order: i,
            });
          if (fileError) throw fileError;

          setUploadProgress(45 + Math.round(((i + 1) / totalFiles) * 50));
        }
        setUploadedCount(1);
      }

      setUploadProgress(100);
      setUploadComplete(true);
      toast.success("Content uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload content");
    } finally {
      setIsUploading(false);
    }
  };

  if (uploadComplete) {
    const listingCount = uploadMode === "individual" ? uploadedCount : 1;
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-accent" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-3">Content Uploaded Successfully!</h2>
        <p className="text-muted-foreground mb-6">
          {listingCount === 1
            ? `Your ${uploadMode === "bundle" && files.length > 1 ? `bundle "${title}" with ${files.length} files` : `listing "${uploadMode === "bundle" ? title : files[0]?.title}"`} is now live.`
            : `${listingCount} individual listings have been created and are now live.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" onClick={() => {
            setFiles([]);
            setTitle("");
            setDescription("");
            setPrice("");
            setUploadComplete(false);
            setUploadProgress(0);
            setFolderId(null);
            setUploadedCount(0);
            setBundlePreviewImage(null);
          }}>
            Upload Another
          </Button>
          <Button variant="heroOutline" onClick={() => navigate("/dashboard")}>
            View Your Content
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 max-w-2xl mx-auto">
      <h2 className="font-display text-2xl font-bold mb-6">Upload Your Content</h2>

      {/* Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 mb-4 transition-all duration-300 ${
          dragActive
            ? "border-accent bg-accent/5"
            : files.length > 0
            ? "border-accent/50 bg-accent/5"
            : "border-border hover:border-accent/50"
        }`}
      >
        <div className="text-center">
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">
            Drag and drop your videos, images & audio here
          </p>
          <p className="text-muted-foreground mb-4">or</p>
          <label>
            <input
              type="file"
              accept="video/*,image/*,audio/*,.mp3,.wav,.m4a"
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <Button type="button" variant="heroOutline" asChild>
              <span>Browse Files</span>
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-3">
            Videos, images & audio · Max per file: {tierConfig.maxFileSizeLabel} ({tierConfig.label} plan)
            {tier !== "enterprise" && (
              <> · <Link to="/pricing" className="text-accent hover:underline">Upgrade for more</Link></>
            )}
          </p>
        </div>
      </div>

      {/* Upload Mode Toggle */}
      {files.length > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-border p-4 mb-4">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-accent" />
            <div>
              <Label htmlFor="bundle-toggle" className="text-sm font-medium">Bundle as One Listing</Label>
              <p className="text-xs text-muted-foreground">
                {uploadMode === "bundle"
                  ? "All files will be grouped as a single listing"
                  : "Each file will become its own separate listing"}
              </p>
            </div>
          </div>
          <Switch
            id="bundle-toggle"
            checked={uploadMode === "bundle"}
            onCheckedChange={(checked) => setUploadMode(checked ? "bundle" : "individual")}
          />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </p>
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="rounded-lg border border-border p-3 bg-background/50"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  {uploadFile.type === "video" ? (
                    <Video className="w-5 h-5 text-accent" />
                  ) : uploadFile.type === "audio" ? (
                    <Music className="w-5 h-5 text-accent" />
                  ) : (
                    <Image className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadFile.file.size / (1024 * 1024)).toFixed(2)} MB · {uploadFile.type}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(uploadFile.id)}
                  className="shrink-0 h-8 w-8"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Individual settings per file */}
              {uploadMode === "individual" && (
                <div className="mt-3 pl-[52px] space-y-3">
                  <Input
                    value={uploadFile.title}
                    onChange={(e) => updateFileDetail(uploadFile.id, "title", e.target.value)}
                    placeholder="Title *"
                    className="bg-background/50 h-9 text-sm"
                    disabled={isUploading}
                    required
                  />
                  <Textarea
                    value={uploadFile.description}
                    onChange={(e) => updateFileDetail(uploadFile.id, "description", e.target.value)}
                    placeholder="Description (optional)"
                    className="bg-background/50 min-h-[60px] text-sm"
                    disabled={isUploading}
                  />

                  {/* Per-file pricing */}
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-accent" />
                      <Label className="text-xs font-medium">Set a Price</Label>
                    </div>
                    <Switch
                      checked={uploadFile.pricingEnabled}
                      onCheckedChange={(checked) => {
                        updateFileDetail(uploadFile.id, "pricingEnabled", checked);
                        if (!checked) updateFileDetail(uploadFile.id, "price", "");
                      }}
                      disabled={isUploading}
                    />
                  </div>
                  {uploadFile.pricingEnabled && (
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0.99"
                        step="0.01"
                        value={uploadFile.price}
                        onChange={(e) => updateFileDetail(uploadFile.id, "price", e.target.value)}
                        placeholder="9.99"
                        className="bg-background/50 pl-9 h-9 text-sm"
                        disabled={isUploading}
                      />
                    </div>
                  )}

                  {/* Per-file watermark */}
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-accent" />
                      <Label className="text-xs font-medium">Watermark Protection</Label>
                    </div>
                    <Switch
                      checked={uploadFile.watermarksEnabled}
                      onCheckedChange={(checked) => updateFileDetail(uploadFile.id, "watermarksEnabled", checked)}
                      disabled={isUploading}
                    />
                  </div>

                  {/* Per-file folder */}
                  {folders.length > 0 && (
                    <Select value={uploadFile.folderId || "none"} onValueChange={(v) => updateFileDetail(uploadFile.id, "folderId", v === "none" ? null : v)}>
                      <SelectTrigger className="bg-background/50 h-9 text-sm">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-muted-foreground" />
                          <SelectValue placeholder="No folder" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Preview image for audio files */}
                  {uploadFile.type === "audio" && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-accent" />
                        <Label className="text-xs font-medium">Preview Image (optional)</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">Add cover art or imagery for your audio</p>
                      {uploadFile.previewImage ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={URL.createObjectURL(uploadFile.previewImage)}
                            alt="Preview"
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{uploadFile.previewImage.name}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateFileDetail(uploadFile.id, "previewImage", null)}
                            disabled={isUploading}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <label>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const img = e.target.files?.[0];
                              if (img) updateFileDetail(uploadFile.id, "previewImage", img);
                              e.target.value = "";
                            }}
                            disabled={isUploading}
                          />
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span className="text-xs">Choose Image</span>
                          </Button>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uploading {files.length} file{files.length !== 1 ? "s" : ""}...</span>
            <span className="text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Preview image for bundle with audio files */}
      {uploadMode === "bundle" && files.some((f) => f.type === "audio") && (
        <div className="rounded-lg border border-border p-4 mb-4 space-y-2">
          <div className="flex items-center gap-3">
            <Image className="w-5 h-5 text-accent" />
            <div>
              <Label className="text-sm font-medium">Preview Image (optional)</Label>
              <p className="text-xs text-muted-foreground">Add cover art or imagery for your audio content</p>
            </div>
          </div>
          {bundlePreviewImage ? (
            <div className="flex items-center gap-3 mt-2">
              <img
                src={URL.createObjectURL(bundlePreviewImage)}
                alt="Preview"
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{bundlePreviewImage.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(bundlePreviewImage.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setBundlePreviewImage(null)}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <label className="mt-2 inline-block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const img = e.target.files?.[0];
                  if (img) setBundlePreviewImage(img);
                  e.target.value = "";
                }}
                disabled={isUploading}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <span>Choose Image</span>
              </Button>
            </label>
          )}
        </div>
      )}

      {/* Details */}
      <div className="space-y-4">
        {/* Shared title/description for bundle mode */}
        {uploadMode === "bundle" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                {files.length > 1 ? "Bundle Title *" : "Title *"}
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={files.length > 1 ? "Enter a title for your content bundle" : "Enter a title for your content"}
                className="bg-background/50"
                disabled={isUploading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell buyers what they'll get..."
                className="bg-background/50 min-h-[100px]"
                disabled={isUploading}
              />
            </div>
          </>
        )}

        {uploadMode !== "individual" && folders.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Folder (optional)</label>
            <Select value={folderId || "none"} onValueChange={(v) => setFolderId(v === "none" ? null : v)}>
              <SelectTrigger className="bg-background/50">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="No folder" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {uploadMode !== "individual" && (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-accent" />
                <div>
                  <Label htmlFor="pricing-toggle" className="text-sm font-medium">Set a Price</Label>
                  <p className="text-xs text-muted-foreground">Disable to use as storage only (not for sale)</p>
                </div>
              </div>
              <Switch
                id="pricing-toggle"
                checked={pricingEnabled}
                onCheckedChange={(checked) => {
                  setPricingEnabled(checked);
                  if (!checked) setPrice("");
                }}
                disabled={isUploading}
              />
            </div>

            {pricingEnabled && (
              <div>
                <label className="block text-sm font-medium mb-2">Price (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0.99"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="9.99"
                    className="bg-background/50 pl-10"
                    disabled={isUploading}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <div>
                  <Label htmlFor="watermarks" className="text-sm font-medium">Watermark Protection</Label>
                  <p className="text-xs text-muted-foreground">Overlay watermarks on video previews to deter piracy</p>
                </div>
              </div>
              <Switch
                id="watermarks"
                checked={watermarksEnabled}
                onCheckedChange={setWatermarksEnabled}
                disabled={isUploading}
              />
            </div>

            {watermarksEnabled && (
              <WatermarkUploader onWatermarkUrl={setCustomWatermarkUrl} />
            )}
          </>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="premium"
        size="xl"
        className="w-full mt-8"
        disabled={isUploading || files.length === 0 || (uploadMode === "bundle" && !title)}
      >
        <Upload className="w-5 h-5" />
        {isUploading
          ? "Uploading..."
          : uploadMode === "individual" && files.length > 1
          ? `Upload ${files.length} Listings`
          : files.length > 1
          ? "Upload Bundle"
          : "Upload Content"}
      </Button>

      {!user && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          You must be signed in to upload content.
        </p>
      )}
    </form>
  );
};
