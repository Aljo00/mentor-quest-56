import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Students = () => {
  const navigate = useNavigate();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card shadow-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">All Students</h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <p className="text-muted-foreground">Student list coming soon...</p>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Students;
