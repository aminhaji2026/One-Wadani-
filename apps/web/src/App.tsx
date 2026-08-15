import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChangePassword from './pages/ChangePassword';
import PortalApp from './pages/portals/PortalApp';
import { ModulePage, PeoplePage, AnalyticsPage, OperationsPage, SecurityPage } from './pages/ModulePage';
import FundraisingPage from './pages/FundraisingPage';
import FinancePage from './pages/FinancePage';
import { getToken, getStoredUser } from './lib/api';

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [mustChange, setMustChange] = useState(Boolean(getStoredUser()?.mustChangePassword));
  const portal = getStoredUser()?.portal || 'staff';

  useEffect(() => {
    setAuthed(Boolean(getToken()));
    setMustChange(Boolean(getStoredUser()?.mustChangePassword));
  }, []);

  if (!authed) {
    return (
      <Login
        onSuccess={() => {
          setAuthed(true);
          setMustChange(Boolean(getStoredUser()?.mustChangePassword));
        }}
      />
    );
  }

  if (mustChange) {
    return (
      <ChangePassword
        onDone={() => {
          const user = getStoredUser();
          if (user) {
            localStorage.setItem('waddani_user', JSON.stringify({ ...user, mustChangePassword: false }));
          }
          setMustChange(false);
        }}
      />
    );
  }

  if (portal !== 'staff') {
    return <PortalApp />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/organisation" element={<ModulePage kind="organisation" />} />
        <Route path="/members" element={<ModulePage kind="members" />} />
        <Route path="/supporters" element={<ModulePage kind="supporters" />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/fundraising" element={<FundraisingPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/communications" element={<ModulePage kind="communications" />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/security" element={<SecurityPage />} />
      </Routes>
    </Layout>
  );
}
