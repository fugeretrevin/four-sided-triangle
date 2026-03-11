import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If provided, the user must have this role to access the route. */
  requiredRole?: "admin" | "user"
  /** Where to redirect unauthenticated visitors. Defaults to /login. */
  redirectTo?: string
}

/**
 * Wraps a route with authentication (and optional role) enforcement.
 * Shows a full-page loader while the auth state is resolving.
 */
export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to={redirectTo} replace />

  if (requiredRole === "admin" && role !== "admin") {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
