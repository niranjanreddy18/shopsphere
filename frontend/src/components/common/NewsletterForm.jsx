/**
 * NewsletterForm — email capture, used both compactly in the dark Footer
 * and at larger scale on the light-background homepage NewsletterSection.
 * `variant` swaps the color treatment for each context rather than
 * relying on a parent trying to override these styles via a CSS selector
 * from outside — the component owns its own two supported looks.
 *
 * Honest scope note: there's no backend newsletter/mailing-list endpoint
 * in this project (that would be its own small subsystem — an email
 * service integration, a subscriber list, unsubscribe handling). This
 * submits nothing anywhere; it validates the email client-side and shows
 * a success state, which is an accepted, clearly-scoped placeholder for a
 * portfolio project rather than a half-wired fake API call.
 */

import { useState } from "react";
import { Mail } from "lucide-react";

const VARIANTS = {
  dark: {
    wrapper: "border-ink-700 bg-ink-800 focus-within:border-brand-500",
    icon: "text-ink-400",
    input: "text-white placeholder:text-ink-500",
    success: "text-ink-300",
  },
  light: {
    wrapper: "border-ink-200 bg-white focus-within:border-brand-500",
    icon: "text-ink-400",
    input: "text-ink-900 placeholder:text-ink-400",
    success: "text-ink-600",
  },
};

export default function NewsletterForm({ variant = "dark" }) {
  const styles = VARIANTS[variant];
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  if (submitted) {
    return <p className={`text-sm ${styles.success}`}>Thanks for subscribing! Watch your inbox for exclusive offers.</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={`flex rounded-full border ${styles.wrapper}`}>
        <div className="flex items-center pl-3.5">
          <Mail className={`h-4 w-4 ${styles.icon}`} />
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className={`w-full bg-transparent px-2 py-2.5 text-sm outline-none ${styles.input}`}
        />
        <button type="submit" className="rounded-full bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
          Join
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </form>
  );
}
