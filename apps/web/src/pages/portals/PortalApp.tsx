import { Navigate, Route, Routes } from 'react-router-dom';
import PortalShell from '../../components/PortalShell';
import { getStoredUser, type PortalKind } from '../../lib/api';
import { MemberHome, SupporterHome, VolunteerHome } from './PortalHomes';
import PortalEvents from './PortalEvents';
import PortalProfile from './PortalProfile';
import { SupporterCampaigns, SupporterConsents, SupporterGive } from './SupporterPages';
import VolunteerTasks from './VolunteerTasks';

export default function PortalApp() {
  const portal = (getStoredUser()?.portal || 'member') as Exclude<PortalKind, 'staff'>;

  if (portal === 'member') {
    return (
      <PortalShell portal="member">
        <Routes>
          <Route path="/" element={<MemberHome />} />
          <Route path="/events" element={<PortalEvents mode="member" />} />
          <Route path="/profile" element={<PortalProfile portal="member" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PortalShell>
    );
  }

  if (portal === 'supporter') {
    return (
      <PortalShell portal="supporter">
        <Routes>
          <Route path="/" element={<SupporterHome />} />
          <Route path="/campaigns" element={<SupporterCampaigns />} />
          <Route path="/give" element={<SupporterGive />} />
          <Route path="/consents" element={<SupporterConsents />} />
          <Route path="/profile" element={<PortalProfile portal="supporter" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PortalShell>
    );
  }

  return (
    <PortalShell portal="volunteer">
      <Routes>
        <Route path="/" element={<VolunteerHome />} />
        <Route path="/tasks" element={<VolunteerTasks />} />
        <Route path="/events" element={<PortalEvents mode="volunteer" />} />
        <Route path="/profile" element={<PortalProfile portal="volunteer" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PortalShell>
  );
}
