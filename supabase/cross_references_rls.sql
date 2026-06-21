-- Allow admins to manage cross-references
create policy "Admins can insert cross_references"
  on cross_references for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete cross_references"
  on cross_references for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update cross_references"
  on cross_references for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
