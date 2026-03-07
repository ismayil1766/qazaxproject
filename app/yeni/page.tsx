import { getCategories } from "@/lib/data";
import { NewListingForm } from "@/components/NewListingForm";

// DB oxunuşu var (kateqoriyalar). Build zamanı DATABASE_URL olmaya bilər.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewListingPage() {
  const categories = await getCategories();
  return (
    <div className="rounded-3xl border bg-white p-6">
      <h1 className="text-2xl font-semibold">Elan yerləşdir</h1>
      <div className="mt-6">
        <NewListingForm categories={categories as any} />
      </div>
    </div>
  );
}
