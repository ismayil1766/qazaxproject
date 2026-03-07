import { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Qeydiyyat" };

export default function Page() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold mb-2">Qeydiyyat</h1>
      <p className="text-sm text-zinc-600 mb-6">
        Telefon nömrəsi və şifrə ilə hesab yaradın. Kod təsdiqi tələb olunmur.
      </p>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
