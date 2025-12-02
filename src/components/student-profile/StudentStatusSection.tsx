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
  { value: "website_work_started", label: "Website Work Started" },
  { value: "store_ready", label: "Store Ready" },
  { value: "started_selling", label: "Started Selling" },
  { value: "scaling", label: "Scaling" },
  { value: "completed", label: "Completed" },
];

const statusColors: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  website_work_started: "bg-blue-500/10 text-blue-500",
  store_ready: "bg-purple-500/10 text-purple-500",
  started_selling: "bg-amber-500/10 text-amber-500",
  scaling: "bg-green-500/10 text-green-500",
  completed: "bg-emerald-500/10 text-emerald-500",
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
