create unique index if not exists organization_applications_pending_org_email_uidx
  on public.organization_applications (
    lower(btrim(organization_name)),
    lower(btrim(contact_email))
  )
  where status = 'pending';
