import { redirect } from "next/navigation";

export default function NewEmployeeRedirectPage() {
  redirect("/people/new");
}
