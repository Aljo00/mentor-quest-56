import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";
import { AuthGuard } from "./components/auth/AuthGuard";
import { Header } from "./components/Header";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <Header />
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/students/:id" element={<StudentProfile />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
