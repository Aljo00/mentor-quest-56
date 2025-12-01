import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, CalendarIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const studentSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(1, "Phone is required").max(20),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  plan_name: z.string().trim().min(1, "Plan is required").max(100),
  first_payment: z.number().min(1, "First payment amount is required"),
  payment_method: z.string().trim().min(1, "Payment method is required"),
  payment_note: z.string().trim().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface AddStudentDialogProps {
  onStudentAdded?: () => void;
}

export const AddStudentDialog = ({ onStudentAdded }: AddStudentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [dueDate, setDueDate] = useState<Date>();
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const planOptions = [
    { name: "Learning Pack", amount: 2999 },
    { name: "Starter Kit", amount: 6999 },
    { name: "Branded DS", amount: 7999 },
  ];
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    plan_name: "",
    first_payment: "",
    payment_method: "",
    payment_note: "",
  });

  const validateField = (name: string, value: any) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case "full_name":
        if (!value.trim()) newErrors.full_name = "Name is required";
        else delete newErrors.full_name;
        break;
      case "phone":
        if (!value.trim()) newErrors.phone = "Phone is required";
        else delete newErrors.phone;
        break;
      case "email":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = "Invalid email address";
        } else delete newErrors.email;
        break;
      case "plan_name":
        if (!value) newErrors.plan_name = "Plan is required";
        else delete newErrors.plan_name;
        break;
      case "first_payment":
        if (!value || parseFloat(value) <= 0) {
          newErrors.first_payment = "First payment is required";
        } else delete newErrors.first_payment;
        break;
      case "payment_method":
        if (!value.trim()) newErrors.payment_method = "Payment method is required";
        else delete newErrors.payment_method;
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
    Object.keys(formData).forEach(key => {
      validateField(key, formData[key as keyof typeof formData]);
    });

    if (!dueDate) {
      setErrors(prev => ({ ...prev, dueDate: "Due date is required" }));
      return;
    }

    if (!screenshot) {
      toast({
        title: "Screenshot Required",
        description: "Please upload a payment screenshot",
        variant: "destructive",
      });
      return;
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const validated = studentSchema.parse({
        ...formData,
        first_payment: parseFloat(formData.first_payment),
        email: formData.email || undefined,
        address: formData.address || undefined,
        payment_note: formData.payment_note || undefined,
      });
      
      const selectedPlan = planOptions.find(p => p.name === validated.plan_name);
      if (!selectedPlan) {
        throw new Error("Invalid plan selected");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert student
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .insert([{
          full_name: validated.full_name,
          phone: validated.phone,
          email: validated.email || null,
          address: validated.address || null,
          plan_name: validated.plan_name,
          plan_amount: selectedPlan.amount,
        }])
        .select()
        .single();

      if (studentError) throw studentError;

      // Upload screenshot
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${studentData.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(fileName);

      // Insert payment
      const { error: paymentError } = await supabase.from("payments").insert([{
        student_id: studentData.id,
        amount: validated.first_payment,
        method: validated.payment_method,
        note: validated.payment_note || null,
        recorded_by: user.id,
        screenshot_url: publicUrl,
      }]);

      if (paymentError) throw paymentError;

      // Log to audit
      await supabase.from("student_audit_log").insert([{
        student_id: studentData.id,
        changed_by: user.id,
        change_type: "created",
        description: "Student created",
      }]);

      toast({
        title: "Success",
        description: "Student added successfully",
      });

      setOpen(false);
      setFormData({
        full_name: "",
        phone: "",
        email: "",
        address: "",
        plan_name: "",
        first_payment: "",
        payment_method: "",
        payment_note: "",
      });
      setDueDate(undefined);
      setScreenshot(null);
      setErrors({});
      
      onStudentAdded?.();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setErrors({ [firstError.path[0]]: firstError.message });
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add student",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan_name">Select Plan *</Label>
            <Select 
              value={formData.plan_name} 
              onValueChange={(value) => handleInputChange("plan_name", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {planOptions.map((plan) => (
                  <SelectItem key={plan.name} value={plan.name}>
                    {plan.name} - ₹{plan.amount.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.plan_name && <p className="text-xs text-destructive">{errors.plan_name}</p>}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Initial Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_payment">First Payment Amount *</Label>
                <Input
                  id="first_payment"
                  type="number"
                  value={formData.first_payment}
                  onChange={(e) => handleInputChange("first_payment", e.target.value)}
                  placeholder="Enter amount"
                />
                {errors.first_payment && <p className="text-xs text-destructive">{errors.first_payment}</p>}
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
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
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(value) => handleInputChange("payment_method", value)}
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
                {errors.payment_method && <p className="text-xs text-destructive">{errors.payment_method}</p>}
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
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="payment_note">Payment Note</Label>
              <Textarea
                id="payment_note"
                value={formData.payment_note}
                onChange={(e) => handleInputChange("payment_note", e.target.value)}
                rows={2}
                placeholder="Optional note about the payment"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
