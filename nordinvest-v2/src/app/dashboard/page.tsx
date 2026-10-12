import { redirect } from "next/navigation";

/* Mine ejendomme moved into the app. The app's own gate handles sign-in and access. */
export default function DashboardPage() {
  redirect("/app");
}
