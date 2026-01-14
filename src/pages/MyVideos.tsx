import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Upload, Video } from "lucide-react";

const MyVideos = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">My Videos</h1>
          <Link to="/upload">
            <Button variant="hero">
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </Link>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Video className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No videos yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Upload your first video to start selling. Your uploaded videos will appear here.
          </p>
          <Link to="/upload">
            <Button variant="hero">
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Video
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default MyVideos;
