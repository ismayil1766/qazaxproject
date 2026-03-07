// Small shared helper that is safe to import from client components.
// Keep this file free of heavy JSON imports to avoid bloating the client bundle.

export function uniqSorted(items: string[]) {
  const set = new Set<string>();
  for (const i of items) if (i) set.add(i);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
