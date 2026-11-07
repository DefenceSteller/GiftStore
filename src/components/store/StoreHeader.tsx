"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStoreConfig } from "@/components/store/StoreConfigProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import SignOutButton from "@/components/SignOutButton";
import CartButton from "@/components/cart/CartButton";
import { moneySymbol } from "@/lib/format";
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
        <div className="flex shrink-0">
          {items.map((t) => (
            <span key={t} className="mx-5 inline-flex items-center gap-2">
              {t} <span className="text-butter">✦</span>
            </span>
          ))}
        </div>
        <div className="flex shrink-0" aria-hidden="true">
          {items.map((t) => (
            <span key={t} className="mx-5 inline-flex items-center gap-2">
              {t} <span className="text-butter">✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StoreHeader() {
  const config = useStoreConfig();
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showAnnouncement = !!config.announcement?.trim();

  return (
    <>
      {showAnnouncement && <AnnouncementBar text={config.announcement!} />}
      <header className="sticky top-0 z-50 px-2 pt-2 sm:px-4 sm:pt-3">
        <div className="mx-auto max-w-[1240px] rounded-[22px] border border-ink/10 bg-white/85 shadow-soft backdrop-blur-xl">
          {/* Main bar */}
          <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4">
            {/* Logo — smaller on mobile */}
            <Link
              href="/"
              className="flex items-center gap-2"
              aria-label={`${config.store_name} home`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-ink bg-acid text-base shadow-sticker-sm sm:h-9 sm:w-9">
                🎁
              </span>
              <span className="font-display text-base font-extrabold tracking-tight sm:text-lg">
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
                title="Show me something good"
              >
                🎲 Surprise me
              </Link>
            </nav>

            {/* Right side — compact on mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink/10 bg-white text-ink transition hover:border-ink md:hidden"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <span className="text-lg leading-none">
                  {mobileMenuOpen ? "✕" : "☰"}
                </span>
              </button>

              {/* Search — icon only on mobile */}
              <Link
                href="/shop"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink/10 text-ink transition hover:border-ink sm:hidden"
                aria-label="Search gifts"
              >
                🔎
              </Link>

              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-ink/10 px-3 text-sm font-extrabold text-ink transition hover:border-ink sm:flex"
                  >
                    👤 Profile
                  </Link>
                  <div className="hidden sm:block">
                    <SignOutButton />
                  </div>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  className="hidden h-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink/10 px-3 text-sm font-extrabold text-ink transition hover:border-ink sm:flex"
                >
                  Sign in
                </Link>
              )}
              <CartButton />
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="border-t border-ink/8 px-3 py-3 md:hidden">
              <nav className="grid gap-1">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-extrabold text-ink transition hover:bg-mist"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/surprise"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-extrabold text-iris transition hover:bg-iris/10"
                >
                  🎲 Surprise me
                </Link>
                {user && (
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 rounded-xl border-2 border-ink/10 px-3 py-2.5 text-center text-sm font-extrabold text-ink transition hover:border-ink"
                    >
                      👤 Profile
                    </Link>
                    <SignOutButton />
                  </div>
                )}
                {!user && (
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl border-2 border-ink/10 px-3 py-2.5 text-center text-sm font-extrabold text-ink transition hover:border-ink"
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