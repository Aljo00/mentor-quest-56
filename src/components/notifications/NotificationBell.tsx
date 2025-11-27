import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: "due_date" | "overdue" | "follow_up";
  student_id: string;
  student_name: string;
  message: string;
  date?: string;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const notifications: Notification[] = [];

    // Fetch overdue payments
    const { data: overduePayments } = await supabase
      .from("payments")
      .select("student_id, due_date, students(id, full_name)")
      .lt("due_date", now.toISOString())
      .is("paid", false);

    if (overduePayments) {
      overduePayments.forEach((payment: any) => {
        if (payment.students) {
          notifications.push({
            id: `overdue-${payment.student_id}`,
            type: "overdue",
            student_id: payment.student_id,
            student_name: payment.students.full_name,
            message: `Overdue payment`,
            date: payment.due_date,
          });
        }
      });
    }

    // Fetch upcoming due dates (within 3 days)
    const { data: upcomingPayments } = await supabase
      .from("payments")
      .select("student_id, due_date, students(id, full_name)")
      .gte("due_date", now.toISOString())
      .lte("due_date", threeDaysFromNow.toISOString())
      .is("paid", false);

    if (upcomingPayments) {
      upcomingPayments.forEach((payment: any) => {
        if (payment.students) {
          notifications.push({
            id: `due-${payment.student_id}`,
            type: "due_date",
            student_id: payment.student_id,
            student_name: payment.students.full_name,
            message: `Payment due soon`,
            date: payment.due_date,
          });
        }
      });
    }

    // Fetch students needing follow-ups (no follow-up in last 7 days)
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name");

    if (students) {
      for (const student of students) {
        const { data: lastFollowUp } = await supabase
          .from("follow_ups")
          .select("created_at")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (
          !lastFollowUp ||
          new Date(lastFollowUp.created_at) < sevenDaysAgo
        ) {
          notifications.push({
            id: `followup-${student.id}`,
            type: "follow_up",
            student_id: student.id,
            student_name: student.full_name,
            message: `Needs follow-up (7+ days)`,
          });
        }
      }
    }

    setNotifications(notifications);
    setUnreadCount(notifications.length);
  };

  useEffect(() => {
    fetchNotifications();

    // Refresh notifications every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "overdue":
        return "text-red-500";
      case "due_date":
        return "text-amber-500";
      case "follow_up":
        return "text-blue-500";
      default:
        return "text-foreground";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="cursor-pointer"
              onClick={() => navigate(`/students/${notification.student_id}`)}
            >
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{notification.student_name}</span>
                  {notification.date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <span className={`text-sm ${getNotificationColor(notification.type)}`}>
                  {notification.message}
                </span>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
