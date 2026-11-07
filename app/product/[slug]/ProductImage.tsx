"use client";

import { useState } from "react";

export default function ProductImage({
  src,
  alt,
  gradient,
  emoji,
}: {
  src: string;
  alt: string;
  gradient: string;
  emoji: string;
}) {
  const [failed, setFailed] = useState(false);
  const [c1, c2] = gradient.split(",");

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-ink/8 shadow-soft"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2 || "#000"})` }}
    >
      {!failed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          width={1000}
          height={1000}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full min-h-[320px] w-full place-items-center text-8xl select-none">
          {emoji || "🎁"}
        </div>
      )}
    </div>
  );
}
