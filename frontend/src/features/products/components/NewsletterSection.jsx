/**
 * NewsletterSection — homepage-scale newsletter CTA (larger, standalone
 * section vs. the compact form embedded in the Footer). Both reuse the
 * same NewsletterForm component so the "no real backend yet" scope note
 * only has to live in one place.
 */

import NewsletterForm from "../../../components/common/NewsletterForm";

export default function NewsletterSection() {
  return (
    <section className="rounded-3xl bg-brand-50 px-6 py-14 text-center sm:px-12">
      <h2 className="section-heading">Stay in the loop</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-600">
        Get early access to new arrivals, exclusive discounts, and restock alerts — straight to your inbox.
      </p>
      <div className="mx-auto mt-6 max-w-sm">
        <NewsletterForm variant="light" />
      </div>
    </section>
  );
}
