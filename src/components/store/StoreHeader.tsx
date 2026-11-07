"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStoreConfig } from "@/components/store/StoreConfigProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import SignOutButton from "@/components/SignOutButton";
import CartButton from "@/components/cart/CartButton";
import { moneySymbol } from "@/lib/format";

const NAV_LINKS = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?category=Personalized", label: "Personalized" },
  { href: "/shop?featured=1", label: "Bestsellers" },
  { href: "/track", label: "Track order" },
];

/** Marquee announcement bar — reads text from dynamic settings. */
function AnnouncementBar({ text }: { text: string }) {
  const items = text.split("✦").map((s) => s.trim()).filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden bg-ink py-2.5 text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-white sm:text-[12px]">
      <div className="flex w-max animate-marquee">
        <div className="flex shrink-0">
          {items.map((t) => (
            <span key={t} className="mx-6 inline-flex items-center gap-3">
              {t} <span className="text-butter">✦</span>
            </span>
          ))}
        </div>
        <div className="flex shrink-0" aria-hidden="true">
          {items.map((t) => (
            <span key={t} className="mx-6 inline-flex items-center gap-3">
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

  const showAnnouncement = !!config.announcement?.trim();
  const navActive = pathname || "";

  return (
    <>
      {showAnnouncement && <AnnouncementBar text={config.announcement!} />}
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto max-w-[1240px] rounded-[22px] border border-ink/10 bg-white/85 shadow-soft backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5">
            <Link href="/" className="flex items-center gap-2.5" aria-label={`${config.store_name} home`}>
              <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-acid text-base shadow-sticker-sm">
                🎁
              </span>
              <span className="font-display text-lg font-extrabold tracking-tight">
                {config.store_name.split(/(?=[A-Z])/).map((part, i, arr) => (
                  <span key={i}>
                    {i === 0 ? part : <span className="text-iris">{part}</span>}
                  </span>
                ))}
              </span>
            </Link>

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

            <div className="flex items-center gap-2">
              <Link
                href="/shop"
                className="btn-outline btn-sm hidden sm:inline-flex"
                aria-label="Search gifts"
              >
                🔎 <span className="hidden lg:inline">Search</span>
              </Link>
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="btn-outline btn-sm"
                    aria-label="My profile"
                  >
                    👤 <span className="hidden lg:inline">Profile</span>
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <Link href="/auth/signin" className="btn-primary btn-sm">
                  Sign in
                </Link>
              )}
              <CartButton />
            </div>
          </div>

          <div className="border-t border-ink/8 px-4 py-3 md:hidden">
            <nav className="grid gap-1 text-sm font-bold">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-xl px-3 py-2.5 hover:bg-ink/5"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/surprise"
                className="rounded-xl px-3 py-2.5 text-left text-iris hover:bg-ink/5"
              >
                🎲 Surprise me
              </Link>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
