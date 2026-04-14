import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Index";
import NewCampaign from "./pages/NewCampaign";
import CampaignEditor from "./pages/CampaignEditor";
import Corrections from "./pages/Corrections";
import BrandSettings from "./pages/BrandSettings";
import Library from "./pages/Library";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-campaign" element={<NewCampaign />} />
            <Route path="/campaign/:id" element={<CampaignEditor />} />
            <Route path="/library" element={<Library />} />
            <Route path="/corrections" element={<Corrections />} />
            <Route path="/settings" element={<BrandSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
