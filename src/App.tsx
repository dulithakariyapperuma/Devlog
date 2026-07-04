import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import Join from "./pages/Join";

const queryClient = new QueryClient();

import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";

function AppRoutes() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Connecting to DevLog…</p>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/join/:token" element={<Join />} />
        
        {/* Protected Routes (fallback to Login if not authenticated) */}
        <Route path="/" element={currentUser ? <Index /> : <LoginPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={currentUser ? <AdminProtectedRoute /> : <LoginPage />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            {/* Future admin routes will go here */}
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ChatProvider>
  );
}

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
