import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoFull from "@/assets/logo-full.png";

export const Header = ({ minimal = false }: { minimal?: boolean }) => {
  const { user, signOut } = useAuth();

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
              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-8">
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
                {user && (
                  <>
                    <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                      Dashboard
                    </Link>
                    <Link to="/my-media" className="text-muted-foreground hover:text-foreground transition-colors">
                      My Media
                    </Link>
                  </>
                )}
              </nav>

              {/* CTA */}
              <div className="flex items-center gap-3">
                {user ? (
                  <>
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
                      <Button variant="ghost" className="hidden sm:inline-flex">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/upload">
                      <Button variant="hero" size="sm">
                        Start Selling
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
