import type { Metadata } from "next";
import { LoginLanding } from "@/components/buyer/LoginLanding";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log ind" };

/** The link in the login mail. Opening it changes nothing; the page posts the code (by itself, or with the button). */
export default function LoginPage({ params, searchParams }: { params: { code: string }; searchParams: { fejl?: string } }) {
  return <LoginLanding code={params.code} failed={!!searchParams.fejl} />;
}
