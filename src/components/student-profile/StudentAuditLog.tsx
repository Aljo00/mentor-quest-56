import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { User, Clock } from "lucide-react";

interface AuditLog {
  id: string;
  change_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  changed_at: string;
  changed_by: string;
  user_email?: string;
}

interface StudentAuditLogProps {
  studentId: string;
}

const changeTypeColors: Record<string, string> = {
  created: "bg-green-500/10 text-green-500",
  status_change: "bg-primary/10 text-primary",
  update: "bg-blue-500/10 text-blue-500",
  payment_added: "bg-emerald-500/10 text-emerald-500",
  task_created: "bg-purple-500/10 text-purple-500",
  task_completed: "bg-cyan-500/10 text-cyan-500",
  follow_up_created: "bg-orange-500/10 text-orange-500",
  delete: "bg-red-500/10 text-red-500",
};

const fieldLabels: Record<string, string> = {
  current_status: "Status",
  full_name: "Name",
  phone: "Phone",
  email: "Email",
  address: "Address",
  plan_name: "Plan",
  plan_amount: "Plan Amount",
};

export const StudentAuditLog = ({ studentId }: StudentAuditLogProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data: logsData, error: logsError } = await supabase
        .from("student_audit_log")
        .select("*")
        .eq("student_id", studentId)
        .order("changed_at", { ascending: false });

      if (logsError) {
        console.error("Error fetching audit logs:", logsError);
        setLoading(false);
        return;
      }

      // Fetch user emails for each log entry
      if (logsData && logsData.length > 0) {
        const userIds = [...new Set(logsData.map((log) => log.changed_by))];

        // Try to get user info from auth
        const { data: { users } } = await supabase.auth.admin.listUsers();

        const emailMap: Record<string, string> = {};
        if (users) {
          users.forEach((user: { id: string; email?: string }) => {
            emailMap[user.id] = user.email || "Unknown";
          });
        }

        const enrichedLogs = logsData.map((log) => ({
          ...log,
          user_email: emailMap[log.changed_by] || "Unknown User",
        }));

        setLogs(enrichedLogs);
      }
      setLoading(false);
    };

    fetchLogs();

    // Set up real-time subscription
    const channel = supabase
      .channel(`audit_log_${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_audit_log",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id} className="relative pl-6 pb-4">
              {index !== logs.length - 1 && (
                <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-border" />
              )}
              <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-primary" />

              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={changeTypeColors[log.change_type] || "bg-muted"}>
                    {log.description || log.change_type}
                  </Badge>
                  {log.field_name && (
                    <span className="text-sm text-muted-foreground">
                      {fieldLabels[log.field_name] || log.field_name}
                    </span>
                  )}
                </div>

                {log.old_value && log.new_value && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">From: </span>
                    <span className="line-through text-muted-foreground">
                      {log.old_value}
                    </span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="text-foreground font-medium">
                      {log.new_value}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{log.user_email}</span>
                  <Clock className="h-3 w-3 ml-2" />
                  <span>{new Date(log.changed_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
