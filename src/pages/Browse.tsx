import { Header } from "@/components/landing/Header";
import { VideoCard } from "@/components/video/VideoCard";

// Sample data - in real app this would come from database
const sampleVideos = [
  {
    id: "1",
    title: "Advanced React Patterns - Complete Masterclass",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop",
    price: 29.99,
    duration: "2:45:30",
    creator: "DevMaster",
  },
  {
    id: "2",
    title: "Cinematic Color Grading Tutorial for Filmmakers",
    thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=450&fit=crop",
    price: 19.99,
    duration: "1:32:00",
    creator: "FilmPro",
  },
  {
    id: "3",
    title: "Music Production: From Zero to Hero",
    thumbnail: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=450&fit=crop",
    price: 49.99,
    duration: "4:15:00",
    creator: "BeatMaker",
  },
  {
    id: "4",
    title: "UI/UX Design Fundamentals Workshop",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=450&fit=crop",
    price: 24.99,
    duration: "3:00:00",
    creator: "DesignGuru",
  },
  {
    id: "5",
    title: "Drone Cinematography Secrets Revealed",
    thumbnail: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=450&fit=crop",
    price: 34.99,
    duration: "2:20:00",
    creator: "SkyShooter",
  },
  {
    id: "6",
    title: "Professional Photography Lighting Techniques",
    thumbnail: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=450&fit=crop",
    price: 39.99,
    duration: "2:50:00",
    creator: "PhotoPro",
  },
];

const Browse = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Discover <span className="gradient-text">Premium Videos</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Browse exclusive content from creators around the world. Pay once, download forever.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleVideos.map((video) => (
            <VideoCard key={video.id} {...video} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Browse;