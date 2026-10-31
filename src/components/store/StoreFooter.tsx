import Link from "next/link";

export default function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-ink text-white sm:mt-24">
      <div className="container-cc py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-white/20 bg-acid text-base text-ink">
                🎁
              </span>
              <span className="font-display text-lg font-extrabold">
                Confetti<span className="text-acid">Club</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              The gift shop for people who scroll fast and care harder. Curated
              drops, personalization, and packaging that looks good on camera.
            </p>
            <div className="mt-5 flex gap-2 text-lg">
              <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-acid hover:text-acid" aria-label="Instagram">📸</Link>
              <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-acid hover:text-acid" aria-label="TikTok">🎵</Link>
              <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-acid hover:text-acid" aria-label="YouTube">▶️</Link>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/40">Shop</h4>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold text-white/70">
              <li><Link className="transition hover:text-acid" href="/shop">All gifts</Link></li>
              <li><Link className="transition hover:text-acid" href="/shop?featured=1">Bestsellers</Link></li>
              <li><Link className="transition hover:text-acid" href="/shop?max=2500">Under Rs 25</Link></li>
              <li><Link className="transition hover:text-acid" href="/shop?category=Personalized">Personalized</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/40">Help</h4>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold text-white/70">
              <li><Link className="transition hover:text-acid" href="/track">Track my order</Link></li>
              <li><Link className="transition hover:text-acid" href="/track">Shipping &amp; returns</Link></li>
              <li><Link className="transition hover:text-acid" href="/shop">Gift cards</Link></li>
              <li><a className="transition hover:text-acid" href="mailto:hey@confetticlub.shop">Contact us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/40">
              Get the drops first
            </h4>
            <p className="mt-4 text-sm font-semibold text-white/60">
              One email a week. New arrivals, secret sales, and gift reminders
              you&apos;ll actually use.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="email"
                placeholder="you@email.com"
                className="w-full rounded-full border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white placeholder:text-white/35 focus:border-acid focus:outline-none"
              />
              <button className="btn-lime btn-sm shrink-0">Join</button>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs font-semibold text-white/45 sm:flex-row">
          <p>© {year} Confetti Club. All rights reserved.</p>
          <p>Made with 🎉 · Free shipping over Rs 50</p>
        </div>
      </div>
    </footer>
  );
}
