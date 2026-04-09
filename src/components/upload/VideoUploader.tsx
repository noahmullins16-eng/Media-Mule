import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Image, DollarSign, X, Check, ShieldCheck, GripVertical, FolderOpen, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TIER_CONFIG, type SubscriptionTier } from "@/lib/subscription-tiers";
import { WatermarkUploader } from "./WatermarkUploader";

interface UploadFile {
  id: string;
  file: File;
  type: "video" | "image" | "audio";
}

export const VideoUploader = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pricingEnabled, setPricingEnabled] = useState(true);
  const [watermarksEnabled, setWatermarksEnabled] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>("basic");
  const [customWatermarkUrl, setCustomWatermarkUrl] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);

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
    if (file.type.startsWith("audio/")) return "audio";
    return "image";
  };

  const validateFile = (f: File): boolean => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    const isSupported = f.type.startsWith("video/") || f.type.startsWith("image/") || f.type.startsWith("audio/") || ["mp3", "wav"].includes(ext || "");
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
        validFiles.push({
          id: crypto.randomUUID(),
          file: f,
          type: getFileType(f),
        });
      }
    }
    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, [tierConfig]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to upload videos");
      navigate("/auth");
      return;
    }

    if (files.length === 0 || !title) {
      toast.error("Please add at least one file and a title");
      return;
    }

    const priceNum = price ? parseFloat(price) : 0;
    if (price && (isNaN(priceNum) || priceNum < 0.99)) {
      toast.error("Price must be at least $0.99 or left empty for storage only");
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      // Use the first video file as the main file_path, or first image if no videos
      const primaryFile = files.find((f) => f.type === "video") || files[0];
      const primaryExt = primaryFile.file.name.split(".").pop();
      const primaryPath = `${user.id}/${crypto.randomUUID()}.${primaryExt}`;

      // Upload primary file first
      setUploadProgress(10);
      const { error: primaryUploadError } = await supabase.storage
        .from("videos")
        .upload(primaryPath, primaryFile.file, { cacheControl: "3600", upsert: false });
      if (primaryUploadError) throw primaryUploadError;

      setUploadProgress(30);

      // Create video record
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
        })
        .select("id")
        .single();

      if (dbError || !videoRecord) throw dbError || new Error("Failed to create video record");

      setUploadProgress(45);

      // Upload all files and create video_files records
      const totalFiles = files.length;
      for (let i = 0; i < files.length; i++) {
        const uploadFile = files[i];
        let filePath: string;

        if (uploadFile.id === primaryFile.id) {
          // Primary file already uploaded
          filePath = primaryPath;
        } else {
          const ext = uploadFile.file.name.split(".").pop();
          filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("videos")
            .upload(filePath, uploadFile.file, { cacheControl: "3600", upsert: false });
          if (uploadError) throw uploadError;
        }

        // Insert into video_files
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
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-accent" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-3">Content Uploaded Successfully!</h2>
        <p className="text-muted-foreground mb-6">
          Your bundle "{title}" with {files.length} file{files.length !== 1 ? "s" : ""} is now live at ${price}.
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
          }}>
            Upload Another
          </Button>
          <Button variant="heroOutline" onClick={() => navigate("/my-media")}>
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
              accept="video/*,image/*,audio/*,.mp3,.wav"
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

      {/* File List */}
      {files.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </p>
          {files.map((uploadFile, index) => (
            <div
              key={uploadFile.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3 bg-background/50"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                {uploadFile.type === "video" ? (
                  <Video className="w-5 h-5 text-accent" />
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

      {/* Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Bundle Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your content bundle"
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

        {folders.length > 0 && (
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
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="premium"
        size="xl"
        className="w-full mt-8"
        disabled={isUploading || files.length === 0 || !title}
      >
        <Upload className="w-5 h-5" />
        {isUploading ? "Uploading..." : `Upload ${files.length > 1 ? "Bundle" : "Content"}`}
      </Button>

      {!user && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          You must be signed in to upload content.
        </p>
      )}
    </form>
  );
};
