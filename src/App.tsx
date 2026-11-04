import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import { FeedbackBubble } from "@/components/FeedbackBubble";

// Pages other than the home page are loaded on demand, so visitors don't
// download admin-only code (charts, PDF/Excel export) just to browse listings.
const Opportunities = lazy(() => import("./pages/Opportunities"));
const ListOpportunity = lazy(() => import("./pages/ListOpportunity"));
const EditOpportunity = lazy(() => import("./pages/EditOpportunity"));
const ConfirmListing = lazy(() => import("./pages/ConfirmListing"));
const Admin = lazy(() => import("./pages/Admin"));
const Employment = lazy(() => import("./pages/Employment"));
const EmploymentResources = lazy(() => import("./pages/EmploymentResources"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoading = () => (
  <div className="flex min-h-screen items-center justify-center text-muted-foreground" role="status">
    Loading…
  </div>
);


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
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
        </Suspense>
        <FeedbackBubble />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
