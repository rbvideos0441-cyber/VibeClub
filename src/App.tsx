import { Toaster } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { Navbar } from './components/Navbar';
import Feed from './pages/Feed';
import LivePlayer from './pages/LivePlayer';
import Store from './pages/Store';
import BecomeHost from './pages/BecomeHost';
import AdminPanel from './pages/AdminPanel';
import HostDashboard from './pages/HostDashboard';
import Profile from './pages/Profile';
import { useState, useEffect } from 'react';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { user } = useAuth(); // We might need this to handle conditional redirects but mostly for currentPath

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    
    // Add custom event listener for pushState
    window.addEventListener('pushstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate', handleLocationChange);
    };
  }, []);

  const renderPage = () => {
    if (currentPath === '/' || currentPath === '/feed') return <Feed />;
    if (currentPath.startsWith('/live/')) return <LivePlayer />;
    if (currentPath.startsWith('/host/')) return <Profile />;
    if (currentPath === '/profile') return <Profile />;
    if (currentPath === '/store') return <Store />;
    if (currentPath === '/become-host') return <BecomeHost />;
    if (currentPath === '/admin') return <AdminPanel />;
    if (currentPath === '/dashboard/host') return <HostDashboard />;
    return <Feed />;
  };

  return (
    <div className="min-h-screen bg-bg text-text-main">
      <Navbar />
      <main className="pt-16 min-h-[calc(100vh-64px)] overflow-x-hidden">
        {renderPage()}
      </main>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#0C0C18',
            color: '#DDE6F0',
            border: '1px solid #1A1A2E',
          },
        }}
      />
    </div>
  );
}
