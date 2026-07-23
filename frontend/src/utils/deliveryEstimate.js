/**
 * Delivery estimate calculation — see components/ui/DeliveryEstimate.jsx
 * for why this is computed client-side rather than sourced from a real
 * carrier integration. Kept in its own module (not inline in the
 * component file) so the component file only exports the component
 * itself — mixing component and non-component exports in one file breaks
 * React Fast Refresh's ability to hot-reload just that component.
 */

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) added += 1;
  }
  return result;
}

export function getEstimatedDeliveryRange() {
  const today = new Date();
  const earliest = addBusinessDays(today, 3);
  const latest = addBusinessDays(today, 5);
  const fmt = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(earliest)} – ${fmt(latest)}`;
}
