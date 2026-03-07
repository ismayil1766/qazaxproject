export function Footer() {
  return (
    <footer className="hidden sm:block border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-zinc-600 flex flex-col gap-2">
        <p>© {new Date().getFullYear()} Şəhər Elanları. Bütün hüquqlar qorunur.</p>
      </div>
    </footer>
  );
}
