/**
 * VerifyEmailPage — landing page for the (mock) email verification link.
 * Fires the verification call once on mount and shows the resulting state.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAppDispatch } from "../../../app/store/hooks";
import { verifyEmail } from "../authSlice";
import { ROUTES } from "../../../constants/routes";
import { Spinner } from "../../../components/ui/Spinner";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const dispatch = useAppDispatch();
  const [state, setState] = useState("verifying"); // 'verifying' | 'success' | 'error'
  const hasRun = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode's double-invoke of effects in
    // development, which would otherwise burn the single-use token twice.
    if (hasRun.current || !token) return;
    hasRun.current = true;

    dispatch(verifyEmail(token)).then((result) => {
      setState(verifyEmail.fulfilled.match(result) ? "success" : "error");
    });
  }, [dispatch, token]);

  return (
    <div className="text-center">
      {state === "verifying" && (
        <>
          <div className="mb-4 flex justify-center">
            <Spinner className="h-8 w-8" />
          </div>
          <p className="text-sm text-gray-600">Verifying your email...</p>
        </>
      )}

      {state === "success" && (
        <>
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Email verified!</h1>
          <p className="mb-6 text-sm text-gray-600">Your email address has been confirmed.</p>
          <Link to={ROUTES.LOGIN} className="btn-primary">
            Continue to sign in
          </Link>
        </>
      )}

      {state === "error" && (
        <>
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Verification failed</h1>
          <p className="text-sm text-gray-600">This link may have expired or already been used.</p>
        </>
      )}
    </div>
  );
}
