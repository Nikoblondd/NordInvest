import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Log ind",
  description: "Log ind på NordInvest med LinkedIn eller Google.",
};

export default function LoginPage() {
  return <AuthCard mode="login" />;
}
