import { redirect } from "next/navigation";

/* The ejendomsmappe is now the property case inside the app. */
export default function MappePage({ params }: { params: { id: string } }) {
  redirect(`/app/ejendomme/${encodeURIComponent(params.id)}`);
}
