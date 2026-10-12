import { redirect } from "next/navigation";

/* Accounts are created by invitation only. Anyone who wants in asks for access. */
export default function SignupPage() {
  redirect("/adgang");
}
