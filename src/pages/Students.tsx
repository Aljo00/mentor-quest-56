import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddStudentDialog } from "@/components/students/AddStudentDialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  phone: string;
  plan_name: string;
  current_status: string;
  plan_amount: number;
  joining_date: string;
}

const statusColors: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  website_work_started: "bg-blue-500/10 text-blue-500",
  store_ready: "bg-purple-500/10 text-purple-500",
  started_selling: "bg-amber-500/10 text-amber-500",
  scaling: "bg-green-500/10 text-green-500",
  completed: "bg-emerald-500/10 text-emerald-500",
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  website_work_started: "Website Work Started",
  store_ready: "Store Ready",
  started_selling: "Started Selling",
  scaling: "Scaling",
  completed: "Completed",
};

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, phone, plan_name, current_status, plan_amount, joining_date")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching students:", error);
    } else {
      setStudents(data || []);
      setFilteredStudents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        (student) =>
          student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.phone.includes(searchTerm)
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, students]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">Students</h1>
          <AddStudentDialog onStudentAdded={fetchStudents} />
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <Card
              key={student.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/students/${student.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-xl">{student.full_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{student.phone}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{student.plan_name}</span>
                  <span className="text-sm font-semibold">₹{student.plan_amount.toLocaleString()}</span>
                </div>
                <Badge className={statusColors[student.current_status]}>
                  {statusLabels[student.current_status]}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Joined: {new Date(student.joining_date).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? "No students found matching your search." : "No students yet. Add your first student to get started!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
