import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddStudentDialog } from "@/components/students/AddStudentDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Home, Download } from "lucide-react";

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
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [amountDueFilter, setAmountDueFilter] = useState<boolean>(false);

  const fetchStudents = async () => {
    setLoading(true);
    const { data: studentsData, error } = await supabase
      .from("students")
      .select("id, full_name, phone, plan_name, current_status, plan_amount, joining_date")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching students:", error);
      setLoading(false);
      return;
    }

    // Fetch payments to calculate amount due
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("student_id, amount");

    const studentsWithDue = (studentsData || []).map(student => {
      const studentPayments = paymentsData?.filter(p => p.student_id === student.id) || [];
      const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      const amountDue = student.plan_amount - totalPaid;
      return { ...student, amount_due: amountDue };
    });

    setStudents(studentsWithDue as any);
    setFilteredStudents(studentsWithDue as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    let filtered = [...students];

    // Search filter
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (student) =>
          student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.phone.includes(searchTerm)
      );
    }

    // Plan filter
    if (planFilter !== "all") {
      filtered = filtered.filter(student => student.plan_name === planFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(student => student.current_status === statusFilter);
    }

    // Amount due filter
    if (amountDueFilter) {
      filtered = filtered.filter((student: any) => student.amount_due > 0);
    }

    setFilteredStudents(filtered);
  }, [searchTerm, students, planFilter, statusFilter, amountDueFilter]);

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

  const handleExport = (format: 'csv' | 'json') => {
    const dataToExport = filteredStudents.map(s => ({
      Name: s.full_name,
      Phone: s.phone,
      Plan: s.plan_name,
      Amount: s.plan_amount,
      Status: statusLabels[s.current_status],
      'Joining Date': new Date(s.joining_date).toLocaleDateString()
    }));

    if (format === 'csv') {
      const headers = Object.keys(dataToExport[0] || {}).join(',');
      const rows = dataToExport.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const json = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">Students</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button variant="outline" onClick={() => handleExport('csv')} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('json')} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <AddStudentDialog onStudentAdded={fetchStudents} />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="Learning Pack">Learning Pack</SelectItem>
                <SelectItem value="Starter Kit">Starter Kit</SelectItem>
                <SelectItem value="Branded DS">Branded DS</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="website_work_started">Website Work Started</SelectItem>
                <SelectItem value="store_ready">Store Ready</SelectItem>
                <SelectItem value="started_selling">Started Selling</SelectItem>
                <SelectItem value="scaling">Scaling</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={amountDueFilter ? "default" : "outline"}
              onClick={() => setAmountDueFilter(!amountDueFilter)}
              className="w-full"
            >
              {amountDueFilter ? "Showing" : "Show"} Amount Due Only
            </Button>
          </div>
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
