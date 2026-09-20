import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "./LoadingSpinner";

function ProtectedRoute({ children, requireUserType }) {
  const { isAuthenticated, loading, userType, authUnavailable } = useAuth();

  if (loading) return <LoadingSpinner label="Checking your session…" />;

  if (!isAuthenticated) {
    return (
      <div className="gn-container py-20">
        <div className="gn-card mx-auto max-w-md p-8 text-center border border-border">
          <h1 className="font-display text-3xl text-foreground">Log in to continue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {authUnavailable
              ? "The accounts service isn't available yet, so this area can't be opened."
              : "This area is private. Log in to see your bookings and profile."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/login" className="gn-btn gn-btn-primary">
              Log in
            </Link>
            <Link to="/register" className="gn-btn gn-btn-outline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (requireUserType && userType && userType !== requireUserType) {
    return <Navigate to={userType === "Vendor" ? "/vendor" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

export { ProtectedRoute };
