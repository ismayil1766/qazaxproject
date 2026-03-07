import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { isAdminCookieValid, adminUser } from "@/lib/adminAuth";
import { getUserFromRequest } from "@/lib/auth";
import { archiveExpiredListings } from "@/lib/archive";
import AdminLoginClient from "./AdminLoginClient";
import { CITIES, normalizeCity } from "@/lib/cities";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cookieHeaderFromNextCookies() {
  const all = cookies().getAll();
  return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function getListings(args: { status: string; q?: string; city?: string; userId?: string }) {
  const where: any = {};
  if (args.status !== "ALL") where.status = args.status;
  if (args.city) where.city = args.city;
  if (args.userId) where.userId = args.userId;

  if (args.q && args.q.trim()) {
    const q = args.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      city: true,
      type: true,
      status: true,
      createdAt: true,
      rejectReason: true,
      flags: true,
      vipUntil: true,
      premiumUntil: true,
    },
  });

  return items;
}

async function getUsers(args: { q?: string; blocked?: string }) {
  const where: any = {};
  if (args.blocked === "1") where.isBlocked = true;
  if (args.blocked === "0") where.isBlocked = false;

  if (args.q && args.q.trim()) {
    const q = args.q.trim();
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      phone: true,
      isBlocked: true,
      createdAt: true,
    },
  });

  // listingsCount lazımdırsa (admin UI üçün), sadə şəkildə count edirik.
  const withCounts = await Promise.all(
    users.map(async (u) => ({
      ...u,
      listingsCount: await prisma.listing.count({ where: { userId: u.id } }),
    }))
  );

  return withCounts;
}


async function getPasswordResetRequests(args: { q?: string; status?: string }) {
  const where: any = {};
  if (args.status && args.status !== "ALL") where.status = args.status;

  if (args.q && args.q.trim()) {
    const q = args.q.trim();
    where.OR = [
      { phone: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
      { user: { is: { lastName: { contains: q, mode: "insensitive" } } } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
    ];
  }

  return prisma.passwordResetRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          phone: true,
          createdAt: true,
        },
      },
    },
  });
}


async function getPromotionRequests(args: { q?: string; status?: string; kind?: string }) {
  const where: any = {};
  if (args.status && args.status !== "ALL") where.status = args.status;
  if (args.kind && args.kind !== "ALL") where.kind = args.kind;

  if (args.q && args.q.trim()) {
    const q = args.q.trim();
    where.OR = [
      { listing: { is: { title: { contains: q, mode: "insensitive" } } } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      { user: { is: { phone: { contains: q, mode: "insensitive" } } } },
      { applicantNote: { contains: q, mode: "insensitive" } },
      { adminNote: { contains: q, mode: "insensitive" } },
    ];
  }

  return prisma.listingPromotionRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    take: 100,
    include: {
      listing: {
        select: { id: true, title: true, status: true, city: true },
      },
      user: {
        select: { id: true, email: true, phone: true, name: true, lastName: true },
      },
    },
  });
}

