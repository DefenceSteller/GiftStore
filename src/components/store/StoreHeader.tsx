"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStoreConfig } from "@/components/store/StoreConfigProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import CartButton from "@/components/cart/CartButton";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?category=Personalized", label: "Personalized" },
  { href: "/shop?featured=1", label: "Bestsellers" },
];

/** Marquee announcement bar — reads text from dynamic settings. */
function AnnouncementBar({ text }: { text: string }) {
  const items = text.split("✦").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden bg-ink py-2 text-center text-[10px] font-extrabold uppercase tracking-[0.2em] text-white sm:text-[11px]">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((i) => (
          <div key={i} className="flex shrink-0">
            {items.map((t, idx) => (
              <span key={idx} className="mx-5 inline-flex items-center gap-2">
                {t} <span className="text-butter">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StoreHeader() {
  const config = useStoreConfig();
  const { user } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Mobile menu state: controls whether the hamburger dropdown is open
  // This replaces the old 5-row stacked navbar with a clean hamburger menu
  // v3: Force Vercel rebuild with this comment change
  const showAnnouncement = !!config.announcement?.trim();

  return (
    <>
      {showAnnouncement && <AnnouncementBar text={config.announcement!} />}
      <header className="sticky top-0 z-50 px-2 pt-2 sm:px-4 sm:pt-3" data-build="v3-mobile-fix">
        <div className="mx-auto max-w-[1240px] rounded-[22px] border border-ink/10 bg-white/85 shadow-soft backdrop-blur-xl">
          {/* Main bar — always single line */}
          <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2" aria-label={`${config.store_name} home`}>
              <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-ink bg-acid text-base shadow-sticker-sm sm:h-9 sm:w-9">
                🎁
              </span>
              <span className="font-display text-base font-extrabold tracking-tight text-ink sm:text-lg">
                {config.store_name.split(/(?=[A-Z])/).map((part, i, arr) => (
                  <span key={i}>
                    {i === 0 ? part : <span className="text-iris">{part}</span>}
                  </span>
                ))}
              </span>
            </Link>

            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden items-center text-sm md:flex">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-4 py-2 font-bold text-ink/75 transition hover:bg-ink/5 hover:text-ink"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/surprise"
                className="ml-1 rounded-full bg-iris/10 px-4 py-2 font-bold text-iris transition hover:bg-iris hover:text-white"
              >
                🎲 Surprise me
              </Link>
            </nav>

            {/* Right actions — matches original main-branch styling exactly */}
            <div className="flex items-center gap-2">
              <Link
                href="/shop"
                className="btn-outline btn-sm hidden sm:inline-flex"
                aria-label="Search gifts"
              >
                🔎 <span className="hidden lg:inline">Search</span>
              </Link>
              {user ? (
                <Link
                  href="/profile"
                  className="btn-ghost btn-sm hidden sm:inline-flex"
                >
                  👤 Profile
                </Link>
              ) : (
                <Link
                  href="/auth/signin"
                  className="btn-ghost btn-sm hidden sm:inline-flex"
                >
                  Sign in
                </Link>
              )}
              <CartButton />
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink/10 text-lg md:hidden"
                aria-label="Menu"
              >
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Mobile menu overlay — matches original main-branch styling exactly */}
          {menuOpen && (
            <div id="cc-mobile-menu" className="border-t border-ink/8 px-4 py-3 md:hidden">
              <nav className="grid gap-1 text-sm font-bold">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 transition hover:bg-ink/5"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/surprise"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-left transition hover:bg-ink/5"
                >
                  🎲 Surprise me
                </Link>
                {user ? (
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 transition hover:bg-ink/5"
                  >
                    👤 Profile
                  </Link>
                ) : (
                  <Link
                    href="/auth/signin"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 transition hover:bg-ink/5"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
