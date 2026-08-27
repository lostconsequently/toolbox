import { Navigate } from "react-router-dom";

export default function RequireSetupComplete({ completed, loading, children }) {
  if (loading) {
    return null;
  }

  if (!completed) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}
