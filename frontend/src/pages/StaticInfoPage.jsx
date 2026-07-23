/**
 * StaticInfoPage — shared shell for the footer's informational/legal pages
 * (About, Careers, Help Center, Privacy Policy, etc.). Rather than leaving
 * those links pointing at nothing (a 404 on a footer link reads as a
 * broken, unfinished site — exactly what this pass was meant to fix),
 * each one gets a real, if concise, page built from a small content
 * config — see pages/staticPageContent.js for the actual copy.
 */

export default function StaticInfoPage({ title, subtitle, sections }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="section-heading">{title}</h1>
      {subtitle && <p className="mt-2 text-ink-500">{subtitle}</p>}

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">{section.heading}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mb-2 text-sm leading-relaxed text-ink-600">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
