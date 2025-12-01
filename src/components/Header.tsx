import { NotificationBell } from "./notifications/NotificationBell";
import { Button } from "./ui/button";
import { Home, ListChecks, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary">Student Management</h1>
          <div className="flex gap-2">
            {location.pathname !== "/" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            )}
            {location.pathname !== "/students" && !location.pathname.startsWith("/students/") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/students")}
              >
                <ListChecks className="mr-2 h-4 w-4" />
                Students
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
