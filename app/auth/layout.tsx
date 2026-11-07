import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Left: branding panel (desktop only) ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        {/* Decorative glow blobs */}
        <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-iris/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-acid/25 blur-3xl" />

        {/* Confetti dots (only position/size classes that exist in the
            compiled stylesheet are usable here) */}
        <span className="absolute right-4 top-10 h-3 w-3 rounded-full bg-acid" />
        <span className="absolute right-2 top-40 h-2 w-5 rounded-full bg-coral rotate-6" />
        <span className="absolute bottom-8 right-4 h-4 w-2 rounded-full bg-bubble -rotate-3" />
        <span className="absolute top-1/2 left-4 h-2 w-2 rounded-full bg-aqua" />
        <span className="absolute bottom-6 left-3 h-3 w-3 rounded-full bg-butter rotate-6" />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-acid text-xl shadow-sticker">
            🎁
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            Confetti<span className="text-acid">Club</span>
          </span>
        </Link>

        {/* Heading */}
        <div className="relative z-10">
          <h2 className="font-display text-5xl font-black leading-none tracking-tight">
            Gifts that
            <br />
            <span className="text-acid">scream</span>
            <br />
            <span className="text-gradient">celebration</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/60">
            Handpicked surprises for every occasion, delivered with love and a
            whole lot of confetti.
          </p>
        </div>

        {/* Sticker badges */}
        <div className="relative z-10 flex flex-wrap gap-3">
          <span className="sticker border-white/30 bg-coral text-white rotate-2">
            ✦ Handpicked
          </span>
          <span className="sticker border-white/30 bg-acid text-ink -rotate-3">
            ✦ Shipped fast
          </span>
          <span className="sticker border-white/30 bg-iris text-white rotate-2">
            ✦ Easy returns
          </span>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex items-center justify-center bg-paper p-5 sm:p-8">
        <div className="w-full max-w-[430px]">
          {/* Mobile-only logo */}
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2.5 lg:hidden"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-acid text-lg shadow-sticker-sm">
              🎁
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-ink">
              Confetti<span className="text-iris">Club</span>
            </span>
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}
