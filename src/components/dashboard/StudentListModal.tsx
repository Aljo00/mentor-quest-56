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
  not_started: "bg-muted/50 text-muted-foreground",
  whatsapp_group_added: "bg-blue-500/5 text-blue-400",
  course_completed: "bg-purple-500/5 text-purple-400",
  website_completed: "bg-amber-500/5 text-amber-400",
  selling_initiated: "bg-cyan-500/5 text-cyan-400",
  completed: "bg-emerald-500/5 text-emerald-400",
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  whatsapp_group_added: "WhatsApp Added",
  course_completed: "Course Done",
  website_completed: "Website Done",
  selling_initiated: "Selling",
  completed: "Completed",
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
                  className="flex items-center justify-between p-4 rounded-lg border bg-card cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{student.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{student.phone}</p>
                    <p className="text-sm text-muted-foreground">{student.plan_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={statusColors[student.current_status] || "bg-muted"}>
                      {statusLabels[student.current_status] || student.current_status}
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
