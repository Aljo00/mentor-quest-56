import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.number().min(1, "Amount must be greater than 0"),
  method: z.string().min(1, "Payment method is required"),
  note: z.string().max(500).optional(),
  due_date: z.date().optional(),
});

interface Payment {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  recorded_at: string;
}

interface StudentPaymentsSectionProps {
  studentId: string;
  planAmount: number;
}

export const StudentPaymentsSection = ({ studentId, planAmount }: StudentPaymentsSectionProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    amount: 0,
    method: "",
    note: "",
  });

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", studentId)
      .order("recorded_at", { ascending: false });

    if (!error && data) {
      setPayments(data);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [studentId]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = planAmount - totalPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = paymentSchema.parse({
        ...formData,
        note: formData.note || undefined,
        due_date: dueDate,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("payments").insert([{
        student_id: studentId,
        recorded_by: user.id,
        amount: validated.amount,
        method: validated.method,
        note: validated.note || null,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      setOpen(false);
      setFormData({ amount: 0, method: "", note: "" });
      setDueDate(undefined);
      fetchPayments();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to record payment",
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
        <CardTitle>Payments</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  required
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Payment Method *</Label>
                <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {amountDue - formData.amount > 0 && (
                <div className="space-y-2">
                  <Label>Due Date for Remaining Amount</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Remaining: ₹{(amountDue - formData.amount).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Plan Amount</p>
            <p className="text-lg font-semibold">₹{planAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
            <p className="text-lg font-semibold text-success">₹{totalPaid.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
            <p className="text-lg font-semibold text-warning">₹{amountDue.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-2">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-start p-3 border rounded-lg">
                <div>
                  <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{payment.method}</p>
                  {payment.note && <p className="text-xs text-muted-foreground mt-1">{payment.note}</p>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(payment.recorded_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
