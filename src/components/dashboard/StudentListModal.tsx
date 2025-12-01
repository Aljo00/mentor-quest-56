import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  full_name: string;
  phone: string;
  current_status: string;
  plan_name: string;
  amountDue?: number;
}

interface StudentListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  students: Student[];
}

const statusColors: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  website_work_started: "bg-blue-500/10 text-blue-500",
  store_ready: "bg-primary/10 text-primary",
  started_selling: "bg-primary/20 text-primary",
  scaling: "bg-purple-500/10 text-purple-500",
  completed: "bg-success/10 text-success",
};

export const StudentListModal = ({ open, onOpenChange, title, students }: StudentListModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2">
            {students.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No students found</p>
            ) : (
              students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => {
                    navigate(`/students/${student.id}`);
                    onOpenChange(false);
                  }}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{student.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{student.phone}</p>
                    <p className="text-sm text-muted-foreground">{student.plan_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={statusColors[student.current_status] || "bg-muted"}>
                      {student.current_status.replace(/_/g, " ")}
                    </Badge>
                    {student.amountDue !== undefined && student.amountDue > 0 && (
                      <span className="text-sm font-medium text-warning">
                        ₹{student.amountDue.toLocaleString()} due
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};