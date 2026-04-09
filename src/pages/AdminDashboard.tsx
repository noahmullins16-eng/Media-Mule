import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/landing/Header";
import { TIER_CONFIG } from "@/lib/subscription-tiers";
import {
  Users,
  HardDrive,
  FileVideo,
  DollarSign,
  Shield,
  TrendingUp,
  BarChart3,
  Eye,
  Globe,
} from "lucide-react";

interface AdminAnalytics {
  total_users: number;
  total_videos: number;
  total_storage_used: number;
  tier_distribution: { tier: string; count: number }[] | null;
  recent_users: {
    user_id: string;
    email: string;
    tier: string;
    storage_used: number;
    created_at: string;
    video_count: number;
  }[] | null;
}

interface VisitorStats {
  uniqueToday: number;
  uniqueWeek: number;
  uniqueMonth: number;
  uniqueAllTime: number;
  totalPageviews: number;
  topPages: { path: string; views: number }[];
}

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;

    const fetchAnalytics = async () => {
      const { data, error } = await supabase.rpc("get_admin_analytics");
      if (!error && data) {
        setAnalytics(data as unknown as AdminAnalytics);
      }

      // Fetch visitor stats
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [todayRes, weekRes, monthRes, allRes, pageviewsRes, topPagesRes] = await Promise.all([
        supabase.from("site_visits").select("visitor_id").gte("visited_at", startOfDay),
        supabase.from("site_visits").select("visitor_id").gte("visited_at", startOfWeek),
        supabase.from("site_visits").select("visitor_id").gte("visited_at", startOfMonth),
        supabase.from("site_visits").select("visitor_id"),
        supabase.from("site_visits").select("id", { count: "exact", head: true }),
        supabase.from("site_visits").select("page_path"),
      ]);

      const uniqueCount = (rows: { visitor_id: string }[] | null) =>
        new Set(rows?.map((r) => r.visitor_id) || []).size;

      // Count top pages
      const pageCounts: Record<string, number> = {};
      topPagesRes.data?.forEach((r) => {
        pageCounts[r.page_path] = (pageCounts[r.page_path] || 0) + 1;
      });
      const topPages = Object.entries(pageCounts)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      setVisitorStats({
        uniqueToday: uniqueCount(todayRes.data),
        uniqueWeek: uniqueCount(weekRes.data),
        uniqueMonth: uniqueCount(monthRes.data),
        uniqueAllTime: uniqueCount(allRes.data),
        totalPageviews: pageviewsRes.count || 0,
        topPages,
      });

      setLoadingData(false);
    };

    fetchAnalytics();
  }, [isAdmin, adminLoading]);

  if (authLoading || adminLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const estimatedMRR = analytics?.tier_distribution?.reduce((sum, t) => {
    const config = TIER_CONFIG[t.tier as keyof typeof TIER_CONFIG];
    return sum + (config?.price || 0) * t.count;
  }, 0) || 0;

  const stats = [
    { label: "Total Users", value: analytics?.total_users || 0, icon: Users, color: "text-blue-500" },
    { label: "Total Videos", value: analytics?.total_videos || 0, icon: FileVideo, color: "text-accent" },
    { label: "Storage Used", value: formatBytes(analytics?.total_storage_used || 0), icon: HardDrive, color: "text-emerald-500" },
    { label: "Est. MRR", value: `$${estimatedMRR}`, icon: DollarSign, color: "text-amber-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform analytics & subscriber management</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="font-display text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Visitor Analytics */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-accent" />
              Unique Visitors
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="font-display text-2xl font-bold">{visitorStats?.uniqueToday || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-sm text-muted-foreground">Last 7 Days</p>
                <p className="font-display text-2xl font-bold">{visitorStats?.uniqueWeek || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-sm text-muted-foreground">Last 30 Days</p>
                <p className="font-display text-2xl font-bold">{visitorStats?.uniqueMonth || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-sm text-muted-foreground">All Time</p>
                <p className="font-display text-2xl font-bold">{visitorStats?.uniqueAllTime || 0}</p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-muted/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> Total Pageviews
              </span>
              <span className="font-display font-bold text-lg">{visitorStats?.totalPageviews || 0}</span>
            </div>
          </div>

          {/* Top Pages */}
          <div className="glass-card p-6">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-accent" />
              Top Pages
            </h2>
            {visitorStats?.topPages && visitorStats.topPages.length > 0 ? (
              <div className="space-y-3">
                {visitorStats.topPages.map((page) => {
                  const maxViews = visitorStats.topPages[0]?.views || 1;
                  const percent = (page.views / maxViews) * 100;
                  return (
                    <div key={page.path}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-mono text-xs">{page.path}</span>
                        <span className="text-muted-foreground">{page.views} views</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-all"
                          style={{ width: `${Math.max(percent, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No page data yet.</p>
            )}
          </div>
        </div>

        {/* Tier Distribution & Revenue */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Tier Distribution */}
          <div className="glass-card p-6">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-accent" />
              Tier Distribution
            </h2>
            {analytics?.tier_distribution && analytics.tier_distribution.length > 0 ? (
              <div className="space-y-3">
                {analytics.tier_distribution.map((t) => {
                  const config = TIER_CONFIG[t.tier as keyof typeof TIER_CONFIG];
                  const totalUsers = analytics.total_users || 1;
                  const percent = (t.count / totalUsers) * 100;
                  return (
                    <div key={t.tier}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium capitalize">{config?.label || t.tier}</span>
                        <span className="text-muted-foreground">
                          {t.count} users · ${(config?.price || 0) * t.count}/mo
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-all"
                          style={{ width: `${Math.max(percent, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No subscribers yet.</p>
            )}
          </div>

          {/* Revenue Overview */}
          <div className="glass-card p-6">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-accent" />
              Revenue Overview
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Estimated MRR</span>
                <span className="font-display font-bold text-lg">${estimatedMRR}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Estimated ARR</span>
                <span className="font-display font-bold text-lg">${estimatedMRR * 12}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Avg. Revenue / User</span>
                <span className="font-display font-bold text-lg">
                  ${analytics?.total_users ? (estimatedMRR / analytics.total_users).toFixed(2) : "0"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="glass-card p-6">
          <h2 className="font-display font-semibold text-lg mb-4">All Subscribers</h2>
          {analytics?.recent_users && analytics.recent_users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Email</th>
                    <th className="pb-3 font-medium text-muted-foreground">Tier</th>
                    <th className="pb-3 font-medium text-muted-foreground">Videos</th>
                    <th className="pb-3 font-medium text-muted-foreground">Storage Used</th>
                    <th className="pb-3 font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics.recent_users.map((u) => {
                    const config = TIER_CONFIG[u.tier as keyof typeof TIER_CONFIG];
                    return (
                      <tr key={u.user_id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 text-sm">{u.email}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent capitalize">
                            {config?.label || u.tier}
                          </span>
                        </td>
                        <td className="py-3">{u.video_count}</td>
                        <td className="py-3">{formatBytes(u.storage_used)}</td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No subscribers yet.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
