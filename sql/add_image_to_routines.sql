-- Add image_url to routines table
alter table routines 
add column if not exists image_url text;
