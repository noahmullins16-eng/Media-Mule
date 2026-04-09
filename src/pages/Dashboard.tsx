import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TIER_CONFIG, type SubscriptionTier } from "@/lib/subscription-tiers";
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
  Crown,
  DollarSign,
  Clock,
  User,
  Check,
  Pencil,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FolderSidebar, type MediaFolder, buildTree, getDescendantIds } from "@/components/folders/FolderSidebar";
import { ShoppingCart } from "lucide-react";
import { MediaItemRow, type VideoItem } from "@/components/dashboard/MediaItemRow";
import { WatermarkUploader } from "@/components/upload/WatermarkUploader";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tier, setTier] = useState<SubscriptionTier>("starter");
  const [storageUsed, setStorageUsed] = useState(0);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [username, setUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [connectOnboarded, setConnectOnboarded] = useState<boolean | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [usernameLocked, setUsernameLocked] = useState(false);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [showWatermark, setShowWatermark] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
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
        setUsernameLocked(!!(data as any).username_locked);
      }
    };

    const fetchVideos = async () => {
      setLoadingVideos(true);
      const { data } = await supabase
        .from("videos")
        .select("id, title, description, price, file_path, file_size, status, created_at, watermarks_enabled, folder_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setVideos((data as VideoItem[]) || []);
      setLoadingVideos(false);
    };

    const fetchTransactions = async () => {
      const { data: sales } = await supabase
        .from("purchases")
        .select("id, video_id, amount, created_at, videos!inner(title)")
        .eq("seller_user_id", user.id)
        .order("created_at", { ascending: false });
      const { data: bought } = await supabase
        .from("purchases")
        .select("id, video_id, amount, created_at, videos!inner(title)")
        .eq("buyer_user_id", user.id)
        .order("created_at", { ascending: false });
      const allTx = [
        ...(sales || []).map((t: any) => ({ ...t, type: "sold" as const, title: t.videos?.title })),
        ...(bought || []).map((t: any) => ({ ...t, type: "bought" as const, title: t.videos?.title })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(allTx);
    };

    fetchProfile();
    fetchVideos();
    fetchFolders();
    fetchTransactions();

    const checkConnect = async () => {
      const { data } = await supabase.functions.invoke("connect-onboarding");
      setConnectOnboarded(data?.onboarded === true);
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

  const videoCount = videos.length;
  const totalFileSize = videos.reduce((sum, v) => sum + (v.file_size || 0), 0);

  const stats = [
    { label: "Total Uploads", value: String(videoCount), icon: FileVideo },
    { label: "Total File Size", value: totalFileSize > 0 ? `${(totalFileSize / (1024 * 1024)).toFixed(1)} MB` : "0", icon: Download },
    { label: "Published", value: String(videos.filter(v => v.status === "published").length), icon: Eye },
    { label: "Active Links", value: String(videoCount), icon: Link2 },
  ];

  const tierConfig = TIER_CONFIG[tier];
  const storageUsedGB = storageUsed / (1024 * 1024 * 1024);
  const storageTotalGB = tierConfig.totalStorage / (1024 * 1024 * 1024);
  const storagePercent = (storageUsed / tierConfig.totalStorage) * 100;

  const filteredVideos = activeFolderId === null
    ? videos
    : videos.filter((v) => v.folder_id === activeFolderId);

  const handleVideoUpdate = (updated: VideoItem) => {
    setVideos((prev) => prev.map((v) => v.id === updated.id ? updated : v));
  };

  const handleVideoDelete = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handleDropVideo = async (videoId: string, folderId: string | null) => {
    const { error } = await supabase
      .from("videos")
      .update({ folder_id: folderId } as any)
      .eq("id", videoId);
    if (error) {
      toast.error("Failed to move video");
    } else {
      setVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, folder_id: folderId } : v));
      toast.success("Video moved");
    }
  };

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
                  <button onClick={() => setEditingUsername(true)} className="opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {editingUsername ? (
                  <form className="flex items-center gap-2" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!user) return;
                    setSavingUsername(true);
                    const { error } = await supabase.from("creator_profiles").update({ username: usernameInput.trim() || null }).eq("user_id", user.id);
                    if (!error) { setUsername(usernameInput.trim()); setEditingUsername(false); }
                    setSavingUsername(false);
                  }}>
                    <Input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="Enter your username" className="h-8 w-48 text-sm" autoFocus />
                    <Button type="submit" size="sm" variant="ghost" disabled={savingUsername} className="h-8 w-8 p-0">
                      <Check className="w-4 h-4 text-accent" />
                    </Button>
                  </form>
                ) : (
                  <button onClick={() => setEditingUsername(true)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Set your username</span>
                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            )}
            {editingUsername && username && !usernameLocked && (
              <form className="flex items-center gap-2 mt-1" onSubmit={async (e) => {
                e.preventDefault();
                if (!user) return;
                setSavingUsername(true);
                const { error } = await supabase.from("creator_profiles").update({ username: usernameInput.trim() || null }).eq("user_id", user.id);
                if (!error) { setUsername(usernameInput.trim()); setEditingUsername(false); }
                setSavingUsername(false);
              }}>
                <Input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="Enter your username" className="h-8 w-48 text-sm" autoFocus />
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
            <Button variant="heroOutline" size="sm">View Plans</Button>
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
                <p className="text-muted-foreground mb-4">Set up your payment account to start earning from your media sales.</p>
                <div className="grid sm:grid-cols-3 gap-4 mb-2">
                  {[
                    { n: "1", t: "Connect Account", d: "Link your bank or debit card" },
                    { n: "2", t: "Verify Identity", d: "Quick verification for payouts" },
                    { n: "3", t: "Get Paid", d: "Receive funds from every sale" },
                  ].map((s) => (
                    <div key={s.n} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center shrink-0">{s.n}</span>
                      <div>
                        <p className="text-sm font-medium">{s.t}</p>
                        <p className="text-xs text-muted-foreground">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="hero" disabled={connectLoading} className="shrink-0" onClick={async () => {
                setConnectLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke("connect-onboarding");
                  if (error) throw error;
                  if (data?.url) { window.location.href = data.url; }
                  else if (data?.onboarded) { setConnectOnboarded(true); toast.success("Payments already set up!"); }
                } catch { toast.error("Failed to start payment setup"); }
                setConnectLoading(false);
              }}>
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
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-all" style={{ width: `${Math.max(storagePercent, 1)}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">
            {storagePercent < 1 ? "You have plenty of storage available. Start uploading!" : `${storagePercent.toFixed(1)}% of your storage is in use.`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-display text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Watermark Settings (collapsible) */}
        <div className="glass-card mb-8 overflow-hidden">
          <button
            onClick={() => setShowWatermark(!showWatermark)}
            className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" />
              <h2 className="font-display font-semibold text-lg">Watermark Settings</h2>
            </div>
            {showWatermark ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {showWatermark && (
            <div className="px-5 pb-5">
              <WatermarkUploader onWatermarkUrl={() => {}} />
            </div>
          )}
        </div>

        {/* Full Media Management */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-semibold text-lg">Cloud Storage</h2>
            <Link to="/upload">
              <Button variant="heroOutline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
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
                onDropVideo={handleDropVideo}
              />
            </aside>

            {/* Video list with full actions */}
            <div className="flex-1 min-w-0">
              {loadingVideos ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
              ) : filteredVideos.length > 0 ? (
                <div className="space-y-3">
                  {filteredVideos.map((v) => (
                    <MediaItemRow
                      key={v.id}
                      video={v}
                      folders={folders}
                      onUpdate={handleVideoUpdate}
                      onDelete={handleVideoDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Video className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">{activeFolderId ? "This folder is empty" : "No uploads yet"}</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    {activeFolderId
                      ? "Drag videos here or upload new content."
                      : "Upload your first file to start distributing media through MediaMule."}
                  </p>
                  <Link to="/upload">
                    <Button variant="hero" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      {activeFolderId ? "Upload Content" : "Upload Your First File"}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 lg:col-span-2">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-6">
              <DollarSign className="w-5 h-5 text-accent" />
              Transaction History
            </h2>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((t) => {
                  const isSold = t.type === "sold";
                  return (
                    <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSold ? "bg-green-500/10" : "bg-blue-500/10"}`}>
                        {isSold ? <DollarSign className="w-5 h-5 text-green-500" /> : <ShoppingCart className="w-5 h-5 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">{isSold ? "Sold" : "Purchased"} · {new Date(t.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-sm font-semibold ${isSold ? "text-green-500" : "text-blue-500"}`}>
                        {isSold ? "+" : "-"}${Number(t.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No transactions yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">When you buy or sell media, transactions will appear here.</p>
              </div>
            )}
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
              <Link to="/pricing" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-accent transition-colors">Upgrade Plan</p>
                  <p className="text-xs text-muted-foreground">Unlock more features</p>
                </div>
              </Link>
              <Link to="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-accent transition-colors">Settings</p>
                  <p className="text-xs text-muted-foreground">Account & preferences</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
