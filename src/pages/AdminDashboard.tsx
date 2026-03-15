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
} from "lucide-react";

interface AdminAnalytics {
  total_users: number;
  total_videos: number;
  total_storage_used: number;
  tier_distribution: { tier: string; count: number }[] | null;
  recent_users: {
    user_id: string;
    tier: string;
    storage_used: number;
    created_at: string;
    video_count: number;
  }[] | null;
}

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
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
                    <th className="pb-3 font-medium text-muted-foreground">User ID</th>
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
                        <td className="py-3 font-mono text-xs">{u.user_id.slice(0, 8)}...</td>
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
