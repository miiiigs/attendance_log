import { EmployeeForm } from "../../../../components/employee-form";

export default function NewPersonPage() {
  return (
    <section className="space-y-5">
      <div>
        <p className="admin-eyebrow">People</p>
        <h1 className="admin-page-title mt-3">Add person</h1>
        <p className="admin-page-subtitle mt-2">Register a new attendance account and prepare onboarding credentials.</p>
      </div>
      <EmployeeForm mode="create" />
    </section>
  );
}
