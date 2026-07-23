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

      <ProductCollectionSection
        title="Featured Products"
        subtitle="Hand-picked picks our team loves right now"
        viewAllHref="/products?is_featured=true"
        products={featured.items}
        status={featured.status}
      />

      <ProductCollectionSection
        title="Trending Now"
        subtitle="What everyone else is buying"
        viewAllHref="/products?ordering=-sold_count"
        products={bestSellers.items}
        status={bestSellers.status}
      />

      <ProductCollectionSection
        title="Latest Arrivals"
        subtitle="Fresh off the shelf"
        viewAllHref="/products?ordering=-created_at"
        products={newArrivals.items}
        status={newArrivals.status}
      />

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
