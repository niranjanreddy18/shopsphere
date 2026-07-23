import { Link } from "react-router-dom";

import { ROUTES } from "../constants/routes";

/** NotFoundPage — catch-all route for unmatched paths. */
export default function NotFoundPage() {
  return (
    <div className="card text-center">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">404</h1>
      <p className="mb-6 text-gray-600">The page you're looking for doesn't exist.</p>
      <Link to={ROUTES.HOME} className="btn-primary">
        Go home
      </Link>
    </div>
  );
}
