import type { Metadata } from "next";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import { AuthProvider } from "@/components/auth/AuthProvider";
import SignInPopout from "@/components/auth/SignInPopout";
import { CartProvider } from "@/components/cart/CartProvider";
import CartDrawer from "@/components/cart/CartDrawer";
import RevealInit from "@/components/RevealInit";

export const metadata: Metadata = {
  title: "Confetti Club — Modern Gift Shop",
  description:
    "The gift shop for people who scroll fast and care harder. Curated drops, personalization, and packaging that looks good on camera. Free shipping over Rs 50.",
};

// Design system: reuse the fully-compiled Tailwind stylesheet from /public so
// every custom utility (container-cc, btn-lime, sticker, shadow-soft, colors)
// matches the original storefront exactly. Tailwind is NOT recompiled here.
const DESIGN_CSS = "/assets/css/styles.css";
const FONTS =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=Manrope:wght@400;500;600;700;800&display=swap";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The server knows whether this request carries a session; passing it down
  // means the client never flashes "signed out" for signed-in visitors.
  const user = await getSessionUser();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
        <link rel="stylesheet" href={DESIGN_CSS} />
      </head>
      <body>
        <AuthProvider initialUser={user}>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
          <SignInPopout />
        </AuthProvider>
        <RevealInit />
      </body>
    </html>
  );
}
