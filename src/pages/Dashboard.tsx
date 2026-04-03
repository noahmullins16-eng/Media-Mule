import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TIER_CONFIG, type SubscriptionTier } from "@/lib/subscription-tiers";
import { downloadMedia } from "@/lib/download-media";
import { toast } from "sonner";
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
  DollarSign,
  Clock,
  User,
  Check,
  Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FolderSidebar, type MediaFolder } from "@/components/folders/FolderSidebar";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tier, setTier] = useState<SubscriptionTier>("starter");
  const [storageUsed, setStorageUsed] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [totalFileSize, setTotalFileSize] = useState(0);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [connectOnboarded, setConnectOnboarded] = useState<boolean | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [usernameLocked, setUsernameLocked] = useState(false);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (searchParams.get("connect") === "success") {
      toast.success("Stripe Connect setup complete! You can now receive payments.");
    }
  }, [searchParams]);

  const fetchFolders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("media_folders")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    setFolders((data as MediaFolder[]) || []);
  };

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("creator_profiles")
        .select("tier, storage_used, username, stripe_account_id, username_locked")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setTier(data.tier as SubscriptionTier);
        setStorageUsed(data.storage_used);
        setUsername(data.username || "");
        setUsernameInput(data.username || "");
        // Don't set connectOnboarded from profile alone — wait for edge function check
        setUsernameLocked(!!(data as any).username_locked);
      }
    };

    const fetchVideos = async () => {
      const { data, count } = await supabase
        .from("videos")
        .select("id, title, price, file_size, file_path, status, created_at, folder_id", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setVideoCount(count || data.length);
        setTotalFileSize(data.reduce((sum, v) => sum + (v.file_size || 0), 0));
        setRecentVideos(data);
      }
    };
    
    fetchProfile();
    fetchVideos();
    fetchFolders();

    // Check Connect onboarding status
    const checkConnect = async () => {
      const { data } = await supabase.functions.invoke("connect-onboarding");
      if (data?.onboarded) setConnectOnboarded(true);
    };
    checkConnect();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    { label: "Total Uploads", value: String(videoCount), icon: FileVideo, change: null },
    { label: "Total File Size", value: totalFileSize > 0 ? `${(totalFileSize / (1024 * 1024)).toFixed(1)} MB` : "0", icon: Download, change: null },
    { label: "Published", value: String(recentVideos.filter(v => v.status === "published").length), icon: Eye, change: null },
    { label: "Active Links", value: String(videoCount), icon: Link2, change: null },
  ];

  const tierConfig = TIER_CONFIG[tier];
  const storageUsedGB = storageUsed / (1024 * 1024 * 1024); // Convert bytes to GB
  const storageTotalGB = tierConfig.totalStorage / (1024 * 1024 * 1024); // Convert bytes to GB
  const storagePercent = (storageUsed / tierConfig.totalStorage) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Welcome & Username */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Creator Dashboard</h1>
            {username ? (
              <div className="flex items-center gap-2">
              <span className="font-display text-3xl font-bold text-accent">{username}</span>
                {!usernameLocked && (
                  <button
                    onClick={() => setEditingUsername(true)}
                    className="opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {editingUsername ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!user) return;
                      setSavingUsername(true);
                      const { error } = await supabase
                        .from("creator_profiles")
                        .update({ username: usernameInput.trim() || null })
                        .eq("user_id", user.id);
                      if (!error) {
                        setUsername(usernameInput.trim());
                        setEditingUsername(false);
                      }
                      setSavingUsername(false);
                    }}
                  >
                    <Input
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Enter your username"
                      className="h-8 w-48 text-sm"
                      autoFocus
                    />
                    <Button type="submit" size="sm" variant="ghost" disabled={savingUsername} className="h-8 w-8 p-0">
                      <Check className="w-4 h-4 text-accent" />
                    </Button>
                  </form>
                ) : (
                  <button
                    onClick={() => setEditingUsername(true)}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">Set your username</span>
                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            )}
            {editingUsername && username && !usernameLocked && (
              <form
                className="flex items-center gap-2 mt-1"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return;
                  setSavingUsername(true);
                  const { error } = await supabase
                    .from("creator_profiles")
                    .update({ username: usernameInput.trim() || null })
                    .eq("user_id", user.id);
                  if (!error) {
                    setUsername(usernameInput.trim());
                    setEditingUsername(false);
                  }
                  setSavingUsername(false);
                }}
              >
                <Input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter your username"
                  className="h-8 w-48 text-sm"
                  autoFocus
                />
                <Button type="submit" size="sm" variant="ghost" disabled={savingUsername} className="h-8 w-8 p-0">
                  <Check className="w-4 h-4 text-accent" />
                </Button>
              </form>
            )}
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
              <p className="font-display font-semibold">{tierConfig.label} Plan</p>
              <p className="text-sm text-muted-foreground">
                {tier === "enterprise" 
                  ? "You're on the highest tier with unlimited features" 
                  : "Upgrade to unlock more storage, analytics, and distribution tools"}
              </p>
            </div>
          </div>
          <Link to="/pricing">
            <Button variant="heroOutline" size="sm">
              View Plans
            </Button>
          </Link>
        </div>

        {/* Stripe Connect Banner */}
        {connectOnboarded === false && (
          <div className="glass-card p-8 mb-8 border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
                <DollarSign className="w-7 h-7 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-xl mb-1">Start Receiving Payments</h2>
                <p className="text-muted-foreground mb-4">
                  Set up your payment account to start earning from your media sales. It only takes a few minutes.
                </p>
                <div className="grid sm:grid-cols-3 gap-4 mb-2">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center shrink-0">1</span>
                    <div>
                      <p className="text-sm font-medium">Connect Account</p>
                      <p className="text-xs text-muted-foreground">Link your bank or debit card</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center shrink-0">2</span>
                    <div>
                      <p className="text-sm font-medium">Verify Identity</p>
                      <p className="text-xs text-muted-foreground">Quick verification for payouts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center shrink-0">3</span>
                    <div>
                      <p className="text-sm font-medium">Get Paid</p>
                      <p className="text-xs text-muted-foreground">Receive funds from every sale</p>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant="hero"
                disabled={connectLoading}
                className="shrink-0"
                onClick={async () => {
                  setConnectLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("connect-onboarding");
                    if (error) throw error;
                    if (data?.url) {
                      window.location.href = data.url;
                    } else if (data?.onboarded) {
                      setConnectOnboarded(true);
                      toast.success("Payments already set up!");
                    }
                  } catch (err) {
                    toast.error("Failed to start payment setup");
                    console.error(err);
                  }
                  setConnectLoading(false);
                }}
              >
                {connectLoading ? "Loading..." : "Set Up Payments"}
              </Button>
            </div>
          </div>
        )}
        {connectOnboarded === true && (
          <div className="glass-card p-4 mb-8 flex items-center gap-3 border-green-500/20 bg-green-500/5">
            <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Payments Active</p>
            <span className="text-xs text-muted-foreground">— Your account is set up to receive payments from buyers</span>
          </div>
        )}

        {/* Storage Usage */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-accent" />
              Storage Usage
            </h2>
            <span className="text-sm text-muted-foreground">
              {storageUsedGB.toFixed(2)} GB / {tierConfig.totalStorageLabel}
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

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Uploads with Folders */}
          <div className="glass-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-lg">Recent Uploads</h2>
              <Link to="/my-media" className="text-sm text-accent hover:underline">
                View All
              </Link>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Folder sidebar */}
              <aside className="lg:w-48 shrink-0">
                <FolderSidebar
                  folders={folders}
                  activeFolderId={activeFolderId}
                  onSelectFolder={setActiveFolderId}
                  onFoldersChange={fetchFolders}
                  userId={user.id}
                  onDropVideo={async (videoId, folderId) => {
                    const { error } = await supabase
                      .from("videos")
                      .update({ folder_id: folderId } as any)
                      .eq("id", videoId);
                    if (error) {
                      toast.error("Failed to move video");
                    } else {
                      setRecentVideos((prev) =>
                        prev.map((v) => v.id === videoId ? { ...v, folder_id: folderId } : v)
                      );
                      toast.success("Video moved");
                    }
                  }}
                />
              </aside>

              {/* Filtered video list */}
              <div className="flex-1 min-w-0">
                {(() => {
                  const filtered = activeFolderId === null
                    ? recentVideos
                    : recentVideos.filter((v) => v.folder_id === activeFolderId);
                  
                  return filtered.length > 0 ? (
                    <div className="space-y-3">
                      {filtered.map((v) => (
                        <Link
                          key={v.id}
                          to={`/video/${v.id}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/video-id", v.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing"
                        >
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            <Video className="w-5 h-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{v.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {Number(v.price) > 0 ? `$${Number(v.price).toFixed(2)} · ` : ""}{new Date(v.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                            {v.status}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            title="Download"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              downloadMedia(v.file_path, v.title);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Video className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold mb-1">
                        {activeFolderId ? "This folder is empty" : "No uploads yet"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                        {activeFolderId
                          ? "Drag videos here or move them from the My Media page."
                          : "Upload your first file to start distributing media through MediaMule."}
                      </p>
                      <Link to={activeFolderId ? "/my-media" : "/upload"}>
                        <Button variant="hero" size="sm">
                          <Upload className="w-4 h-4 mr-2" />
                          {activeFolderId ? "Go to My Media" : "Upload Your First File"}
                        </Button>
                      </Link>
                    </div>
                  );
                })()}
              </div>
            </div>
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
              <Link to="/my-media" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
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

        {/* Transaction History */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              Transaction History
            </h2>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No transactions yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              When buyers purchase your media, transactions will appear here with payment details and download history.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
