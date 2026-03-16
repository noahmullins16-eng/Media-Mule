import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SitePasswordGate } from "@/components/SitePasswordGate";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Auth from "./pages/Auth";
import MyVideos from "./pages/MyVideos";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import Video from "./pages/Video";
import VideoPreview from "./pages/VideoPreview";
import HowItWorks from "./pages/HowItWorks";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  useVisitorTracking();
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/my-videos" element={<MyVideos />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/video/:id" element={<Video />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={<AdminDashboard />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <SitePasswordGate>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SitePasswordGate>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
