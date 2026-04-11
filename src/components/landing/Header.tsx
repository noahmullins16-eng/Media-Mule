import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Settings, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoFull from "@/assets/logo-full.png";

export const Header = ({ minimal = false }: { minimal?: boolean }) => {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img 
              src={logoFull} 
              alt="Media Mule" 
              className="h-16 object-contain"
            />
          </Link>

          {minimal ? (
            <>
              <Link to="/how-it-works" className="absolute left-1/2 -translate-x-1/2 text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </Link>
              <div />
            </>
          ) : (
            <>
              {/* Desktop navigation */}
              <nav className="hidden lg:flex items-center gap-8">
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
                {user && (
                  <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                    Dashboard
                  </Link>
                )}
              </nav>

              {/* Desktop CTA */}
              <div className="hidden lg:flex items-center gap-3">
                {user ? (
                  <>
                    <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors" title="Account Settings">
                      <Settings className="w-5 h-5" />
                    </Link>
                    <span className="hidden sm:inline-flex text-sm text-muted-foreground">
                      {user.email}
                    </span>
                    <Button variant="ghost" onClick={handleSignOut}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="ghost">Sign In</Button>
                    </Link>
                    <Link to="/upload">
                      <Button variant="hero" size="sm">Start Selling</Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </>
          )}
        </div>

        {/* Mobile menu dropdown */}
        {!minimal && mobileOpen && (
          <nav className="lg:hidden flex flex-col gap-4 pb-4 pt-2 border-t border-border/30">
            <Link to="/pricing" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/how-it-works" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            {user && (
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
            )}
            {user ? (
              <>
                <Link to="/settings" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Settings
                </Link>
                <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </Link>
                <Link to="/upload" onClick={() => setMobileOpen(false)}>
                  <Button variant="hero" size="sm" className="w-full">Start Selling</Button>
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
