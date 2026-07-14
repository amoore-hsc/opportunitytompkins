import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Opportunities from "./pages/Opportunities";
import ListOpportunity from "./pages/ListOpportunity";
import EditOpportunity from "./pages/EditOpportunity";
import ConfirmListing from "./pages/ConfirmListing";
import Admin from "./pages/Admin";
import Employment from "./pages/Employment";
import EmploymentResources from "./pages/EmploymentResources";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/list-opportunity" element={<ListOpportunity />} />
          <Route path="/edit-opportunity/:token" element={<EditOpportunity />} />
          <Route path="/confirm-listing/:token" element={<ConfirmListing />} />
          <Route path="/employment" element={<Employment />} />
          <Route path="/employment-resources" element={<EmploymentResources />} />

          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
