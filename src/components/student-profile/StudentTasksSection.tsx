import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  due_date: z.string().optional(),
});

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
}

interface StudentTasksSectionProps {
  studentId: string;
}

export const StudentTasksSection = ({ studentId }: StudentTasksSectionProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    due_date: "",
  });

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("student_id", studentId)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true });

    if (!error && data) {
      setTasks(data);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setErrors({ title: "Task title is required" });
      return;
    }

    setLoading(true);

    try {
      const validated = taskSchema.parse({
        title: formData.title,
        due_date: formData.due_date || undefined,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("tasks").insert([{
        student_id: studentId,
        title: validated.title,
        due_date: validated.due_date || null,
      }]);

      if (error) throw error;

      // Log task creation in audit
      await supabase.from("student_audit_log").insert([{
        student_id: studentId,
        changed_by: user.id,
        change_type: "task_created",
        description: `Task created: ${validated.title}`,
      }]);

      toast.success("Task added successfully");

      setOpen(false);
      setFormData({ title: "", due_date: "" });
      setErrors({});
      fetchTasks();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setErrors({ [firstError.path[0]]: firstError.message });
        toast.error(firstError.message);
      } else {
        toast.error("Failed to add task");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("tasks")
        .update({
          completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;

      // Log task completion in audit
      if (!currentStatus) {
        const task = tasks.find(t => t.id === taskId);
        await supabase.from("student_audit_log").insert([{
          student_id: studentId,
          changed_by: user.id,
          change_type: "task_completed",
          description: `Task completed: ${task?.title}`,
        }]);
      }

      fetchTasks();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tasks</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (e.target.value.trim()) {
                      const newErrors = { ...errors };
                      delete newErrors.title;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter task title"
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Task"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <button
                onClick={() => toggleTaskComplete(task.id, task.completed)}
                className="mt-0.5 flex-shrink-0"
              >
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1">
                <p className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                {task.due_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </p>
                )}
                {task.completed && task.completed_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Completed: {new Date(task.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
