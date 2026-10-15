import { PageTransition } from "@/components/PageTransition";

/* Public pages fade in on navigation (the app's own pages rise inside the shell). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition kind="page-in">{children}</PageTransition>;
}
