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
import { validateDatabaseConnection } from './lib/database-validator';
import { AlertTriangle } from 'lucide-react';

function AppContent() {
  const { user, loading, isClient } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [dbValidation, setDbValidation] = useState<{
    isValidating: boolean;
    isValid: boolean;
    error?: string;
  }>({ isValidating: true, isValid: true });

  useEffect(() => {
    const validateDb = async () => {
      try {
        const result = await validateDatabaseConnection();
        setDbValidation({
          isValidating: false,
          isValid: result.isValid,
          error: result.error,
        });
      } catch (err) {
        setDbValidation({
          isValidating: false,
          isValid: false,
          error: err instanceof Error ? err.message : 'Unknown validation error',
        });
      }
    };

    validateDb();
  }, []);

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCurrentPage(customEvent.detail);
    };

    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  console.log('App state - user exists:', !!user, 'loading:', loading, 'isClient:', isClient);

  if (dbValidation.isValidating || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{dbValidation.isValidating ? 'Verifying database connection...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!dbValidation.isValid) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full border-4 border-red-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-900">WRONG DATABASE CONNECTION!</h1>
              <p className="text-red-700">YANLIŞ VERİTABANINA BAĞLANILDI!</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold mb-2">Error Details:</p>
            <p className="text-red-700 font-mono text-sm break-all">{dbValidation.error}</p>
          </div>

          <div className="space-y-4 text-gray-700">
            <div>
              <h2 className="font-semibold text-lg mb-2">Expected Configuration:</h2>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm">
                <p>Project ID: <span className="text-green-600 font-bold">azktsinnkthmjizpbaks</span></p>
                <p>URL: <span className="text-green-600">https://azktsinnkthmjizpbaks.supabase.co</span></p>
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-lg mb-2">How to fix:</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Check your <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file</li>
                <li>Update <code className="bg-gray-100 px-2 py-1 rounded">VITE_SUPABASE_URL</code> to the correct value</li>
                <li>Update <code className="bg-gray-100 px-2 py-1 rounded">VITE_SUPABASE_ANON_KEY</code> to the correct value</li>
                <li>If using Vercel, update environment variables in dashboard</li>
                <li>Restart the application</li>
              </ol>
            </div>
          </div>
        </div>
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
