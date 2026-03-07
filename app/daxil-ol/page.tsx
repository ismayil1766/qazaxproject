import { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Daxil ol" };

export default function Page() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold mb-2">Daxil ol</h1>
      <p className="text-sm text-zinc-600 mb-6">
        Telefon nömrəsi və şifrə ilə daxil olun. Elanlar moderasiyadan sonra aktiv olur.
      </p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
