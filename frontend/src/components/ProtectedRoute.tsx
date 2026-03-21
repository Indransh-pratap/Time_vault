import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-stranger-red text-glitch text-2xl tracking-widest uppercase">Loading Timeline...</div>
    </div>
  );

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
