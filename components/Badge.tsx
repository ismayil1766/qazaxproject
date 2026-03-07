import { cn } from "@/lib/utils";

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "vip" | "premium" | "urgent" }) {
  const cls =
    variant === "vip"
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : variant === "premium"
      ? "bg-indigo-100 text-indigo-900 border-indigo-200"
      : variant === "urgent"
      ? "bg-rose-100 text-rose-900 border-rose-200"
      : "bg-zinc-100 text-zinc-800 border-zinc-200";

  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cls)}>{children}</span>;
}
