import { NotificationBell } from "./notifications/NotificationBell";
import { Button } from "./ui/button";
import { Home, ListChecks } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
        <NotificationBell />
      </div>
    </header>
  );
};
