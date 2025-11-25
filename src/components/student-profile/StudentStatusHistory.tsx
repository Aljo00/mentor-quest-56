import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface StatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
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
  store_ready: "bg-purple-500/10 text-purple-500",
  started_selling: "bg-amber-500/10 text-amber-500",
  scaling: "bg-green-500/10 text-green-500",
  completed: "bg-emerald-500/10 text-emerald-500",
};

export const StudentStatusHistory = ({ studentId }: StudentStatusHistoryProps) => {
  const [history, setHistory] = useState<StatusHistory[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("status_history")
        .select("*")
        .eq("student_id", studentId)
        .order("changed_at", { ascending: false });

      if (!error && data) {
        setHistory(data);
      }
    };

    fetchHistory();
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
                <p className="text-xs text-muted-foreground">
                  {new Date(item.changed_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
