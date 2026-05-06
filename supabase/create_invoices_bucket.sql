-- Create the 'invoices' storage bucket for invoice images
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own invoices
create policy "Users can upload invoices"
  on storage.objects for insert
  with check (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to all invoices
create policy "Public read access for invoices"
  on storage.objects for select
  using (bucket_id = 'invoices');

-- Allow users to delete their own invoices
create policy "Users can delete own invoices"
  on storage.objects for delete
  using (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
