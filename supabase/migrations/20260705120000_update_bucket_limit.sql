-- Update the videos storage bucket limit to 10 GB (10737418240 bytes)
UPDATE storage.buckets SET file_size_limit = 10737418240 WHERE id = 'videos';
