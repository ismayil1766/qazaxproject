import { Metadata } from "next";
import { FavoritesClient } from "@/components/FavoritesClient";
import { ProfileShell } from "@/components/ProfileShell";

export const metadata: Metadata = { title: "Seçilmişlər" };

export default function Page() {
  return (
    <ProfileShell active="secilmisler" title="Seçilmişlər" desc="Bəyəndiyin elanları burada saxla və sonra rahat bax.">
      <FavoritesClient />
    </ProfileShell>
  );
}
