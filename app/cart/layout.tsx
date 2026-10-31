import type { Metadata } from "next";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";

export const metadata: Metadata = {
  title: "Your bag — Confetti Club",
  description: "Review your bag and head to checkout.",
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StoreHeader />
      {children}
      <StoreFooter />
    </>
  );
}
