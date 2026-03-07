import { Metadata } from "next";
import { ProfilePageClient } from "@/components/ProfilePageClient";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Profil" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProfilePageClient />
    </Suspense>
  );
}
