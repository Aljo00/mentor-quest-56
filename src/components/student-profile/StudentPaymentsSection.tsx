import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, CalendarIcon, Upload, Eye, Trash2, Loader2 } from "lucide-react";
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
  screenshot_url: string | null;
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
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: "",
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

  useEffect(() => {
    if (open && amountDue > 0) {
      setFormData(prev => ({ ...prev, amount: amountDue.toString() }));
    }
  }, [open, amountDue]);

  const validateField = (name: string, value: any) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case "amount":
        const numAmount = parseFloat(value);
        if (!value || numAmount <= 0) {
          newErrors.amount = "Amount is required and must be greater than 0";
        } else if (numAmount > amountDue) {
          newErrors.amount = `Amount cannot exceed due amount of ₹${amountDue.toLocaleString()}`;
        } else {
          delete newErrors.amount;
        }
        break;
      case "method":
        if (!value) newErrors.method = "Payment method is required";
        else delete newErrors.method;
        break;
    }
    
    setErrors(newErrors);
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    validateField("amount", formData.amount);
    validateField("method", formData.method);

    if (!screenshot) {
      toast.error("Please upload a payment screenshot");
      return;
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const validated = paymentSchema.parse({
        amount: parseFloat(formData.amount),
        method: formData.method,
        note: formData.note || undefined,
        due_date: dueDate,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload screenshot
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${studentId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(fileName);

      const { error } = await supabase.from("payments").insert([{
        student_id: studentId,
        recorded_by: user.id,
        amount: validated.amount,
        method: validated.method,
        note: validated.note || null,
        screenshot_url: publicUrl,
      }]);

      if (error) throw error;

      // Log payment in audit
      await supabase.from("student_audit_log").insert([{
        student_id: studentId,
        changed_by: user.id,
        change_type: "payment_added",
        description: `Payment of ₹${validated.amount} recorded`,
      }]);

      toast.success("Payment recorded successfully");

      setOpen(false);
      setFormData({ amount: "", method: "", note: "" });
      setDueDate(undefined);
      setScreenshot(null);
      setErrors({});
      fetchPayments();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setErrors({ [firstError.path[0]]: firstError.message });
        toast.error(firstError.message);
      } else {
        toast.error("Failed to record payment");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    setDeletingPaymentId(paymentId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      // Log deletion in audit
      await supabase.from("student_audit_log").insert([{
        student_id: studentId,
        changed_by: user.id,
        change_type: "payment_deleted",
        description: `Payment of ₹${amount} deleted`,
      }]);

      toast.success("Payment deleted successfully");
      fetchPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    } finally {
      setDeletingPaymentId(null);
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
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="Enter amount"
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
                {amountDue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Amount due: ₹{amountDue.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Payment Method *</Label>
                <Select 
                  value={formData.method} 
                  onValueChange={(value) => handleInputChange("method", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
                {errors.method && <p className="text-xs text-destructive">{errors.method}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="screenshot">Payment Screenshot *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('screenshot')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {screenshot ? screenshot.name : "Upload Screenshot"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => handleInputChange("note", e.target.value)}
                  rows={3}
                  placeholder="Optional note about the payment"
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
                <div className="flex-1">
                  <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{payment.method}</p>
                  {payment.note && <p className="text-xs text-muted-foreground mt-1">{payment.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {payment.screenshot_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImageLoading(true);
                        setViewScreenshot(payment.screenshot_url);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingPaymentId === payment.id}
                      >
                        {deletingPaymentId === payment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this payment of ₹{payment.amount.toLocaleString()}? 
                          This amount will be added back to the due amount.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePayment(payment.id, payment.amount)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.recorded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Screenshot View Modal */}
        <Dialog open={!!viewScreenshot} onOpenChange={() => setViewScreenshot(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Payment Screenshot</DialogTitle>
            </DialogHeader>
            {viewScreenshot && (
              <div className="flex items-center justify-center min-h-[200px]">
                {imageLoading && (
                  <div className="absolute flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading image...</p>
                  </div>
                )}
                <img 
                  src={viewScreenshot} 
                  alt="Payment Screenshot" 
                  className={cn(
                    "max-w-full max-h-[70vh] object-contain rounded-lg transition-opacity",
                    imageLoading ? "opacity-0" : "opacity-100"
                  )}
                  onLoad={() => setImageLoading(false)}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
