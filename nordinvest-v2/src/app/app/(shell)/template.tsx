import { PageTransition } from "@/components/PageTransition";

/* Inside the app the sidebar stays put; only the page content eases in. */
export default function ShellTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition kind="page-rise">{children}</PageTransition>;
}
