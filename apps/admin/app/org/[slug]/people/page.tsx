import Link from "next/link";
import { getFullName } from "@attendance/shared";
import { getOrgPeople } from "../../../../lib/data/org";
import { requireOrgAdmin } from "../../../../lib/org-auth";

export default async function OrgPeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const { organization } = await requireOrgAdmin(slug);

  const queryParams = await searchParams;
  const query = typeof queryParams.query === "string" ? queryParams.query : "";
  const status = typeof queryParams.status === "string" ? queryParams.status : "all";

  const people = await getOrgPeople(organization.id, { query, status });
  const activeCount = people.filter((person) => person.membershipStatus === "active").length;
  const inactiveCount = people.filter((person) => person.membershipStatus === "inactive").length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-eyebrow">{organization.code}</p>
          <h1 className="admin-page-title mt-3">People</h1>
          <p className="admin-page-subtitle mt-2">Manage members of {organization.name}.</p>
        </div>
        <Link href={`/org/${slug}/people/new`} className="admin-button">
          + Add Person
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <span className="admin-chip admin-chip-success">{activeCount} active</span>
        <span className="admin-chip admin-chip-soft">{inactiveCount} inactive</span>
        <span className="admin-chip admin-chip-soft">{people.length} total</span>
      </div>

      <form className="admin-card grid gap-4 p-4 md:grid-cols-[2fr_1fr_auto] md:items-center">
        <input
          type="text"
          name="query"
          defaultValue={query}
          placeholder="Search people..."
          className="admin-input"
        />
        <select name="status" defaultValue={status} className="admin-select">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="admin-button">Filter</button>
      </form>

      <div className="admin-table-shell">
        {people.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.membershipId} className="admin-table-row">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                          {(person.firstName[0] ?? "").toUpperCase()}
                          {(person.lastName[0] ?? "").toUpperCase()}
                        </div>
                        <span className="font-medium text-[var(--foreground)]">
                          {getFullName(person.firstName, person.lastName) || person.username}
                        </span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-[var(--muted)]">{person.username}</td>
                    <td className="text-sm text-[var(--muted)]">{person.email}</td>
                    <td>
                      <span className="admin-chip admin-chip-soft capitalize">{person.membershipRole.replace("_", " ")}</span>
                    </td>
                    <td>
                      <span className={`admin-chip ${person.membershipStatus === "active" ? "admin-chip-success" : "admin-chip-soft"} capitalize`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${person.membershipStatus === "active" ? "bg-[var(--accent)]" : "bg-[#9da3ad]"}`} />
                        {person.membershipStatus}
                      </span>
                    </td>
                    <td>
                      <Link href={`/org/${slug}/people/${person.userId}`} className="text-sm font-semibold text-[var(--accent)]">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <p className="text-sm font-medium text-[var(--foreground)]">No people match the current filters.</p>
            <p className="text-xs text-[var(--muted)]">Adjust the search or add a new person to continue.</p>
          </div>
        )}
      </div>
    </section>
  );
}
