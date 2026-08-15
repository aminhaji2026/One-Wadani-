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
import ApprovalsPage from './pages/ApprovalsPage';
import RegisterPage from './pages/RegisterPage';
import PublicCampaignPage from './pages/PublicCampaignPage';
import CheckInPage from './pages/CheckInPage';
import { getToken, getStoredUser } from './lib/api';
import { I18nProvider } from './lib/i18n';

function AuthedApp() {
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
    return <ChangePassword onDone={() => setMustChange(false)} />;
  }

  if (portal !== 'staff') {
    return <PortalApp />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
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

export default function App() {
  return (
    <I18nProvider>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/c/:slug" element={<PublicCampaignPage />} />
        <Route path="/check-in" element={<CheckInPage />} />
        <Route path="/*" element={<AuthedApp />} />
      </Routes>
    </I18nProvider>
  );
}
