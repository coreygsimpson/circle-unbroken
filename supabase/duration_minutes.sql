-- Repurpose week_number as duration_minutes
-- Run in Supabase SQL Editor

alter table studies rename column week_number to duration_minutes;

-- Optional: clear any leftover week-number values that aren't actual minutes
-- (comment this out if you want to keep existing numbers as-is)
-- update studies set duration_minutes = null where duration_minutes < 5;
