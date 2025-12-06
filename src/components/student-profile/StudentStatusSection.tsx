import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  current_status: string;
}

interface StudentStatusSectionProps {
  student: Student;
  onStatusUpdated: (newStatus: string) => void;
}

const statusOptions = [
  { value: "not_started", label: "Not Started" },
  { value: "whatsapp_group_added", label: "Added to WhatsApp Group" },
  { value: "course_completed", label: "Course Video Access Completed" },
  { value: "website_completed", label: "Website Setup Completed" },
  { value: "selling_initiated", label: "Selling Initiated" },
  { value: "completed", label: "Completed" },
];

const statusColors: Record<string, string> = {
  not_started: "bg-muted/50 text-muted-foreground",
  whatsapp_group_added: "bg-blue-500/5 text-blue-400",
  course_completed: "bg-purple-500/5 text-purple-400",
  website_completed: "bg-amber-500/5 text-amber-400",
  selling_initiated: "bg-cyan-500/5 text-cyan-400",
  completed: "bg-emerald-500/5 text-emerald-400",
};

export const StudentStatusSection = ({ student, onStatusUpdated }: StudentStatusSectionProps) => {
  const [newStatus, setNewStatus] = useState(student.current_status);
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (newStatus === student.current_status) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({ current_status: newStatus as any })
        .eq("id", student.id);

      if (error) throw error;

      toast.success("Status updated successfully");

      onStatusUpdated(newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const currentStatusLabel = statusOptions.find(s => s.value === student.current_status)?.label;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge className={`${statusColors[student.current_status]} text-sm py-1 px-3`}>
          {currentStatusLabel}
        </Badge>

        <div className="space-y-2">
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {newStatus !== student.current_status && (
            <Button
              onClick={handleStatusUpdate}
              disabled={updating}
              className="w-full"
            >
              {updating ? "Updating..." : "Update Status"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
