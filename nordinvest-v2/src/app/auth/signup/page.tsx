import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Opret gratis konto",
  description: "Opret en gratis NordInvest-konto med LinkedIn eller Google — 3 gratis analyser om måneden.",
};

export default function SignupPage() {
  return <AuthCard mode="signup" />;
}
