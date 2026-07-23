/**
 * Tailwind CSS configuration.
 *
 * `content` is scoped to index.html + everything under src/ so Tailwind's
 * JIT compiler only scans files that could actually contain class names —
 * keeping the production CSS bundle minimal.
 *
 * The `brand` color scale and `container` centering are project-wide design
 * tokens so every component references the same palette instead of
 * hard-coding one-off hex values.
 *
 * Design refresh note: `brand` was deepened from a generic blue into a
 * richer indigo (matching what Linear/Vercel/Stripe use for a premium
 * tech feel) — every existing `bg-brand-600`/`text-brand-700`/etc. class
 * across the app picks up the new palette automatically, with zero
 * component changes required. `ink` (near-black neutrals) was added
 * alongside it for the dark, high-contrast UI elements premium retail
 * sites lean on (solid-black CTA buttons, dark section backgrounds) —
 * see Nike/Apple's own use of near-black rather than pure gray for
 * primary actions.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        ink: {
          50: "#f7f7f8",
          100: "#eeeef0",
          200: "#d9d9de",
          300: "#b6b6bf",
          400: "#8c8c99",
          500: "#6b6b78",
          600: "#54545f",
          700: "#45454e",
          800: "#2a2a30",
          900: "#18181b",
          950: "#0a0a0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // A softer, more diffuse elevation than Tailwind's defaults —
        // premium product cards use a wide, low-opacity shadow rather
        // than a tight dark one, which reads as "floating" instead of
        // "outlined."
        card: "0 2px 8px -2px rgb(0 0 0 / 0.06), 0 4px 16px -4px rgb(0 0 0 / 0.08)",
        "card-hover": "0 8px 24px -4px rgb(0 0 0 / 0.10), 0 16px 40px -8px rgb(0 0 0 / 0.12)",
        nav: "0 1px 2px rgb(0 0 0 / 0.04), 0 2px 8px rgb(0 0 0 / 0.04)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: { "0%": { opacity: 0, transform: "translateY(12px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        scaleIn: { "0%": { opacity: 0, transform: "scale(0.96)" }, "100%": { opacity: 1, transform: "scale(1)" } },
        shimmer: { "0%": { backgroundPosition: "-1000px 0" }, "100%": { backgroundPosition: "1000px 0" } },
      },
    },
  },
  plugins: [],
};

