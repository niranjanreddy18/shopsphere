/**
 * HomePage — the full storefront landing page: hero banner, offer
 * banners, category grid, three curated product collections (Featured /
 * Trending / New Arrivals), a brand strip, customer testimonials, and a
 * newsletter CTA. Every section is backed by real data from the existing
 * API (see each section component's own docstring for its data source) —
 * nothing here is static/mock content dressed up as a live section.
 */

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "../app/store/hooks";
import { fetchBestSellers, fetchFeaturedProducts, fetchNewArrivals } from "../features/products/productSlice";
import Hero from "../features/products/components/Hero";
import CategoryGrid from "../features/products/components/CategoryGrid";
import BrandStrip from "../features/products/components/BrandStrip";
import NewsletterSection from "../features/products/components/NewsletterSection";
import ProductCollectionSection from "../features/products/components/ProductCollectionSection";

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { featured, newArrivals, bestSellers } = useAppSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchFeaturedProducts({ page_size: 8 }));
    dispatch(fetchNewArrivals({ page_size: 8 }));
    dispatch(fetchBestSellers({ page_size: 8 }));
  }, [dispatch]);

  return (
    <div className="space-y-16 sm:space-y-20">
      <Hero />

      <section>
        <div className="mb-6">
          <h2 className="section-heading">Shop by Category</h2>
          <p className="mt-1 text-sm text-ink-500">Find exactly what you're looking for.</p>
        </div>
        <CategoryGrid />
      </section>

      {(() => {
        // Deduplicate products so the same product doesn't appear in
        // multiple home collections. Priority order: featured, trending, latest.
        const featuredList = featured.items || [];
        const seen = new Set(featuredList.map((p) => p.id));

        // Build trending list with a goal of showing a full row (4) or two
        // rows (8). Prefer unique items (not present in `featuredList`). If
        // there aren't enough unique items, fill to 4 by allowing duplicates
        // from the original bestSellers list as a last resort so the UI keeps
        // a consistent grid layout.
        const bestItems = bestSellers.items || [];
        const trendingUnique = [];
        for (const p of bestItems) {
          if (!seen.has(p.id)) {
            trendingUnique.push(p);
            seen.add(p.id);
          }
          if (trendingUnique.length >= 8) break;
        }

        let trendingList = trendingUnique.slice(0, 8);
        if (trendingList.length >= 8) {
          // keep 8
        } else if (trendingList.length >= 4) {
          // show a single full row (4)
          trendingList = trendingList.slice(0, 4);
        } else if (trendingList.length > 0) {
          // try to fill to 4 by taking from bestItems (allow duplicates only
          // if necessary). We prefer preserving uniqueness but ensure layout.
          const needed = 4 - trendingList.length;
          const filler = [];
          for (const p of bestItems) {
            if (filler.length >= needed) break;
            // skip if already included in trendingList at same id
            if (trendingList.find((t) => t.id === p.id)) continue;
            filler.push(p);
          }
          trendingList = trendingList.concat(filler).slice(0, 4);
        } else {
          // nothing unique found — fall back to first 4 bestSellers so the
          // section renders a full row rather than 0/odd count
          trendingList = bestItems.slice(0, 4);
          // mark their ids as seen so later sections don't re-add them
          for (const p of trendingList) seen.add(p.id);
        }

        const latestList = (newArrivals.items || []).filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

        return (
          <>
            <ProductCollectionSection
              title="Featured Products"
              subtitle="Hand-picked picks our team loves right now"
              viewAllHref="/products?is_featured=true"
              products={featuredList}
              status={featured.status}
            />

            <ProductCollectionSection
              title="Trending Now"
              subtitle="What everyone else is buying"
              viewAllHref="/products?ordering=-sold_count"
              products={trendingList}
              status={bestSellers.status}
            />

            <ProductCollectionSection
              title="Latest Arrivals"
              subtitle="Fresh off the shelf"
              viewAllHref="/products?ordering=-created_at"
              products={latestList}
              status={newArrivals.status}
            />
          </>
        );
      })()}

      <section>
        <div className="mb-6 text-center">
          <h2 className="section-heading">Shop by Brand</h2>
        </div>
        <BrandStrip />
      </section>

      {/* Testimonials removed from landing page per request */}

      <NewsletterSection />
    </div>
  );
}
