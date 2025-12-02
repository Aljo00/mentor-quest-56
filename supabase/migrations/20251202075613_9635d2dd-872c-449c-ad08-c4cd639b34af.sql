-- Make payment-screenshots bucket public for viewing
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-screenshots';

-- Storage policies for payment screenshots
CREATE POLICY "Authenticated users can upload payment screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots');

CREATE POLICY "Authenticated users can view payment screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-screenshots');

CREATE POLICY "Authenticated users can update payment screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-screenshots');
