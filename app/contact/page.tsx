import Link from "next/link";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import { getServerStoreConfig } from "@/lib/store-config";
import ContactForm from "./ContactForm";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const config = await getServerStoreConfig();
  const supportEmail = config.support_email || "hello@confetticlub.shop";

  return (
    <div className="min-h-screen bg-mist">
      <StoreHeader />
      <main className="container-cc py-16 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="inline-grid h-16 w-16 place-items-center rounded-3xl border-2 border-ink bg-iris text-3xl shadow-sticker-sm">
              ✉️
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold sm:text-5xl">
              Get in <span className="text-iris">touch</span>
            </h1>
            <p className="mt-3 text-base font-medium text-ink/60">
              Have a question about an order, a custom gift, or something else?
              We read every message — usually within a few hours.
            </p>
          </div>

          {/* Contact form — full width, centered */}
          <div className="mt-10 rounded-[28px] border-2 border-ink bg-white p-6 sm:p-8 shadow-sticker">
            <ContactForm supportEmail={supportEmail} />
          </div>

          {/* Contact info — centered below form */}
          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="rounded-2xl border-2 border-ink bg-white p-5 text-center shadow-soft">
              <span className="text-xl">📧</span>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-ink/40">
                Email
              </p>
              <div className="mt-1 overflow-hidden">
                <a
                  href={`mailto:${supportEmail}`}
                  className="block break-words font-extrabold text-sm text-iris transition hover:text-ink"
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                  title={supportEmail}
                >
                  {supportEmail}
                </a>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-ink bg-white p-5 text-center shadow-soft">
              <span className="text-xl">⏰</span>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-ink/40">
                Response time
              </p>
              <p className="mt-1 font-extrabold text-ink">
                Within a few hours
              </p>
              <p className="mt-1 text-sm font-medium text-ink/55">
                We reply Mon–Fri, 9am–5pm.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-ink bg-white p-5 text-center shadow-soft">
              <span className="text-xl">📍</span>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-ink/40">
                Based in
              </p>
              <p className="mt-1 font-extrabold text-ink">
                Confetti Club HQ
              </p>
              <p className="mt-1 text-sm font-medium text-ink/55">
                Shipping worldwide 🌍
              </p>
            </div>
          </div>

          {/* FAQ teaser */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-extrabold text-center">
              Quick questions?
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                {
                  q: "How long does shipping take?",
                  a: "Standard shipping is 5–7 business days. Free on orders over the threshold shown in your cart.",
                },
                {
                  q: "Can I return or exchange?",
                  a: "Yes — 30 days for exchanges and refunds. Items must be unused and in original packaging.",
                },
                {
                  q: "Do you offer gift wrapping?",
                  a: "Every order ships in Confetti Club packaging — no extra charge. Add a personal note at checkout.",
                },
                {
                  q: "Is personalization free?",
                  a: "Yes! Engraving, names, and custom text are included in the base price for all Personalized gifts.",
                },
              ].map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border-2 border-ink bg-white p-5 shadow-soft"
                >
                  <p className="font-extrabold text-ink">{faq.q}</p>
                  <p className="mt-1 text-sm font-medium text-ink/60">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}