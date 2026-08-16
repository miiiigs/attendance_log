import { CredentialsPanel } from "../../../../components/credentials-panel";
import { EmployeeForm } from "../../../../components/employee-form";
import { getEmployeeById } from "../../../../lib/data/admin";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await getEmployeeById(id);

  if (!person) {
    return (
      <section className="admin-card p-6">
        <p className="text-sm text-[var(--muted)]">Person not found.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div>
          <p className="admin-eyebrow">People</p>
          <h1 className="admin-page-title mt-3">Edit person</h1>
          <p className="admin-page-subtitle mt-2">Update profile details or account status for this person.</p>
        </div>
        <EmployeeForm
          mode="edit"
          person={{
            id: person.id,
            username: person.username,
            firstName: person.first_name,
            lastName: person.last_name,
            email: person.email,
            status: person.status,
          }}
        />
      </section>

      <section className="admin-card p-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Account information</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          Generate a new temporary password when this person needs fresh credentials. The previous password will be invalidated, and if automated email is unavailable you can still send the prepared message manually.
        </p>

        <CredentialsPanel personId={person.id} />
      </section>
    </div>
  );
}
