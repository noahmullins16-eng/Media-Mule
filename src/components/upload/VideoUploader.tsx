import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Video, DollarSign, X, Check, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TIER_CONFIG, type SubscriptionTier } from "@/lib/subscription-tiers";
import { WatermarkUploader } from "./WatermarkUploader";

export const VideoUploader = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [watermarksEnabled, setWatermarksEnabled] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>("starter");
  const [customWatermarkUrl, setCustomWatermarkUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchTier = async () => {
      const { data } = await supabase
        .from("creator_profiles")
        .select("tier")
        .eq("user_id", user.id)
        .single();
      if (data?.tier) {
        setTier(data.tier as SubscriptionTier);
      }
    };
    fetchTier();
  }, [user]);

  const tierConfig = TIER_CONFIG[tier];

  const validateFileSize = (f: File): boolean => {
    if (f.size > tierConfig.maxFileSize) {
      toast.error(
        `File exceeds your ${tierConfig.label} plan limit of ${tierConfig.maxFileSizeLabel}. Upgrade your plan for larger uploads.`
      );
      return false;
    }
    return true;
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile.type.startsWith("video/")) {
        toast.error("Please upload a video file");
        return;
      }
      if (validateFileSize(droppedFile)) {
        setFile(droppedFile);
      }
    }
  }, [tierConfig]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFileSize(selectedFile)) {
        setFile(selectedFile);
      } else {
        e.target.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to upload videos");
      navigate("/auth");
      return;
    }

    if (!file || !title || !price) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Re-validate file size before upload
    if (!validateFileSize(file)) return;

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0.99) {
      toast.error("Price must be at least $0.99");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      setUploadProgress(20);

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      const { error: dbError } = await supabase.from("videos").insert({
        user_id: user.id,
        title,
        description: description || null,
        price: priceNum,
        file_path: filePath,
        file_size: file.size,
        status: "published",
        watermarks_enabled: watermarksEnabled,
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      setUploadComplete(true);
      toast.success("Video uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadComplete(false);
  };

  if (uploadComplete) {
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-accent" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-3">Video Uploaded Successfully!</h2>
        <p className="text-muted-foreground mb-6">
          Your video "{title}" is now live and ready for purchase at ${price}.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" onClick={() => {
            setFile(null);
            setTitle("");
            setDescription("");
            setPrice("");
            setUploadComplete(false);
            setUploadProgress(0);
          }}>
            Upload Another
          </Button>
          <Button variant="heroOutline" onClick={() => navigate("/my-videos")}>
            View Your Videos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 max-w-2xl mx-auto">
      <h2 className="font-display text-2xl font-bold mb-6">Upload Your Video</h2>

      {/* Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 mb-6 transition-all duration-300 ${
          dragActive
            ? "border-accent bg-accent/5"
            : file
            ? "border-accent/50 bg-accent/5"
            : "border-border hover:border-accent/50"
        }`}
      >
        {file ? (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-accent/10 flex items-center justify-center">
              <Video className="w-8 h-8 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={removeFile}
              className="shrink-0"
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              Drag and drop your video here
            </p>
            <p className="text-muted-foreground mb-4">or</p>
            <label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button type="button" variant="heroOutline" asChild>
                <span>Browse Files</span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-3">
              Max file size: {tierConfig.maxFileSizeLabel} ({tierConfig.label} plan)
              {tier !== "enterprise" && (
                <> · <Link to="/pricing" className="text-accent hover:underline">Upgrade for more</Link></>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uploading...</span>
            <span className="text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Video Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Video Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a catchy title for your video"
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
            placeholder="Tell viewers what they'll get..."
            className="bg-background/50 min-h-[100px]"
            disabled={isUploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Price (USD) *</label>
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
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <div>
              <Label htmlFor="watermarks" className="text-sm font-medium">Watermark Protection</Label>
              <p className="text-xs text-muted-foreground">Overlay watermarks on the video preview to deter piracy</p>
            </div>
          </div>
          <Switch
            id="watermarks"
            checked={watermarksEnabled}
            onCheckedChange={setWatermarksEnabled}
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="premium"
        size="xl"
        className="w-full mt-8"
        disabled={isUploading || !file || !title || !price}
      >
        <Upload className="w-5 h-5" />
        {isUploading ? "Uploading..." : "Upload Video"}
      </Button>

      {!user && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          You must be signed in to upload videos.
        </p>
      )}
    </form>
  );
};
