import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientDashboard from './components/ClientDashboard';
import PoliciesPage from './components/PoliciesPage';
import ClaimsPage from './components/ClaimsPage';
import ClientsPage from './components/ClientsPage';
import AnalyticsPage from './components/AnalyticsPage';
import SettingsPage from './components/SettingsPage';
import AnnouncementsManagementPage from './components/AnnouncementsManagementPage';
import AgencyInfoSettings from './components/AgencyInfoSettings';
import CustomerMessagesPage from './components/CustomerMessagesPage';
import PolicyRenewalsPage from './components/PolicyRenewalsPage';
import DocumentsManagementPage from './components/DocumentsManagementPage';
import BackupDownloadPage from './components/BackupDownloadPage';

function AppContent() {
  const { user, loading, isClient } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCurrentPage(customEvent.detail);
    };

    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  console.log('App state - user exists:', !!user, 'loading:', loading, 'isClient:', isClient);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    if (isClient) {
      return <ClientDashboard />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'policies':
        return <PoliciesPage />;
      case 'claims':
        return <ClaimsPage />;
      case 'clients':
        return <ClientsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'announcements':
        return <AnnouncementsManagementPage />;
      case 'agency-info':
        return <AgencyInfoSettings />;
      case 'messages':
        return <CustomerMessagesPage />;
      case 'renewals':
        return <PolicyRenewalsPage />;
      case 'documents':
        return <DocumentsManagementPage />;
      case 'backup':
        return <BackupDownloadPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
