import { permanentRedirect } from "next/navigation";

/* The draft became the front page. */
export default function DraftHome() {
  permanentRedirect("/");
}
