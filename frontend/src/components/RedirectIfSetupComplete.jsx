import { Navigate } from "react-router-dom";

export default function RedirectIfSetupComplete({
  completed,
  loading,
  children,
}) {
  if (loading) {
    return null;
  }

  if (completed) {
    return <Navigate to="/" replace />;
  }

  return children;
}
