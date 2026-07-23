/**
 * SpecificationsTable — key/value spec sheet on the product detail page.
 * The schema doesn't model arbitrary free-form specs per category (that
 * would be a JSONField or an EAV-style attributes table — a real
 * modeling decision deliberately out of scope for this pass, since it
 * touches the Product schema itself), so this surfaces the structured
 * fields Product actually has: SKU, category, brand, weight, and stock
 * status. Rows with no value (e.g. no brand, no weight) are simply
 * omitted rather than shown as "—", which would look unfinished.
 */

export default function SpecificationsTable({ product }) {
  const rows = [
    { label: "SKU", value: product.sku },
    { label: "Category", value: product.category?.name },
    { label: "Brand", value: product.brand?.name },
    { label: "Weight", value: product.weight_kg ? `${product.weight_kg} kg` : null },
    { label: "Availability", value: product.is_in_stock ? "In stock" : "Out of stock" },
  ].filter((row) => row.value);

  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-ink-100">
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="w-1/3 py-2.5 pr-4 font-medium text-ink-500">{row.label}</td>
            <td className="py-2.5 text-ink-900">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
