import { Header } from "@/components/landing/Header";
import { VideoUploader } from "@/components/upload/VideoUploader";

const Upload = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Share Your <span className="gradient-text">Premium Content</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Upload videos & images, set your price, and start earning today.
          </p>
        </div>
        <VideoUploader />
      </main>
    </div>
  );
};

export default Upload;
