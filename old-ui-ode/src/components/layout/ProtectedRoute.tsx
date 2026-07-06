/**
 * ProtectedRoute — Auth guard for dashboard routes.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, status, error, hasRequiredTenantData, refreshProfile, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasRequiredTenantData && (status === 'missing' || status === 'error')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Account setup is incomplete</h1>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {error ?? 'Your account is missing organization information required to open the dashboard.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void refreshProfile()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
