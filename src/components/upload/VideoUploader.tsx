import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Image, DollarSign, X, Check, ShieldCheck, GripVertical, FolderOpen, Music, Layers, FileText, Play, Pause, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TIER_CONFIG, type SubscriptionTier } from "@/lib/subscription-tiers";
import { WatermarkUploader } from "./WatermarkUploader";
import { storage, MultipartUploader, type MultipartUploadState, type MultipartUploadProgressInfo } from "@/lib/storage";

interface UploadFile {
  id: string;
  file: File;
  type: "video" | "image" | "audio";
  title: string;
  description: string;
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
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [tier, setTier] = useState<SubscriptionTier>("basic");
  const [customWatermarkUrl, setCustomWatermarkUrl] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);

  // Multipart Progress States
  const [uploadState, setUploadState] = useState<MultipartUploadState>("idle");
  const [uploadProgressInfo, setUploadProgressInfo] = useState<MultipartUploadProgressInfo>({
    percent: 0,
    loaded: 0,
    total: 0,
    speed: 0,
    eta: 0,
  });
  const [currentUploadingName, setCurrentUploadingName] = useState("");

  const currentFileIndexRef = useRef(0);
  const uploadedUrlsRef = useRef<string[]>([]);
  const uploaderRef = useRef<MultipartUploader | null>(null);

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
    if (file.type.startsWith("audio/") || ["mp3", "wav"].includes(file.name.split(".").pop()?.toLowerCase() || "")) return "audio";
    return "image";
  };

  const validateFile = useCallback((f: File): boolean => {
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
  }, [tierConfig]);

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
        });
      }
    }
    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, [validateFile]);

  const updateFileDetail = (id: string, field: "title" | "description", value: string) => {
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

  const runUploadLoop = async () => {
    let authUser = null;
    try {
      const { data } = await supabase.auth.getUser();
      authUser = data?.user;
    } catch (err) {
      console.warn("Fresh auth check failed, falling back to cached user state:", err);
    }

    if (!authUser) {
      authUser = user;
    }

    if (!authUser) {
      toast.error("Not authenticated");
      return;
    }

    setUploadState("uploading");
    setIsUploading(true);

    try {
      if (uploadMode === "individual") {
        // Individual Listings Mode
        while (currentFileIndexRef.current < files.length) {
          const index = currentFileIndexRef.current;
          const uploadFile = files[index];
          setCurrentUploadingName(uploadFile.file.name);

          const ext = uploadFile.file.name.split(".").pop();
          const uniqueFileName = `${crypto.randomUUID()}.${ext}`;
          const folderPath = `${authUser.id}`;

          // Create and reference uploader instance
          const uploader = storage.createMultipartUploader(
            uploadFile.file,
            uniqueFileName,
            folderPath,
            {
              onProgress: (info) => {
                setUploadProgressInfo(info);
              },
              onStateChange: (state) => {
                setUploadState(state);
              }
            }
          );
          uploaderRef.current = uploader;

          // Start uploading (waits until chunk upload loop completes)
          let storageUrl;
          try {
            storageUrl = await uploader.start();
          } catch (multipartError) {
            console.warn("Multipart R2 upload failed, trying standard upload fallback...", multipartError);
            storageUrl = await storage.uploadFile(
              uploadFile.file,
              uniqueFileName,
              folderPath
            );
          }
          uploaderRef.current = null;

          const priceNum = price ? parseFloat(price) : 0;
          
          // Write metadata ONLY after completion
          const { data: videoRecord, error: dbError } = await supabase
            .from("videos")
            .insert({
              user_id: authUser.id,
              title: uploadFile.title,
              description: uploadFile.description || null,
              price: priceNum,
              file_path: `${folderPath}/${uniqueFileName}`,
              file_size: uploadFile.file.size,
              status: "published",
              watermarks_enabled: watermarksEnabled,
              folder_id: folderId || null,
              r2_url: storageUrl,
            })
            .select("id")
            .single();

          if (dbError || !videoRecord) throw dbError || new Error("Failed to create record");

          const { error: fileError } = await supabase
            .from("video_files")
            .insert({
              video_id: videoRecord.id,
              file_path: `${folderPath}/${uniqueFileName}`,
              file_type: uploadFile.type,
              file_size: uploadFile.file.size,
              sort_order: 0,
              storage_url: storageUrl,
            });
          if (fileError) throw fileError;

          currentFileIndexRef.current += 1;
        }

        setUploadedCount(files.length);
        setUploadComplete(true);
        toast.success("All individual content uploaded successfully!");
      } else {
        // Bundle Mode
        const primaryFile = files.find((f) => f.type === "video") || files[0];
        
        if (uploadedUrlsRef.current.length === 0) {
          uploadedUrlsRef.current = new Array(files.length).fill("");
        }

        while (currentFileIndexRef.current < files.length) {
          const index = currentFileIndexRef.current;
          const uploadFile = files[index];
          
          if (uploadedUrlsRef.current[index]) {
            currentFileIndexRef.current += 1;
            continue;
          }

          setCurrentUploadingName(uploadFile.file.name);

          const ext = uploadFile.file.name.split(".").pop();
          const uniqueFileName = `${crypto.randomUUID()}.${ext}`;
          const folderPath = authUser.id;

          const uploader = storage.createMultipartUploader(
            uploadFile.file,
            uniqueFileName,
            folderPath,
            {
              onProgress: (info) => {
                setUploadProgressInfo(info);
              },
              onStateChange: (state) => {
                setUploadState(state);
              }
            }
          );
          uploaderRef.current = uploader;

          let storageUrl;
          try {
            storageUrl = await uploader.start();
          } catch (multipartError) {
            console.warn("Multipart R2 upload failed, trying standard upload fallback...", multipartError);
            storageUrl = await storage.uploadFile(
              uploadFile.file,
              uniqueFileName,
              folderPath
            );
          }
          uploaderRef.current = null;

          uploadedUrlsRef.current[index] = storageUrl;
          currentFileIndexRef.current += 1;
        }

        // Complete Multipart flow successfully, write metadata
        const priceNum = price ? parseFloat(price) : 0;
        const primaryIndex = files.indexOf(primaryFile);
        const primaryUrl = uploadedUrlsRef.current[primaryIndex];
        const primaryFileName = primaryUrl.split("/").pop()!;
        const primaryPath = `${authUser.id}/${primaryFileName}`;

        const { data: videoRecord, error: dbError } = await supabase
          .from("videos")
          .insert({
            user_id: authUser.id,
            title,
            description: description || null,
            price: priceNum,
            file_path: primaryPath,
            file_size: primaryFile.file.size,
            status: "published",
            watermarks_enabled: watermarksEnabled,
            folder_id: folderId || null,
            r2_url: primaryUrl,
          })
          .select("id")
          .single();

        if (dbError || !videoRecord) throw dbError || new Error("Failed to create video record");

        for (let i = 0; i < files.length; i++) {
          const uploadFile = files[i];
          const storageUrl = uploadedUrlsRef.current[i];
          const fileName = storageUrl.split("/").pop()!;
          const filePath = `${authUser.id}/${fileName}`;

          const { error: fileError } = await supabase
            .from("video_files")
            .insert({
              video_id: videoRecord.id,
              file_path: filePath,
              file_type: uploadFile.type,
              file_size: uploadFile.file.size,
              sort_order: i,
              storage_url: storageUrl,
            });
          if (fileError) throw fileError;
        }

        setUploadedCount(1);
        setUploadComplete(true);
        toast.success("Content bundle uploaded successfully!");
      }
    } catch (err: unknown) {
      const errorObject = err as Error;
      if (errorObject.message === "Upload aborted" || errorObject.message === "Chunk upload aborted" || errorObject.message === "Upload paused") {
        console.log("Upload execution loop paused.");
      } else {
        console.error("Upload loop error:", err);
        setUploadState("error");
        toast.error(errorObject.message || "Failed to upload content");
      }
    }
  };

  const handlePause = () => {
    if (uploaderRef.current) {
      uploaderRef.current.pause();
    }
  };

  const handleResume = async () => {
    await runUploadLoop();
  };

  const handleAbort = async () => {
    if (!confirm("Are you sure you want to cancel the upload? This will lose all progress on the current file.")) return;
    
    if (uploaderRef.current) {
      await uploaderRef.current.abort();
    }

    currentFileIndexRef.current = 0;
    uploadedUrlsRef.current = [];
    setIsUploading(false);
    setUploadState("idle");
    setUploadProgressInfo({
      percent: 0,
      loaded: 0,
      total: 0,
      speed: 0,
      eta: 0,
    });
  };

  const formatETA = (seconds: number) => {
    if (seconds === 0 || !isFinite(seconds)) return "Calculating...";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
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
    }

    const priceNum = price ? parseFloat(price) : 0;
    if (price && (isNaN(priceNum) || priceNum < 0.99)) {
      toast.error("Price must be at least $0.99 or left empty for storage only");
      return;
    }

    // Reset trackers
    currentFileIndexRef.current = 0;
    uploadedUrlsRef.current = [];
    uploaderRef.current = null;

    await runUploadLoop();
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
            setUploadProgressInfo({
              percent: 0,
              loaded: 0,
              total: 0,
              speed: 0,
              eta: 0,
            });
            setFolderId(null);
            setUploadedCount(0);
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

  if (isUploading) {
    const isPaused = uploadState === "paused";
    const isError = uploadState === "error";
    const isRetrying = uploadState === "retrying";

    return (
      <div className="glass-card p-8 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-bold mb-6 text-center">Uploading Your Content</h2>
        
        <div className="rounded-xl border border-border bg-background/30 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0 flex-1 mr-4">
              <p className="text-sm text-muted-foreground">Uploading file {currentFileIndexRef.current + 1} of {files.length}</p>
              <h3 className="font-semibold text-lg truncate mt-1">{currentUploadingName}</h3>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 uppercase tracking-wider ${
              isError 
                ? "bg-destructive/10 text-destructive border border-destructive/20 animate-pulse" 
                : isPaused 
                ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" 
                : isRetrying 
                ? "bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse" 
                : "bg-accent/10 text-accent border border-accent/20 animate-pulse"
            }`}>
              {uploadState}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            <Progress value={uploadProgressInfo.percent} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{uploadProgressInfo.percent}% completed</span>
              <span>{(uploadProgressInfo.loaded / (1024 * 1024)).toFixed(1)} MB / {(uploadProgressInfo.total / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Upload Speed</p>
              <p className="font-semibold text-base mt-0.5">
                {uploadState === "paused" ? "Paused" : `${uploadProgressInfo.speed.toFixed(2)} MB/s`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Estimated Time Remaining</p>
              <p className="font-semibold text-base mt-0.5">
                {uploadState === "paused" ? "Paused" : formatETA(uploadProgressInfo.eta)}
              </p>
            </div>
          </div>
        </div>

        {isError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-destructive">Upload Interrupted</h4>
              <p className="text-xs text-muted-foreground mt-1">
                A network error or interruption occurred. Click Retry to resume from where it failed.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isPaused && !isError && (
            <Button 
              type="button" 
              variant="heroOutline" 
              onClick={handlePause}
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause Upload
            </Button>
          )}

          {(isPaused || isError) && (
            <Button 
              type="button" 
              variant="premium" 
              onClick={handleResume}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {isError ? "Retry Upload" : "Resume Upload"}
            </Button>
          )}

          <Button 
            type="button" 
            variant="ghost" 
            onClick={handleAbort}
            className="text-destructive hover:bg-destructive/10 shrink-0"
          >
            Cancel
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

      {/* Upload Mode Toggle */}
      {files.length > 1 && (
        <div className="flex items-center gap-3 rounded-lg border border-border p-4 mb-4">
          <div className="flex items-center gap-3 flex-1">
            {uploadMode === "bundle" ? (
              <Layers className="w-5 h-5 text-accent" />
            ) : (
              <FileText className="w-5 h-5 text-accent" />
            )}
            <div>
              <Label className="text-sm font-medium">Upload Mode</Label>
              <p className="text-xs text-muted-foreground">
                {uploadMode === "bundle"
                  ? "All files grouped as one listing"
                  : "Each file becomes its own listing"}
              </p>
            </div>
          </div>
          <Select value={uploadMode} onValueChange={(v) => setUploadMode(v as UploadMode)}>
            <SelectTrigger className="w-[160px] bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bundle">Bundle</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
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

              {/* Individual title/description fields */}
              {uploadMode === "individual" && (
                <div className="mt-3 pl-[52px] space-y-2">
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
                </div>
              )}
            </div>
          ))}
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
              <p className="text-xs text-muted-foreground">
                {uploadMode === "individual" ? "Applied to all listings" : "Disable to use as storage only (not for sale)"}
              </p>
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
