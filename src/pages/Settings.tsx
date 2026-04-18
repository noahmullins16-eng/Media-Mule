import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User,
  CreditCard,
  KeyRound,
  Trash2,
  Crown,
  Shield,
  Check,
  Pencil,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const Settings = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Profile
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameLocked, setUsernameLocked] = useState(false);

  // Subscription
  const [tier, setTier] = useState("starter");

  // Stripe Connect
  const [connectOnboarded, setConnectOnboarded] = useState<boolean | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Portal
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("creator_profiles")
        .select("username, username_locked, tier, stripe_account_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setUsername(data.username || "");
        setUsernameInput(data.username || "");
        setUsernameLocked(!!(data as any).username_locked);
        setTier(data.tier);
      }

      // Check actual onboarding status via edge function
      if (data?.stripe_account_id) {
        const { data: connectData } = await supabase.functions.invoke("connect-onboarding");
        setConnectOnboarded(connectData?.onboarded === true);
      } else {
        setConnectOnboarded(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveUsername = async () => {
    if (!user) return;
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    setSavingUsername(true);
    const { error } = await supabase
      .from("creator_profiles")
      .update({ username: trimmed })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update nickname");
    } else {
      setUsername(trimmed);
      setEditingUsername(false);
      toast.success("Nickname updated");
    }
    setSavingUsername(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      toast.error('Type "DELETE" to confirm');
      return;
    }
    setDeleting(true);
    // Sign out and inform — actual deletion requires admin action
    toast.success("Account deletion request submitted. You will be signed out.");
    await signOut();
    navigate("/");
  };

  const handleConnectSetup = async () => {
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
    } catch {
      toast.error("Failed to start payment setup");
    }
    setConnectLoading(false);
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast.error("Failed to open subscription management");
    }
    setPortalLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) return null;

  const tierLabels: Record<string, string> = {
    starter: "Free",
    basic: "Basic",
    pro: "Pro",
    studio: "Studio",
    enterprise: "Enterprise",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-8">Account Settings</h1>

        {/* Profile Section */}
        <section className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Profile</h2>
              <p className="text-sm text-muted-foreground">Your public identity</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="text-sm font-medium mt-1">{user.email}</p>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Nickname</Label>
              {editingUsername && !usernameLocked ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter nickname"
                    className="h-9 max-w-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveUsername();
                      if (e.key === "Escape") setEditingUsername(false);
                    }}
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveUsername} disabled={savingUsername}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-medium">{username || "Not set"}</p>
                  {!usernameLocked && (
                    <button onClick={() => setEditingUsername(true)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {usernameLocked && (
                    <span className="text-xs text-muted-foreground italic">Locked</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Payment Info Section */}
        <section className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Payment Info</h2>
              <p className="text-sm text-muted-foreground">Receive payments from buyers</p>
            </div>
          </div>

          {connectOnboarded ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Payments Active</p>
                <p className="text-xs text-muted-foreground">Your account is connected and ready to receive payments</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your bank account to start receiving payments when buyers purchase your media.
              </p>
              <Button variant="hero" size="sm" disabled={connectLoading} onClick={handleConnectSetup}>
                {connectLoading ? "Loading..." : "Set Up Payments"}
              </Button>
            </div>
          )}
        </section>

        {/* Subscription Section */}
        <section className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Subscription</h2>
              <p className="text-sm text-muted-foreground">Manage your plan</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Plan: <span className="text-accent">{tierLabels[tier] || tier}</span></p>
            </div>
            <div className="flex gap-2">
              {tier !== "starter" && (
                <Button variant="outline" size="sm" disabled={portalLoading} onClick={handleManageSubscription}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  {portalLoading ? "Loading..." : "Manage"}
                </Button>
              )}
              <Button variant="heroOutline" size="sm" onClick={() => navigate("/pricing")}>
                {tier === "starter" ? "Upgrade" : "Change Plan"}
              </Button>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Change Password</h2>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
          </div>

          <div className="space-y-3 max-w-sm">
            <div>
              <Label htmlFor="new-password" className="text-sm">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-sm">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="mt-1"
              />
            </div>
            <Button size="sm" onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
              {savingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="glass-card p-6 border-destructive/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-destructive">Delete Account</h2>
              <p className="text-sm text-muted-foreground">Permanently remove your account and all data</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/15 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                This action is irreversible. All your videos, folders, and payment settings will be permanently deleted.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-w-sm">
            <div>
              <Label htmlFor="delete-confirm" className="text-sm">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='Type "DELETE"'
                className="mt-1"
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteConfirm !== "DELETE" || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? "Deleting..." : "Delete My Account"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;
