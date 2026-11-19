import type { ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { PageLoader } from './components/ui';
import { afterAuth, useAuth } from './lib/auth';
import type { Role } from './lib/types';
import Landing from './pages/Landing';
import { Login, Register } from './pages/Auth';
import Discover from './pages/Discover';
import FoodDetails from './pages/FoodDetails';
import Dashboard from './pages/Dashboard';
import ListingForm from './pages/ListingForm';
import Impact from './pages/Impact';
import Leaderboard from './pages/Leaderboard';
import Notifications from './pages/Notifications';

function Protected({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to={afterAuth.path} replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="discover" element={<Discover />} />
        <Route path="food/:id" element={<FoodDetails />} />
        <Route path="impact" element={<Impact />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="listings/new" element={<Protected roles={['PROVIDER']}><ListingForm /></Protected>} />
        <Route path="listings/:id/edit" element={<Protected roles={['PROVIDER']}><ListingForm /></Protected>} />
        <Route path="*" element={
          <div className="mx-auto max-w-md px-4 py-24 text-center">
            <div className="text-6xl">🥡</div>
            <h1 className="mt-4 text-2xl font-extrabold">Page not found</h1>
            <p className="mt-2 text-slate-500">This page has been eaten. Let's find you some food instead.</p>
            <Link to="/discover" className="btn-primary mt-6">Discover food</Link>
          </div>} />
      </Route>
    </Routes>
  );
}
