import { useState } from 'react';
import MobileLoginPage from './pages/MobileLoginPage';
import MobileApp from './MobileApp';

interface Props {
  onAdminMode: () => void;
}

export default function MobileRoot({ onAdminMode }: Props) {
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return (
      <MobileLoginPage
        onLogin={() => setLoggedIn(true)}
        onAdminMode={onAdminMode}
      />
    );
  }

  return <MobileApp onLogout={() => setLoggedIn(false)} />;
}
