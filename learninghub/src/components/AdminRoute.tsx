import { Link, Navigate, useLocation } from 'react-router-dom'
import { useStore } from '../stores/useStore'
import { useAdminAuth } from '../hooks/useAdminAuth'
import type { AdminPermission, AdminRole } from '../services/adminAuthService'

interface AdminRouteProps {
  children: React.ReactNode
  requiredRole?: AdminRole | AdminRole[]
  requiredPermission?: AdminPermission | AdminPermission[]
  requireAllPermissions?: boolean
  fallback?: React.ReactNode
}

/**
 * AdminRoute - Enhanced admin route protection with RBAC
 *
 * Features:
 * - Authentication check (redirects to /auth if not logged in)
 * - Role-based access control (admin, superadmin, moderator)
 * - Permission-based access control (granular permissions)
 * - Custom fallback UI for access denied
 *
 * Uses JWT-based admin authentication (no server-side session state)
 */
export function AdminRoute({
  children,
  requiredRole,
  requiredPermission,
  requireAllPermissions = false,
  fallback,
}: AdminRouteProps) {
  const location = useLocation()
  const { auth } = useStore()
  const { hasAnyPermission, hasAllPermissions, hasRole } = useAdminAuth()

  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  }

  if (!auth.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[3px] border-primary-500/20 border-t-primary-500 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Verifying permissions...</p>
        </div>
      </div>
    )
  }

  const userRole = auth.user.role?.toLowerCase()
  const isAdminRole = userRole === 'admin' || userRole === 'superadmin' || userRole === 'moderator'
  if (!isAdminRole) {
    return (
      fallback ?? (
        <AccessDeniedFallback
          title="Access Denied"
          message="You do not have administrator privileges to access this area."
          action={{ label: 'Go Home', to: '/' }}
        />
      )
    )
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      fallback ?? (
        <AccessDeniedFallback
          title="Insufficient Privileges"
          message="You do not have the required role to access this resource."
        />
      )
    )
  }

  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission]
    const hasRequiredPermission = requireAllPermissions
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)

    if (!hasRequiredPermission) {
      return (
        fallback ?? (
          <AccessDeniedFallback
            title="Permission Denied"
            message={`You need ${requireAllPermissions ? 'all' : 'at least one'} of the following permissions: ${permissions.join(', ')}`}
          />
        )
      )
    }
  }

  return <>{children}</>
}

interface AccessDeniedFallbackProps {
  title: string
  message: string
  action?: { label: string; to: string }
}

function AccessDeniedFallback({ title, message, action }: AccessDeniedFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        {action ? (
          <Link
            to={action.to}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Go Home
          </Link>
        )}
      </div>
    </div>
  )
}
