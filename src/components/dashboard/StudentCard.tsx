import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StudentCardProps {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  planName: string;
  status: string;
  joiningDate: string;
  amountDue: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-status-not-started text-white" },
  website_work_started: { label: "Website Work", className: "bg-status-in-progress text-white" },
  store_ready: { label: "Store Ready", className: "bg-status-store-ready text-white" },
  started_selling: { label: "Selling", className: "bg-status-selling text-white" },
  scaling: { label: "Scaling", className: "bg-status-scaling text-white" },
  completed: { label: "Completed", className: "bg-status-completed text-white" },
};

export const StudentCard = ({
  id,
  fullName,
  phone,
  email,
  planName,
  status,
  joiningDate,
  amountDue,
}: StudentCardProps) => {
  const navigate = useNavigate();
  const statusInfo = statusConfig[status] || statusConfig.not_started;

  return (
    <Card className="shadow-card hover:shadow-elevated transition-all">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg text-foreground">{fullName}</h3>
              <p className="text-sm text-muted-foreground">{planName}</p>
            </div>
            <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{phone}</span>
            </div>
            {email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{email}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm">
              <p className="text-muted-foreground">Joined</p>
              <p className="font-medium text-foreground">
                {new Date(joiningDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-sm text-right">
              <p className="text-muted-foreground">Amount Due</p>
              <p className={`font-semibold ${amountDue > 0 ? "text-warning" : "text-success"}`}>
                ₹{amountDue.toLocaleString()}
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate(`/students/${id}`)}
            className="w-full"
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
