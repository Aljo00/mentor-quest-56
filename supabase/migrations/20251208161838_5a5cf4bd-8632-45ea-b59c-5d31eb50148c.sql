-- Allow superadmins to manage students
CREATE POLICY "Superadmins can manage students" 
ON public.students 
FOR ALL 
USING (is_superadmin(auth.uid()));

-- Allow superadmins to view students
CREATE POLICY "Superadmins can view students" 
ON public.students 
FOR SELECT 
USING (is_superadmin(auth.uid()));

-- Allow superadmins to manage all user_roles
CREATE POLICY "Superadmins can manage all user_roles" 
ON public.user_roles 
FOR ALL 
USING (is_superadmin(auth.uid()));

-- Allow superadmins to manage payments
CREATE POLICY "Superadmins can manage payments" 
ON public.payments 
FOR ALL 
USING (is_superadmin(auth.uid()));

-- Allow superadmins to view payments
CREATE POLICY "Superadmins can view payments" 
ON public.payments 
FOR SELECT 
USING (is_superadmin(auth.uid()));

-- Allow superadmins to manage follow_ups
CREATE POLICY "Superadmins can manage follow_ups" 
ON public.follow_ups 
FOR ALL 
USING (is_superadmin(auth.uid()));

-- Allow superadmins to manage tasks
CREATE POLICY "Superadmins can manage tasks" 
ON public.tasks 
FOR ALL 
USING (is_superadmin(auth.uid()));

-- Allow superadmins to view status_history
CREATE POLICY "Superadmins can view status_history" 
ON public.status_history 
FOR SELECT 
USING (is_superadmin(auth.uid()));

-- Allow superadmins to add status_history
CREATE POLICY "Superadmins can add status_history" 
ON public.status_history 
FOR INSERT 
WITH CHECK (is_superadmin(auth.uid()));

-- Allow superadmins to view audit log
CREATE POLICY "Superadmins can view audit log" 
ON public.student_audit_log 
FOR SELECT 
USING (is_superadmin(auth.uid()));

-- Allow superadmins to manage profiles
CREATE POLICY "Superadmins can manage profiles" 
ON public.profiles 
FOR ALL 
USING (is_superadmin(auth.uid()));