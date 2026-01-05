import { useParams } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { VideoPaywall } from "@/components/video/VideoPaywall";

// Sample data - in real app this would come from database
const sampleVideos: Record<string, {
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  duration: string;
  creator: string;
}> = {
  "1": {
    title: "Advanced React Patterns - Complete Masterclass",
    description: "Master advanced React patterns including compound components, render props, custom hooks, and state machines. This comprehensive course takes you from intermediate to expert level with real-world examples and hands-on projects.",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=675&fit=crop",
    price: 29.99,
    duration: "2:45:30",
    creator: "DevMaster",
  },
  "2": {
    title: "Cinematic Color Grading Tutorial for Filmmakers",
    description: "Learn professional color grading techniques used in Hollywood productions. From basic color correction to advanced cinematic looks, this tutorial covers everything you need to make your footage look stunning.",
    thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&h=675&fit=crop",
    price: 19.99,
    duration: "1:32:00",
    creator: "FilmPro",
  },
  "3": {
    title: "Music Production: From Zero to Hero",
    description: "Complete music production course covering DAW basics, mixing, mastering, and sound design. Whether you're making beats or full songs, this course has you covered with industry-standard techniques.",
    thumbnail: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&h=675&fit=crop",
    price: 49.99,
    duration: "4:15:00",
    creator: "BeatMaker",
  },
};

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const video = id ? sampleVideos[id] : null;

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="font-display text-4xl font-bold mb-4">Video Not Found</h1>
          <p className="text-muted-foreground">The video you're looking for doesn't exist.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <VideoPaywall {...video} />
      </main>
    </div>
  );
};

export default Video;