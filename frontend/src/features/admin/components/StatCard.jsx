/** StatCard — a single KPI tile on the Admin Dashboard's stats grid. */

export default function StatCard({ label, value, sublabel, icon: Icon }) {
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-gray-400">{sublabel}</p>}
    </div>
  );
}
