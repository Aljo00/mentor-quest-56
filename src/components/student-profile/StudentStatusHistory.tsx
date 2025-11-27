import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, User } from "lucide-react";

interface StatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
  user_email?: string;
}

interface StudentStatusHistoryProps {
  studentId: string;
}

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  website_work_started: "Website Work Started",
  store_ready: "Store Ready",
  started_selling: "Started Selling",
  scaling: "Scaling",
  completed: "Completed",
};

const statusColors: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  website_work_started: "bg-blue-500/10 text-blue-500",
  store_ready: "bg-primary/10 text-primary",
  started_selling: "bg-primary/20 text-primary",
  scaling: "bg-purple-500/10 text-purple-500",
  completed: "bg-success/10 text-success",
};

export const StudentStatusHistory = ({ studentId }: StudentStatusHistoryProps) => {
  const [history, setHistory] = useState<StatusHistory[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: historyData, error: historyError } = await supabase
        .from("status_history")
        .select("*")
        .eq("student_id", studentId)
        .order("changed_at", { ascending: false });

      if (historyError) {
        console.error("Error fetching history:", historyError);
        return;
      }

      // Fetch user emails for each history entry
      if (historyData && historyData.length > 0) {
        const userIds = [...new Set(historyData.map(h => h.changed_by))];
        
        // Try to get user info from auth
        const { data: { users } } = await supabase.auth.admin.listUsers();
        
        const emailMap: Record<string, string> = {};
        if (users) {
          users.forEach((user: { id: string; email?: string }) => {
            emailMap[user.id] = user.email || 'Unknown';
          });
        }

        const enrichedHistory = historyData.map(h => ({
          ...h,
          user_email: emailMap[h.changed_by] || 'Unknown User'
        }));

        setHistory(enrichedHistory);
      }
    };

    fetchHistory();

    // Set up real-time subscription
    const channel = supabase
      .channel(`status_history_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'status_history',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  if (history.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={item.id} className="relative pl-6 pb-4">
              {index !== history.length - 1 && (
                <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-border" />
              )}
              <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-primary" />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.old_status && (
                    <>
                      <Badge className={statusColors[item.old_status]}>
                        {statusLabels[item.old_status]}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </>
                  )}
                  <Badge className={statusColors[item.new_status]}>
                    {statusLabels[item.new_status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{item.user_email}</span>
                  <span>•</span>
                  <span>{new Date(item.changed_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
