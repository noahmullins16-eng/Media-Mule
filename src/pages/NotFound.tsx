import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import notFoundMule from "@/assets/404mule.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-7xl font-bold text-foreground mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-2">
          Whoa there! This page bucked off.
        </p>
        <img
          src={notFoundMule}
          alt="Lost mule"
          className="w-48 h-48 object-contain mx-auto mb-6"
        />
        <Link
          to="/"
          className="inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
