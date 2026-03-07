import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Vehicles({
  searchParams,
}: {
  searchParams: { q?: string; city?: string; category?: string; make?: string; model?: string; yearFrom?: string; yearTo?: string };
}) {
  const sp = new URLSearchParams();
  sp.set("tab", "vehicle");

  if (searchParams?.q) sp.set("q", searchParams.q);
  if (searchParams?.city) sp.set("city", searchParams.city);

  // Keep same names used previously
  if (searchParams?.category) sp.set("category", searchParams.category);
  if (searchParams?.make) sp.set("make", searchParams.make);
  if (searchParams?.model) sp.set("model", searchParams.model);
  if (searchParams?.yearFrom) sp.set("yearFrom", searchParams.yearFrom);
  if (searchParams?.yearTo) sp.set("yearTo", searchParams.yearTo);

  redirect(`/elanlar?${sp.toString()}`);
}
