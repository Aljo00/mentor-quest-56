import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { StudentBasicInfo } from "@/components/student-profile/StudentBasicInfo";
import { StudentStatusSection } from "@/components/student-profile/StudentStatusSection";
import { StudentPaymentsSection } from "@/components/student-profile/StudentPaymentsSection";
import { StudentFollowUpsSection } from "@/components/student-profile/StudentFollowUpsSection";
import { StudentTasksSection } from "@/components/student-profile/StudentTasksSection";
import { StudentAuditLog } from "@/components/student-profile/StudentAuditLog";

interface Student {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  plan_name: string;
  plan_amount: number;
  batch: string | null;
  current_status: string;
  joining_date: string;
  tags: string[] | null;
}

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudent = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching student:", error);
    } else {
      setStudent(data);
    }
    setLoading(false);
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (student) {
      setStudent({ ...student, current_status: newStatus });
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading student...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Student not found</p>
          <Button onClick={() => navigate("/students")}>Back to Students</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/students")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Students
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info & Status */}
          <div className="lg:col-span-1 space-y-6">
            <StudentBasicInfo student={student} onStudentDeleted={() => navigate("/students")} />
            <StudentStatusSection student={student} onStatusUpdated={handleStatusUpdate} />
          </div>

          {/* Right Column - Activity Sections */}
          <div className="lg:col-span-2 space-y-6">
            <StudentPaymentsSection studentId={student.id} planAmount={student.plan_amount} />
            <StudentFollowUpsSection studentId={student.id} />
            <StudentTasksSection studentId={student.id} />
            <StudentAuditLog studentId={student.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
