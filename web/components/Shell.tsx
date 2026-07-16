"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Shield, Target, Trophy } from "lucide-react";
import { useEffect } from "react";

import { useAuth } from "@/context/AuthProvider";

const links = [
  { href: "/quinielas", label: "Quinielas", icon: Trophy },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const publicRoute = pathname.startsWith("/auth") || pathname.startsWith("/join");

  useEffect(() => {
    if (isLoading) return;
    if (!user && !publicRoute) router.replace("/auth");
    if (user && pathname === "/auth") router.replace("/quinielas");
  }, [user, isLoading, publicRoute, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--bg)] text-[var(--muted)]">
        Cargando…
      </div>
    );
  }

  if (!user && !publicRoute) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {user && (
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
            <Link href="/quinielas" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)]">
                <Target size={18} />
              </span>
              Quiniela
            </Link>
            <nav className="ml-auto flex items-center gap-1">
              {links
                .filter((l) => !l.adminOnly || user.role === "administrador")
                .map((l) => {
                  const Icon = l.icon;
                  const active = pathname.startsWith(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
                        active
                          ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                          : "text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      <Icon size={15} />
                      {l.label}
                    </Link>
                  );
                })}
              <button
                type="button"
                onClick={() => logout().then(() => router.replace("/auth"))}
                className="ml-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--danger)]"
              >
                <LogOut size={15} />
                Salir
              </button>
            </nav>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
