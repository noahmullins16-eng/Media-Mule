import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import logo from "@/assets/logo.png";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

type AuthView = "login" | "signup" | "forgot-password";

const Auth = () => {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }

    if (view === "forgot-password") {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("custom-password-reset", {
          body: { email },
        });
        setLoading(false);

        if (error) {
          toast.error("Failed to send reset link. Please try again.");
        } else if (data?.success) {
          toast.success("Check your email for a password reset link.");
          setEmail("");
        } else {
          toast.error("Failed to send reset link. Please try again.");
        }
      } catch (err) {
        setLoading(false);
        toast.error("An error occurred. Please try again.");
      }
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      if (view === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message.includes("Invalid login credentials")
            ? "Invalid email or password. Please try again."
            : error.message);
        } else {
          toast.success("Welcome back!");
          navigate("/");
        }
      } else {
        // Use custom signup instead of signUp from AuthContext
        const { data, error } = await supabase.functions.invoke("custom-signup", {
          body: { email, password },
        });

        if (error) {
          toast.error("Failed to create account. Please try again.");
        } else if (data?.success) {
          toast.success("Check your email for a confirmation link!");
          setEmail("");
          setPassword("");
        } else {
          toast.error("Failed to create account. Please try again.");
        }
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const title = view === "login" ? "Welcome Back" : view === "signup" ? "Create Account" : "Reset Password";
  const description = view === "login"
    ? "Sign in to access your videos"
    : view === "signup"
    ? "Sign up to start uploading and selling videos"
    : "Enter your email and we'll send you a reset link";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Media Mule Co." className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl font-display">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {view !== "forgot-password" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Loading..."
                : view === "login"
                ? "Sign In"
                : view === "signup"
                ? "Sign Up"
                : "Send Reset Link"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
            {view === "login" && (
              <>
                <div>
                  <button type="button" onClick={() => setView("forgot-password")} className="text-primary hover:underline font-medium">
                    Forgot password?
                  </button>
                </div>
                <div>
                  Don't have an account?{" "}
                  <button type="button" onClick={() => setView("signup")} className="text-primary hover:underline font-medium">
                    Sign Up
                  </button>
                </div>
              </>
            )}
            {view === "signup" && (
              <div>
                Already have an account?{" "}
                <button type="button" onClick={() => setView("login")} className="text-primary hover:underline font-medium">
                  Sign In
                </button>
              </div>
            )}
            {view === "forgot-password" && (
              <div>
                Remember your password?{" "}
                <button type="button" onClick={() => setView("login")} className="text-primary hover:underline font-medium">
                  Sign In
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
