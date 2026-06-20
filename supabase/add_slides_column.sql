-- Run this after the other two schema files.
-- Adds a dedicated column for the PowerPoint/slides link,
-- separate from the video media_link.

alter table studies add column if not exists slides_link text;
