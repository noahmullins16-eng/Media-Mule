import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Video, DollarSign, X, Check } from "lucide-react";

export const VideoUploader = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

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
      if (droppedFile.type.startsWith("video/")) {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Upload integration coming soon - do not process mock uploads
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
          }}>
            Upload Another
          </Button>
          <Button variant="heroOutline">
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
          </div>
        )}
      </div>

      {/* Video Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Video Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a catchy title for your video"
            className="bg-background/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell viewers what they'll get..."
            className="bg-background/50 min-h-[100px]"
          />
        </div>

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
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="premium"
        size="xl"
        className="w-full mt-8"
        disabled={!file || !title || !price || isUploading}
      >
        {isUploading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Publish Video
          </>
        )}
      </Button>
    </form>
  );
};