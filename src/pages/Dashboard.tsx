import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { KPICard } from "@/components/dashboard/KPICard";
import { StudentCard } from "@/components/dashboard/StudentCard";
import { StudentListModal } from "@/components/dashboard/StudentListModal";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface KPIData {
  totalStudents: number;
  activeStudents: number;
  amountDue: number;
  revenueCollected: number;
  needsAttention: number;
  newThisWeek: number;
}

interface Student {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  plan_name: string;
  plan_amount: number;
  current_status: string;
  joining_date: string;
  amountDue?: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPIData>({
    totalStudents: 0,
    activeStudents: 0,
    amountDue: 0,
    revenueCollected: 0,
    needsAttention: 0,
    newThisWeek: 0,
  });
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [activeStudentsList, setActiveStudentsList] = useState<Student[]>([]);
  const [dueStudentsList, setDueStudentsList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(false);
  const [dueModal, setDueModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all students
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (studentsError) throw studentsError;

      // Fetch all payments
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount, student_id");

      if (paymentsError) throw paymentsError;

      // Calculate KPIs
      const totalStudents = students?.length || 0;
      const activeStudents = students?.filter(
        (s) => s.current_status !== "completed"
      ).length || 0;

      const paymentsByStudent = payments?.reduce((acc, p) => {
        acc[p.student_id] = (acc[p.student_id] || 0) + p.amount;
        return acc;
      }, {} as Record<string, number>) || {};

      const revenueCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      
      const amountDue = students?.reduce((sum, s) => {
        const paid = paymentsByStudent[s.id] || 0;
        return sum + Math.max(0, s.plan_amount - paid);
      }, 0) || 0;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const newThisWeek = students?.filter(
        (s) => new Date(s.joining_date) >= oneWeekAgo
      ).length || 0;

      setKpis({
        totalStudents,
        activeStudents,
        amountDue,
        revenueCollected,
        needsAttention: 0, // To be implemented with follow-ups logic
        newThisWeek,
      });

      // Get recent 5 students with their due amounts
      const recentWithDue = students?.slice(0, 5).map(s => ({
        ...s,
        amountDue: Math.max(0, s.plan_amount - (paymentsByStudent[s.id] || 0))
      })) || [];

      const allWithDue = students?.map(s => ({
        ...s,
        amountDue: Math.max(0, s.plan_amount - (paymentsByStudent[s.id] || 0))
      })) || [];

      const activeList = allWithDue.filter(s => s.current_status !== "completed");
      const dueList = allWithDue.filter(s => (s.amountDue || 0) > 0);

      setRecentStudents(recentWithDue as any);
      setAllStudents(allWithDue as any);
      setActiveStudentsList(activeList as any);
      setDueStudentsList(dueList as any);
    } catch (error: any) {
      toast.error("Failed to load dashboard data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">

        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard
              title="Total Students"
              value={kpis.totalStudents}
              icon={Users}
            />
            <div onClick={() => setActiveModal(true)} className="cursor-pointer">
              <KPICard
                title="Active Students"
                value={kpis.activeStudents}
                icon={UserCheck}
              />
            </div>
            <div onClick={() => setDueModal(true)} className="cursor-pointer">
              <KPICard
                title="Amount Due"
                value={`₹${kpis.amountDue.toLocaleString()}`}
                icon={AlertCircle}
                className="border-warning/20"
              />
            </div>
            <KPICard
              title="Revenue Collected"
              value={`₹${kpis.revenueCollected.toLocaleString()}`}
              icon={DollarSign}
              className="border-success/20"
            />
            <KPICard
              title="New This Week"
              value={kpis.newThisWeek}
              icon={TrendingUp}
              className="border-primary/20"
            />
          </div>

          {/* Recent Students Section */}
          <div className="space-y-4">
          <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recently Added Students</h2>
              <Button onClick={() => navigate("/students")}>
                <Users className="h-4 w-4 mr-2" />
                View All Students
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  id={student.id}
                  fullName={student.full_name}
                  phone={student.phone}
                  email={student.email || undefined}
                  planName={student.plan_name}
                  status={student.current_status}
                  joiningDate={student.joining_date}
                  amountDue={student.amountDue || 0}
                />
              ))}
            </div>

            {recentStudents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students yet. Add your first student to get started!</p>
              </div>
            )}
          </div>
        </div>

        <StudentListModal
          open={activeModal}
          onOpenChange={setActiveModal}
          title="Active Students"
          students={activeStudentsList}
        />

        <StudentListModal
          open={dueModal}
          onOpenChange={setDueModal}
          title="Students with Amount Due"
          students={dueStudentsList}
        />
      </div>
    </AuthGuard>
  );
};

export default Dashboard;
