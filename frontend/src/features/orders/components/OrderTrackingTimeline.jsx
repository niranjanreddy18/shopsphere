/**
 * OrderTrackingTimeline — renders an order's status_history as a vertical
 * timeline, plus carrier tracking info when present. Pure presentational
 * component driven entirely by the order object passed in.
 */

export default function OrderTrackingTimeline({ order }) {
  return (
    <div className="card">
      <h2 className="mb-4 font-semibold text-gray-900">Order Tracking</h2>

      {order.tracking_number && (
        <p className="mb-4 text-sm text-gray-600">
          {order.carrier} tracking number: <span className="font-medium text-gray-900">{order.tracking_number}</span>
          {order.estimated_delivery_date && (
            <> · Estimated delivery: {new Date(order.estimated_delivery_date).toLocaleDateString()}</>
          )}
        </p>
      )}

      <ol className="space-y-4 border-l-2 border-gray-100 pl-4">
        {order.status_history.map((entry) => (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600" />
            <p className="text-sm font-medium text-gray-900">{entry.status}</p>
            {entry.note && <p className="text-xs text-gray-500">{entry.note}</p>}
            <p className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
