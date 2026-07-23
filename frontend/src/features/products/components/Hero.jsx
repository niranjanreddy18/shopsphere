/**
 * Hero — the homepage's large promotional banner: headline, subcopy, dual
 * CTAs, and a right-side lifestyle image on larger screens. The background
 * photo comes from the same LoremFlickr keyword-photo technique used for
 * seeded product images (see the seed_data command's docstring) — a real,
 * royalty-free photograph rather than a flat color block or "No Image"
 * placeholder, kept deterministic via a fixed `lock` value so the hero
 * doesn't change photo on every page load.
 */

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl">
      <div className="relative h-72 md:h-[28rem] lg:h-[36rem]">
        <img
          src="/images/banner.png"
          alt="Promotional banner"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />

        <div className="absolute inset-0 bg-black/35" />

        <div className="absolute left-4 bottom-4 sm:left-8 sm:bottom-8 lg:left-12 lg:bottom-12 flex items-center">
          <Link
            to="/collections"
            className="inline-flex items-center gap-3 rounded-full border border-white/30 bg-transparent px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-white shadow-sm hover:bg-white/5 transition-transform"
          >
            Explore Collections <ArrowRight className="h-4 w-4 text-white" />
          </Link>
        </div>
      </div>
    </section>
  );
}
