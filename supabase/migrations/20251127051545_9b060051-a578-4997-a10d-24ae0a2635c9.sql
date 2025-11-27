-- Create a comprehensive audit log table for all student changes
CREATE TABLE IF NOT EXISTS public.student_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  change_type text NOT NULL, -- 'update', 'status_change', 'delete'
  field_name text,
  old_value text,
  new_value text,
  description text
);

-- Enable RLS
ALTER TABLE public.student_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for audit log
CREATE POLICY "Admins and support can view audit log"
ON public.student_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "System can insert audit log"
ON public.student_audit_log
FOR INSERT
WITH CHECK (true);

-- Create function to log all student changes
CREATE OR REPLACE FUNCTION public.log_student_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  field_name text;
  old_val text;
  new_val text;
BEGIN
  -- Log status changes
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    INSERT INTO public.student_audit_log (student_id, changed_by, change_type, field_name, old_value, new_value, description)
    VALUES (NEW.id, auth.uid(), 'status_change', 'current_status', OLD.current_status::text, NEW.current_status::text, 'Status updated');
  END IF;
  
  -- Log other field changes
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    INSERT INTO public.student_audit_log (student_id, changed_by, change_type, field_name, old_value, new_value, description)
    VALUES (NEW.id, auth.uid(), 'update', 'full_name', OLD.full_name, NEW.full_name, 'Name updated');
  END IF;
  
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    INSERT INTO public.student_audit_log (student_id, changed_by, change_type, field_name, old_value, new_value, description)
    VALUES (NEW.id, auth.uid(), 'update', 'phone', OLD.phone, NEW.phone, 'Phone updated');
  END IF;
  
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO public.student_audit_log (student_id, changed_by, change_type, field_name, old_value, new_value, description)
    VALUES (NEW.id, auth.uid(), 'update', 'email', OLD.email, NEW.email, 'Email updated');
  END IF;
  
  IF OLD.address IS DISTINCT FROM NEW.address THEN
    INSERT INTO public.student_audit_log (student_id, changed_by, change_type, field_name, old_value, new_value, description)
    VALUES (NEW.id, auth.uid(), 'update', 'address', OLD.address, NEW.address, 'Address updated');
  END IF;
  
  IF OLD.plan_name IS DISTINCT FROM NEW.plan_name THEN
    INSERT INTO public.student_audit_log (student_id, changed_by, change_type, field_name, old_value, new_value, description)
    VALUES (NEW.id, auth.uid(), 'update', 'plan_name', OLD.plan_name, NEW.plan_name, 'Plan updated');
  END IF;
  
  IF OLD.plan_amount IS DISTINCT FROM NEW.plan_amount THEN
    INSERT INTO public.student_audit_log (student_id, changed_by, change_type, field_name, old_value, new_value, description)
    VALUES (NEW.id, auth.uid(), 'update', 'plan_amount', OLD.plan_amount::text, NEW.plan_amount::text, 'Plan amount updated');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for student changes
DROP TRIGGER IF EXISTS log_student_changes_trigger ON public.students;
CREATE TRIGGER log_student_changes_trigger
AFTER UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.log_student_changes();

-- Enable realtime for audit log
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_audit_log;