async function getCategories() {
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { nameAz: "asc" },
    include: { children: { orderBy: { nameAz: "asc" } } },
  });
  return roots;
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-xl text-sm border",
        active ? "bg-violet-700 text-white border-violet-950" : "hover:bg-zinc-50",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string; status?: string; city?: string; blocked?: string; err?: string; msg?: string; userId?: string; kind?: string };
}) {
  await archiveExpiredListings();

  const cookieHeader = cookieHeaderFromNextCookies();
  const u = await getUserFromRequest(new Request("http://local/admin", { headers: { cookie: cookieHeader } }));
  const ok = (u && u.role === "ADMIN") || isAdminCookieValid(cookieHeader);

  if (!ok) {
    const err = searchParams?.err === "mfa" ? "Admin MFA login aktivdir." : (searchParams?.err ? "Login və ya parol yanlışdır." : "");
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          {err ? <div className="mb-4 rounded-2xl border bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}
          <AdminLoginClient defaultUsername={adminUser()} />
        </div>
      </div>
    );
  }

  const tab = (searchParams?.tab ?? "moderasiya").toLowerCase();

  // Moderasiya params
  const status = (searchParams?.status ?? "PENDING").toUpperCase();
  const q = (searchParams?.q ?? "").trim() || undefined;
  const city = normalizeCity(searchParams?.city ?? "");
  const userId = (searchParams?.userId ?? "").trim() || undefined;

  // Users params
  const uq = (searchParams?.q ?? "").trim() || undefined;
  const blocked = (searchParams?.blocked ?? "").trim() || undefined;

  const items = tab === "moderasiya"
    ? await getListings({ status: ["PENDING", "ACTIVE", "REJECTED", "ARCHIVED", "ALL"].includes(status) ? status : "PENDING", q, city, userId })
    : [];

  const users = tab === "istifadeciler" ? await getUsers({ q: uq, blocked }) : [];
  const categories = tab === "kateqoriyalar" ? await getCategories() : [];
  const passwordResets = tab === "sifre-berpa" ? await getPasswordResetRequests({ q: uq, status: (searchParams?.status ?? "PENDING").toUpperCase() }) : [];
  const boostKind = (searchParams?.kind ?? "ALL").toUpperCase();
  const boostRequests = tab === "boost-requests" ? await getPromotionRequests({ q: uq, status: (searchParams?.status ?? "PENDING").toUpperCase(), kind: boostKind }) : [];

  const title =
    tab === "moderasiya" ? "Moderasiya" :
    tab === "istifadeciler" ? "İstifadəçilər" :
    tab === "kateqoriyalar" ? "Kateqoriyalar" :
    tab === "sifre-berpa" ? "Şifrə bərpa sorğuları" :
    tab === "boost-requests" ? "VIP / Premium sorğuları" :
    "Parametrlər";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
          <div>
            <h1 className="text-2xl font-semibold">Admin panel • {title}</h1>
            <p className="mt-1 text-sm text-zinc-600">Dropdown + bölmə əsaslı admin naviqasiya. Hər klikdə yalnız seçilən hissə görünür.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-2 flex-wrap">
              <TabLink href="/admin?tab=moderasiya" active={tab === "moderasiya"}>Moderasiya</TabLink>
              <TabLink href="/admin?tab=istifadeciler" active={tab === "istifadeciler"}>İstifadəçilər</TabLink>
              <TabLink href="/admin?tab=kateqoriyalar" active={tab === "kateqoriyalar"}>Kateqoriyalar</TabLink>
              <TabLink href="/admin?tab=boost-requests" active={tab === "boost-requests"}>VIP / Premium</TabLink>
              <TabLink href="/admin?tab=sifre-berpa" active={tab === "sifre-berpa"}>Şifrə bərpa</TabLink>
              <TabLink href="/admin?tab=parametrler" active={tab === "parametrler"}>Parametrlər</TabLink>
            </div>

            <details className="relative">
              <summary className="list-none cursor-pointer select-none ui-btn-outline px-3 py-2 text-sm">
                Admin ▾
              </summary>
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border bg-white shadow-lg p-2 z-50">
                <Link className="block px-3 py-2 rounded-xl hover:bg-zinc-50 text-sm" href="/admin?tab=moderasiya">Moderasiya</Link>
                <Link className="block px-3 py-2 rounded-xl hover:bg-zinc-50 text-sm" href="/admin?tab=istifadeciler">İstifadəçilər</Link>
                <Link className="block px-3 py-2 rounded-xl hover:bg-zinc-50 text-sm" href="/admin?tab=kateqoriyalar">Kateqoriyalar</Link>
                <Link className="block px-3 py-2 rounded-xl hover:bg-zinc-50 text-sm" href="/admin?tab=boost-requests">VIP / Premium</Link>
                <Link className="block px-3 py-2 rounded-xl hover:bg-zinc-50 text-sm" href="/admin?tab=sifre-berpa">Şifrə bərpa</Link>
                <Link className="block px-3 py-2 rounded-xl hover:bg-zinc-50 text-sm" href="/admin?tab=parametrler">Parametrlər</Link>
                <div className="h-px bg-zinc-100 my-2" />
                <form method="post" action="/api/admin/logout">
                  <button className="w-full text-left px-3 py-2 rounded-xl text-sm text-rose-700 hover:bg-rose-50 active:bg-rose-100">Çıxış</button>
                </form>
              </div>
            </details>
          </div>
        </div>

        {searchParams?.msg ? (
          <div className="mt-4 rounded-2xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            {decodeURIComponent(String(searchParams.msg))}
          </div>
        ) : null}
      </div>

      {tab === "moderasiya" ? (
        <>
          <div className="rounded-3xl border bg-white p-6">
            <form className="grid md:grid-cols-3 gap-3" method="get">
              <input type="hidden" name="tab" value="moderasiya" />
              {userId ? <input type="hidden" name="userId" value={userId} /> : null}
              <label className="text-sm">
                Status
                <select name="status" defaultValue={status} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="PENDING">PENDING (yoxlamada)</option>
                  <option value="ACTIVE">ACTIVE (aktiv)</option>
                  <option value="REJECTED">REJECTED (rədd)</option>
                  <option value="ARCHIVED">ARCHIVED (arxiv)</option>
                  <option value="ALL">ALL (hamısı)</option>
                </select>
              </label>
              <label className="text-sm">
                Şəhər
                <select name="city" defaultValue={city ?? ""} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="">Bütün şəhərlər</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Axtarış (başlıq/təsvir/telefon)
                <input name="q" defaultValue={q ?? ""} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Məs: Prius / +994..." />
              </label>
              <div className="md:col-span-3 flex gap-2">
                <button className="ui-btn-primary px-4 py-2">Filter</button>
                <Link className="ui-btn-outline px-4 py-2" href={`/admin?tab=moderasiya`}>Sıfırla</Link>
                {userId ? (
                  <Link className="ui-btn-outline px-4 py-2" href={`/admin?tab=moderasiya&status=ALL`}>
                    User filtrini qaldır
                  </Link>
                ) : null}
              </div>
            </form>
          </div>

          <div className="rounded-3xl border bg-white overflow-hidden">
            <div className="p-4 border-b font-medium">Nəticə ({items.length})</div>
            <div className="divide-y">
              {items.map((p) => {
                let isVip = false;
                let isPremium = false;
                try {
                  const f = p.flags ? JSON.parse(p.flags) : {};
                  isVip = Boolean(f?.vip);
                  isPremium = Boolean(f?.premium);
                } catch {}

                return (
                  <div key={p.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-sm text-zinc-600">
                        {p.city} • {p.type === "VEHICLE" ? "Avtomobil" : "Elan"} • <span className="font-medium">{p.status}</span> •{" "}
                        {new Date(p.createdAt).toLocaleString("az-AZ")}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {isVip ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
                            VIP{p.vipUntil ? ` • ${new Date(p.vipUntil).toLocaleDateString("az-AZ")}` : ""}
                          </span>
                        ) : null}
                        {isPremium ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-violet-800">
                            Premium{p.premiumUntil ? ` • ${new Date(p.premiumUntil).toLocaleDateString("az-AZ")}` : ""}
                          </span>
                        ) : null}
                      </div>
                      {p.status === "REJECTED" && p.rejectReason ? (
                        <div className="mt-1 text-xs text-rose-700">Səbəb: {p.rejectReason}</div>
                      ) : null}
                      <Link className="text-sm underline" href={`/elan/${p.id}`}>Bax</Link>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {p.status === "PENDING" ? (
                        <>
                          <form action={`/api/admin/approve?id=${encodeURIComponent(p.id)}`} method="post">
                            <button className="ui-btn-success px-4 py-2">Təsdiqlə</button>
                          </form>
                          <form action={`/api/admin/reject?id=${encodeURIComponent(p.id)}`} method="post">
                            <div className="flex items-center gap-2">
                              <input
                                name="reason"
                                className="rounded-xl border px-3 py-2 text-sm w-56"
                                placeholder="Səbəb"
                              />
                              <button className="ui-btn-danger px-4 py-2">Rədd et</button>
                            </div>
                          </form>
                        </>
                      ) : (
                        <div className="text-sm text-zinc-600">Moderasiya yalnız PENDING üçün aktivdir.</div>
                      )}

                      <form action={`/api/admin/toggle-vip?id=${encodeURIComponent(p.id)}`} method="post">
                        <button className="ui-btn-outline px-4 py-2">{isVip ? "VIP söndür" : "VIP manual"}</button>
                      </form>
                      <form action={`/api/admin/toggle-premium?id=${encodeURIComponent(p.id)}`} method="post">
                        <button className="ui-btn-outline px-4 py-2">{isPremium ? "Premium söndür" : "Premium manual"}</button>
                      </form>
                      <form action={`/api/admin/archive?id=${encodeURIComponent(p.id)}`} method="post">
                        <button className="ui-btn-outline px-4 py-2">Arxivlə</button>
                      </form>

                      <form action={`/api/admin/listing-delete?id=${encodeURIComponent(p.id)}`} method="post">
                        <button className="ui-btn-danger-outline px-4 py-2">
                          Elanı sil
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
              {!items.length ? <div className="p-4 text-sm text-zinc-600">Nəticə yoxdur.</div> : null}
            </div>
          </div>
        </>
      ) : null}

      {tab === "boost-requests" ? (
        <>
          <div className="rounded-3xl border bg-white p-6">
            <form className="grid md:grid-cols-3 gap-3" method="get">
              <input type="hidden" name="tab" value="boost-requests" />
              <label className="text-sm">
                Status
                <select name="status" defaultValue={(searchParams?.status ?? "PENDING").toUpperCase()} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="CANCELED">CANCELED</option>
                  <option value="ALL">ALL</option>
                </select>
              </label>
              <label className="text-sm">
                Növ
                <select name="kind" defaultValue={boostKind} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="ALL">Hamısı</option>
                  <option value="VIP">VIP</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </label>
              <label className="text-sm">
                Axtarış (elan/email/telefon)
                <input name="q" defaultValue={uq ?? ""} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Məs: Prius / user@gmail.com" />
              </label>
              <div className="md:col-span-3 flex gap-2">
                <button className="ui-btn-primary px-4 py-2">Filter</button>
                <Link className="ui-btn-outline px-4 py-2" href="/admin?tab=boost-requests">Sıfırla</Link>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border bg-white overflow-hidden">
            <div className="p-4 border-b font-medium">Sorğular ({boostRequests.length})</div>
            <div className="divide-y">
              {boostRequests.map((r: any) => (
                <div key={r.id} className="p-4 flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="font-medium">{r.listing?.title || "Silinmiş elan"}</div>
                      <div className="text-sm text-zinc-600">
                        {r.kind === "VIP" ? "VIP" : "Premium"} • {r.planDays} gün • {r.price ?? 0} {r.currency || "AZN"} • Status: <span className="font-medium">{r.status}</span> • Payment: <span className="font-medium">{r.paymentStatus}</span>
                      </div>
                      <div className="text-sm text-zinc-600">
                        İstifadəçi: {r.user?.email || "—"}{r.user?.phone ? ` • ${r.user.phone}` : ""} • {new Date(r.requestedAt).toLocaleString("az-AZ")}
                      </div>
                      {r.applicantNote ? <div className="mt-1 text-xs text-zinc-700">İstifadəçi qeydi: {r.applicantNote}</div> : null}
                      {r.adminNote ? <div className="mt-1 text-xs text-zinc-700">Admin qeydi: {r.adminNote}</div> : null}
                      {r.endsAt ? <div className="mt-1 text-xs text-emerald-700">Bitmə: {new Date(r.endsAt).toLocaleDateString("az-AZ")}</div> : null}
                      {r.listing?.id ? <Link className="mt-1 inline-block text-sm underline" href={`/elan/${r.listing.id}`}>Elana bax</Link> : null}
                    </div>

                    {r.status === "PENDING" ? (
                      <div className="flex flex-col gap-2 w-full md:w-auto">
                        <form action="/api/admin/promotion-approve" method="post" className="flex flex-col gap-2 rounded-2xl border p-3">
                          <input type="hidden" name="requestId" value={r.id} />
                          <select name="paymentStatus" defaultValue="PAID" className="rounded-xl border px-3 py-2 text-sm">
                            <option value="PAID">PAID</option>
                            <option value="WAIVED">WAIVED</option>
                            <option value="UNPAID">UNPAID</option>
                          </select>
                          <input name="adminNote" className="rounded-xl border px-3 py-2 text-sm" placeholder="Admin qeydi (opsional)" />
                          <button className="ui-btn-success px-4 py-2">Təsdiqlə və aktiv et</button>
                        </form>

                        <form action="/api/admin/promotion-reject" method="post" className="flex flex-col gap-2 rounded-2xl border p-3">
                          <input type="hidden" name="requestId" value={r.id} />
                          <input name="adminNote" className="rounded-xl border px-3 py-2 text-sm" placeholder="Rədd səbəbi" />
                          <button className="ui-btn-danger px-4 py-2">Rədd et</button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {!boostRequests.length ? <div className="p-4 text-sm text-zinc-600">Sorğu yoxdur.</div> : null}
            </div>
          </div>
        </>
      ) : null}

      {tab === "istifadeciler" ? (
        <>
          <div className="rounded-3xl border bg-white p-6">
            <form className="grid md:grid-cols-3 gap-3" method="get">
              <input type="hidden" name="tab" value="istifadeciler" />
              <label className="text-sm md:col-span-2">
                Axtarış (email/ad/soyad/telefon)
                <input name="q" defaultValue={uq ?? ""} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Məs: user@gmail.com" />
              </label>
              <label className="text-sm">
                Blok statusu
                <select name="blocked" defaultValue={blocked ?? ""} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="">Hamısı</option>
                  <option value="0">Bloklanmamış</option>
                  <option value="1">Bloklanmış</option>
                </select>
              </label>
              <div className="md:col-span-3 flex gap-2">
                <button className="ui-btn-primary px-4 py-2">Axtar</button>
                <Link className="ui-btn-outline px-4 py-2" href={`/admin?tab=istifadeciler`}>Sıfırla</Link>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border bg-white overflow-hidden">
            <div className="p-4 border-b font-medium">İstifadəçilər ({users.length})</div>
            <div className="divide-y">
              {users.map((u: any) => (
                <div key={u.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-medium">{u.email}</div>
                    <div className="text-sm text-zinc-600">
                      {(u.name || u.lastName) ? `${u.name ?? ""} ${u.lastName ?? ""}`.trim() : "—"} • {u.phone || "—"} • Elan sayı:{" "}
                      <span className="font-medium">{u.listingsCount ?? u._count?.listings ?? 0}</span> • {new Date(u.createdAt).toLocaleDateString("az-AZ")}
                    </div>
                    {u.isBlocked ? <div className="mt-1 text-xs text-rose-700">Bloklanıb</div> : <div className="mt-1 text-xs text-emerald-700">Aktiv</div>}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <form action={`/api/admin/toggle-block?id=${encodeURIComponent(u.id)}`} method="post">
                      <input type="hidden" name="next" value="/admin?tab=istifadeciler" />
                      <button className={["ui-btn-outline px-4 py-2", u.isBlocked ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100" : "border-rose-300 text-rose-700 hover:bg-rose-50 active:bg-rose-100"].join(" ")}>
                        {u.isBlocked ? "Bloku aç" : "Blokla"}
                      </button>
                    </form>
                    <Link className="ui-btn-outline px-4 py-2" href={`/admin?tab=moderasiya&status=ALL&userId=${encodeURIComponent(u.id)}`}>
                      Elanlarına bax
                    </Link>
                  </div>
                </div>
              ))}
              {!users.length ? <div className="p-4 text-sm text-zinc-600">Nəticə yoxdur.</div> : null}
            </div>
          </div>
        </>
      ) : null}

      {tab === "kateqoriyalar" ? (
        <>
          <div className="rounded-3xl border bg-white p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="font-medium">Yeni kök kateqoriya</div>
                <form className="mt-3 grid gap-2" method="post" action="/api/admin/category-upsert">
                  <input type="hidden" name="parentId" value="" />
                  <label className="text-sm">
                    Ad (AZ)
                    <input name="nameAz" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Məs: Avtomobillər" />
                  </label>
                  <label className="text-sm">
                    Slug
                    <input name="slug" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="mes: avtomobiller" />
                  </label>
                  <button className="ui-btn-primary px-4 py-2 w-fit">Əlavə et</button>
                </form>
              </div>

              <div>
                <div className="font-medium">Alt kateqoriya əlavə et</div>
                <form className="mt-3 grid gap-2" method="post" action="/api/admin/category-upsert">
                  <label className="text-sm">
                    Parent
                    <select name="parentId" className="mt-1 w-full rounded-xl border px-3 py-2">
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nameAz}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Ad (AZ)
                    <input name="nameAz" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Məs: Toyota" />
                  </label>
                  <label className="text-sm">
                    Slug
                    <input name="slug" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="mes: toyota" />
                  </label>
                  <button className="ui-btn-primary px-4 py-2 w-fit">Əlavə et</button>
                </form>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white overflow-hidden">
            <div className="p-4 border-b font-medium">Kateqoriyalar</div>
            <div className="divide-y">
              {categories.map((c: any) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium">{c.nameAz} <span className="text-xs text-zinc-500">({c.slug})</span></div>
                      <div className="text-xs text-zinc-500">{c.children?.length ? `${c.children.length} alt kateqoriya` : "alt kateqoriya yoxdur"}</div>
                    </div>
                    <div className="flex gap-2">
                      <form method="post" action="/api/admin/category-delete">
                        <input type="hidden" name="id" value={c.id} />
                        <button className="ui-btn-danger-outline px-4 py-2">Sil</button>
                      </form>
                    </div>
                  </div>

                  {c.children?.length ? (
                    <div className="mt-3 grid gap-2">
                      {c.children.map((ch: any) => (
                        <div key={ch.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-zinc-50 p-3">
                          <div className="text-sm">{ch.nameAz} <span className="text-xs text-zinc-500">({ch.slug})</span></div>
                          <form method="post" action="/api/admin/category-delete">
                            <input type="hidden" name="id" value={ch.id} />
                            <button className="text-sm ui-btn-danger-outline px-3 py-2">Sil</button>
                          </form>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {!categories.length ? <div className="p-4 text-sm text-zinc-600">Kateqoriya yoxdur.</div> : null}
            </div>
          </div>
        </>
      ) : null}


      {tab === "sifre-berpa" ? (
        <>
          <div className="rounded-3xl border bg-white p-6">
            <form className="grid md:grid-cols-3 gap-3" method="get">
              <input type="hidden" name="tab" value="sifre-berpa" />
              <label className="text-sm">
                Status
                <select name="status" defaultValue={(searchParams?.status ?? "PENDING").toUpperCase()} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="PENDING">PENDING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="ALL">ALL</option>
                </select>
              </label>
              <label className="text-sm md:col-span-2">
                Axtarış (telefon/ad/qeyd)
                <input name="q" defaultValue={uq ?? ""} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Məs: 050 / Elvin / zəng edin" />
              </label>
              <div className="md:col-span-3 flex gap-2">
                <button className="ui-btn-primary px-4 py-2">Filter</button>
                <Link className="ui-btn-outline px-4 py-2" href="/admin?tab=sifre-berpa">Sıfırla</Link>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border bg-white p-6">
            <div className="font-medium">Birbaşa yeni şifrə təyin et</div>
            <p className="mt-1 text-sm text-zinc-600">Sorğu gözləmədən telefon, email və ya user ID ilə istifadəçini tapıb şifrəni dəyişə bilərsiniz.</p>
            <form className="mt-4 grid md:grid-cols-3 gap-3" action="/api/admin/password-reset-resolve" method="post">
              <input type="hidden" name="mode" value="manual" />
              <input type="hidden" name="next" value="/admin?tab=sifre-berpa" />
              <label className="text-sm md:col-span-2">
                Telefon / Email / User ID
                <input name="identity" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Məs: 0501234567 və ya user@mail.com" required />
              </label>
              <label className="text-sm">
                Yeni şifrə
                <input name="newPassword" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ən az 8 simvol, hərf + rəqəm" required />
              </label>
              <div className="md:col-span-3">
                <button className="ui-btn-primary px-4 py-2">Birbaşa şifrəni yenilə</button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border bg-white overflow-hidden">
            <div className="p-4 border-b font-medium">Şifrə bərpa sorğuları ({passwordResets.length})</div>
            <div className="divide-y">
              {passwordResets.map((r: any) => (
                <div key={r.id} className="p-4 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-medium">{r.phone}</div>
                      <div className="text-sm text-zinc-600">
                        Status: <span className="font-medium">{r.status}</span> • {new Date(r.requestedAt).toLocaleString("az-AZ")}
                        {r.user ? <> • İstifadəçi: {(r.user.name || r.user.lastName) ? `${r.user.name ?? ""} ${r.user.lastName ?? ""}`.trim() : (r.user.phone || r.user.email)}</> : <> • İstifadəçi tapılmadı</>}
                      </div>
                      {r.note ? <div className="mt-1 text-sm text-zinc-700">Qeyd: {r.note}</div> : null}
                      {r.resolvedAt ? <div className="mt-1 text-xs text-emerald-700">Bağlanıb: {new Date(r.resolvedAt).toLocaleString("az-AZ")} • {r.resolvedBy || "admin"}</div> : null}
                    </div>
                  </div>

                  {r.status === "PENDING" ? (
                    <div className="flex flex-col lg:flex-row gap-3">
                      {r.user ? (
                        <form className="flex flex-col md:flex-row gap-2" action="/api/admin/password-reset-resolve" method="post">
                          <input type="hidden" name="requestId" value={r.id} />
                          <input type="hidden" name="userId" value={r.user.id} />
                          <input type="hidden" name="next" value="/admin?tab=sifre-berpa" />
                          <input name="newPassword" className="rounded-xl border px-3 py-2 text-sm min-w-56" placeholder="Yeni şifrə" />
                          <button className="ui-btn-primary px-4 py-2">Şifrəni yenilə və bağla</button>
                        </form>
                      ) : null}

                      <form action="/api/admin/password-reset-resolve" method="post">
                        <input type="hidden" name="requestId" value={r.id} />
                        <input type="hidden" name="mode" value="close" />
                        <input type="hidden" name="next" value="/admin?tab=sifre-berpa" />
                        <button className="ui-btn-outline px-4 py-2">Sorğunu bağla</button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))}
              {!passwordResets.length ? <div className="p-4 text-sm text-zinc-600">Sorğu yoxdur.</div> : null}
            </div>
          </div>
        </>
      ) : null}

      {tab === "parametrler" ? (
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-zinc-700">
            <div className="font-medium">Admin parametrlər</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><span className="font-medium">ADMIN_USER</span> və <span className="font-medium">ADMIN_PASS</span> .env-də dəyişilə bilər.</li>
              <li>Admin giriş cookie-si 7 gün etibarlıdır.</li>
              <li>Moderasiya: approve/reject/vip/archive əməliyyatları bildiriş yaradır (user mail yox, sayt daxili).</li>
              <li>Şifrə bərpa sorğuları ayrıca “Şifrə bərpa” bölməsinə düşür.</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
