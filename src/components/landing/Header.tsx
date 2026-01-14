import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Import your logo here - replace with your uploaded image
import logo from "@/assets/logo.png";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src={logo} 
              alt="Media Mule Co. Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-accent/25 group-hover:shadow-accent/40 transition-shadow"
            />
            <span className="font-display text-xl font-bold">Media Mule Co.</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/upload" className="text-muted-foreground hover:text-foreground transition-colors">
              Upload
            </Link>
            <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden sm:inline-flex">
              Sign In
            </Button>
            <Link to="/upload">
              <Button variant="hero" size="sm">
                Start Selling
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};