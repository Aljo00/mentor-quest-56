import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare } from "lucide-react";
import { z } from "zod";

const followUpSchema = z.object({
  note: z.string().trim().min(1, "Note is required").max(1000),
});

interface FollowUp {
  id: string;
  note: string;
  created_at: string;
}

interface StudentFollowUpsSectionProps {
  studentId: string;
}

export const StudentFollowUpsSection = ({ studentId }: StudentFollowUpsSectionProps) => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchFollowUps = async () => {
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFollowUps(data);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!note.trim()) {
      setErrors({ note: "Follow-up note is required" });
      return;
    }

    setLoading(true);

    try {
      const validated = followUpSchema.parse({ note });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("follow_ups").insert([{
        student_id: studentId,
        created_by: user.id,
        note: validated.note,
      }]);

      if (error) throw error;

      // Log follow-up in audit
      await supabase.from("student_audit_log").insert([{
        student_id: studentId,
        changed_by: user.id,
        change_type: "follow_up_created",
        description: "Follow-up note added",
      }]);

      toast({
        title: "Success",
        description: "Follow-up added successfully",
      });

      setOpen(false);
      setNote("");
      setErrors({});
      fetchFollowUps();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setErrors({ [firstError.path[0]]: firstError.message });
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add follow-up",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Follow-ups</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Follow-up Note</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note">Note *</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (e.target.value.trim()) {
                      const newErrors = { ...errors };
                      delete newErrors.note;
                      setErrors(newErrors);
                    }
                  }}
                  rows={5}
                  placeholder="Enter follow-up details..."
                />
                {errors.note && <p className="text-xs text-destructive">{errors.note}</p>}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Follow-up"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No follow-ups recorded yet</p>
        ) : (
          followUps.map((followUp) => (
            <div key={followUp.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                <p className="text-sm flex-1">{followUp.note}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(followUp.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
