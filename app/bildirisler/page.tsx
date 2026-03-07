import { Metadata } from "next";
import { NotificationsClient } from "@/components/NotificationsClient";
import { ProfileShell } from "@/components/ProfileShell";

export const metadata: Metadata = { title: "Bildirişlər" };

export default function Page() {
  return (
    <ProfileShell
      active="bildirisler"
      title="Bildirişlər"
      desc="Elan statusları və təhlükəsizlik bildirişləri burada görünür. Mail göndərilmir."
    >
      <NotificationsClient />
    </ProfileShell>
  );
}
