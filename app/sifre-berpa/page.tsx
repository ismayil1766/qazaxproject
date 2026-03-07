import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Şifrə bərpası" };

export default function Page() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold mb-2">Şifrə bərpası</h1>
      <p className="text-sm text-zinc-600 mb-6">
        Telefon nömrənizi yazın. Sorğu admin panelinə düşəcək və admin sizinlə əlaqə saxlayacaq.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
