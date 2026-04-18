import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import logo from "@/assets/logo.png";

const SITE_PASSWORD = "media26mule";
const STORAGE_KEY = "site-access-granted";

export const SitePasswordGate = ({ children }: { children: React.ReactNode }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      setIsAuthorized(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setIsAuthorized(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (isAuthorized) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] hero-glow opacity-40" />
      </div>

      <div className="relative z-10 glass-card p-8 md:p-12 w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={logo} alt="Media Mule Co." className="w-10 h-10 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight">Media Mule Co.</span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h1 className="font-display text-2xl font-bold mb-2">Site Under Testing</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Enter the password to access the site.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Enter site password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            className={error ? "border-destructive" : ""}
            autoFocus
          />
          {error && (
            <p className="text-destructive text-sm">Incorrect password. Try again.</p>
          )}
          <Button type="submit" variant="hero" className="w-full">
            Enter Site
          </Button>
        </form>
      </div>
    </div>
  );
};
