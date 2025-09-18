import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md w-full">
        <div className="inline-flex p-4 bg-gradient-primary rounded-2xl shadow-glow mb-6">
          <div className="text-6xl font-bold text-white">404</div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button
          onClick={() => (window.location.href = "/")}
          className="bg-gradient-primary hover:bg-gradient-accent shadow-glow transition-all duration-300"
        >
          <Home className="w-4 h-4 mr-2" />
          Return to MLETRAS
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
