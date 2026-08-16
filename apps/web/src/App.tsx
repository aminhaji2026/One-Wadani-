import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import SiteShell from './components/SiteShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Join from './pages/Join';
import Donate from './pages/Donate';
import Polls from './pages/Polls';
import { ModulePage, PeoplePage, AnalyticsPage } from './pages/ModulePage';

function isAuthed() {
  return !!localStorage.getItem('waddani_token');
}

function ConsoleRoutes() {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="organisation" element={<ModulePage kind="organisation" />} />
        <Route path="members" element={<ModulePage kind="members" />} />
        <Route path="supporters" element={<ModulePage kind="supporters" />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="fundraising" element={<ModulePage kind="fundraising" />} />
        <Route path="finance" element={<ModulePage kind="finance" />} />
        <Route path="communications" element={<ModulePage kind="communications" />} />
        <Route path="operations" element={<ModulePage kind="operations" />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="security" element={<ModulePage kind="security" />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<Join />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/polls" element={<Polls />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/console/*" element={<ConsoleRoutes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
