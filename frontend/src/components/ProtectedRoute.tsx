import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { isAdminRole } from "@/lib/users"

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If provided, the user must have an admin-level role to access the route. */
  requiredRole?: "admin" | "user"
  /** Where to redirect unauthenticated visitors. Defaults to /login. */
  redirectTo?: string
  /** Skip onboarding check (used for the onboarding route itself). */
  skipOnboardingCheck?: boolean
}

/**
 * Wraps a route with authentication (and optional role) enforcement.
 * Shows a full-page loader while the auth state is resolving.
 */
export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/login",
  skipOnboardingCheck = false,
}: ProtectedRouteProps) {
  const { user, role, onboardingComplete, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to={redirectTo} replace />

  if (requiredRole === "admin" && !isAdminRole(role)) {
    return <Navigate to="/login" replace />
  }

  // Redirect regular users to onboarding if they haven't completed it
  if (!skipOnboardingCheck && !isAdminRole(role) && !onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
