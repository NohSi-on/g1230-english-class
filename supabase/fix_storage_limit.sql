-- Update file size limit for textbooks bucket to 500MB (safe for 300MB files)
update storage.buckets
set file_size_limit = 524288000 -- 500MB in bytes
where id = 'textbooks';

-- Keep covers at 10MB
update storage.buckets
set file_size_limit = 10485760 -- 10MB in bytes
where id = 'covers';
