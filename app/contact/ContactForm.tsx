"use client";

import { useState } from "react";

export default function ContactForm({ supportEmail }: { supportEmail: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message.");
      }
      setSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <span className="text-5xl">✅</span>
        <h3 className="mt-4 font-display text-2xl font-extrabold">
          Message sent!
        </h3>
        <p className="mt-2 text-sm font-medium text-ink/60">
          We received your message and will reply to {email} shortly.
        </p>
        <button
          onClick={() => setSent(false)}
          className="btn-outline btn-sm mt-6"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-xl border-2 border-coral bg-coral/10 px-4 py-3 text-sm font-bold text-coral">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="label">Name *</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Your name"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Email *</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@email.com"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="label">Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input"
          placeholder="What's this about?"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">Message *</span>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input resize-none"
          placeholder="Tell us what's on your mind…"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink/45">
          Or email us directly at{" "}
          <a href={`mailto:${supportEmail}`} className="font-extrabold text-iris hover:underline">
            {supportEmail}
          </a>
        </p>
        <button type="submit" disabled={sending} className="btn-primary btn-sm shrink-0">
          {sending ? "Sending…" : "Send message →"}
        </button>
      </div>
    </form>
  );
}