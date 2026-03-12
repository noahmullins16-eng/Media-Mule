import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Video,
  HardDrive,
  Download,
  Eye,
  Link2,
  TrendingUp,
  BarChart3,
  FileVideo,
  Settings,
  Crown,
} from "lucide-react";

const Dashboard = () => {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) return null;

  // Mock data for the dashboard
  const stats = [
    { label: "Total Uploads", value: "0", icon: FileVideo, change: null },
    { label: "Total Downloads", value: "0", icon: Download, change: null },
    { label: "Link Views", value: "0", icon: Eye, change: null },
    { label: "Active Links", value: "0", icon: Link2, change: null },
  ];

  const storageUsed = 0;
  const storageTotal = 1024; // 1 TB in GB for Starter
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Creator Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.email?.split("@")[0]}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/upload">
              <Button variant="hero">
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </Button>
            </Link>
          </div>
        </div>

        {/* Subscription Banner */}
        <div className="glass-card p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-display font-semibold">Free Plan</p>
              <p className="text-sm text-muted-foreground">
                Upgrade to unlock more storage, analytics, and distribution tools
              </p>
            </div>
          </div>
          <Link to="/pricing">
            <Button variant="heroOutline" size="sm">
              View Plans
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  {stat.change && (
                    <span className="text-xs font-medium text-accent flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="font-display text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Storage & Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Storage Usage */}
          <div className="glass-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-accent" />
                Storage Usage
              </h2>
              <span className="text-sm text-muted-foreground">
                {storageUsed} GB / {storageTotal >= 1024 ? `${storageTotal / 1024} TB` : `${storageTotal} GB`}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-all"
                style={{ width: `${Math.max(storagePercent, 1)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {storagePercent < 1
                ? "You have plenty of storage available. Start uploading!"
                : `${storagePercent.toFixed(1)}% of your storage is in use.`}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h2 className="font-display font-semibold text-lg mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/upload" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-accent transition-colors">Upload Media</p>
                  <p className="text-xs text-muted-foreground">Video, audio, images</p>
                </div>
              </Link>
              <Link to="/my-videos" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Video className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-accent transition-colors">My Media</p>
                  <p className="text-xs text-muted-foreground">Manage your files</p>
                </div>
              </Link>
              <Link to="/pricing" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-accent transition-colors">Upgrade Plan</p>
                  <p className="text-xs text-muted-foreground">Unlock more features</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Uploads - Empty State */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-semibold text-lg">Recent Uploads</h2>
            <Link to="/my-videos" className="text-sm text-accent hover:underline">
              View All
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No uploads yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Upload your first file to start distributing media through MediaMule.
            </p>
            <Link to="/upload">
              <Button variant="hero" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First File
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
