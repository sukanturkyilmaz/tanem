import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, FileText, AlertCircle, BarChart3, Settings, Users, Bell, Building2, MessageSquare, RefreshCw, FolderOpen, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import NotificationDropdown from './NotificationDropdown';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, signOut, isAdmin, isClient } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [pendingRenewalsCount, setPendingRenewalsCount] = useState(0);
  const [newDocumentsCount, setNewDocumentsCount] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('STN Türkyılmaz Sigorta');

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (isAdmin && !isClient) {
      fetchNewMessagesCount();
      fetchPendingRenewalsCount();
      fetchNewDocumentsCount();

      const subscription = supabase
        .channel('messages_count_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'customer_messages',
          },
          () => {
            fetchNewMessagesCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'policy_renewal_requests',
          },
          () => {
            fetchPendingRenewalsCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'client_documents',
          },
          () => {
            fetchNewDocumentsCount();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isAdmin, isClient]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('logo_url, company_name').maybeSingle();
      if (data) {
        setLogoUrl(data.logo_url);
        setCompanyName(data.company_name);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchNewMessagesCount = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { count, error } = await supabase
        .from('customer_messages')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', userData.user?.id)
        .eq('status', 'new');

      if (!error) {
        setNewMessagesCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching messages count:', error);
    }
  };

  const fetchPendingRenewalsCount = async () => {
    try {
      const { count } = await supabase
        .from('policy_renewal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setPendingRenewalsCount(count || 0);
    } catch (error) {
      console.error('Error fetching renewals count:', error);
    }
  };

  const fetchNewDocumentsCount = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('client_documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setNewDocumentsCount(count || 0);
    } catch (error) {
      console.error('Error fetching documents count:', error);
    }
  };

  const menuItems = isClient
    ? [
        { id: 'dashboard', label: 'Ana Sayfa', icon: BarChart3 },
      ]
    : [
        { id: 'dashboard', label: 'Ana Sayfa', icon: BarChart3 },
        { id: 'policies', label: 'Poliçeler', icon: FileText },
        { id: 'claims', label: 'Hasarlar', icon: AlertCircle },
        { id: 'clients', label: 'Müşteriler', icon: Users },
        { id: 'analytics', label: 'Analiz & Raporlar', icon: BarChart3 },
      ];

  if (isAdmin && !isClient) {
    menuItems.push(
      { id: 'messages', label: 'Müşteri Mesajları', icon: MessageSquare, badge: newMessagesCount },
      { id: 'renewals', label: 'Yenileme Talepleri', icon: RefreshCw, badge: pendingRenewalsCount },
      { id: 'documents', label: 'Dosya Yönetimi', icon: FolderOpen, badge: newDocumentsCount },
      { id: 'announcements', label: 'Duyurular', icon: Bell },
      { id: 'agency-info', label: 'Acente Bilgileri', icon: Building2 },
      { id: 'backup', label: 'Backup İndir', icon: Download },
      { id: 'settings', label: 'Ayarlar', icon: Settings }
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="ml-4 lg:ml-0 h-10 object-contain" />
              ) : (
                <h1 className="ml-4 lg:ml-0 text-xl font-bold text-gray-900">
                  {companyName}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-4">
              <NotificationDropdown />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-600">
                  {profile?.role === 'admin' ? 'Yönetici' : profile?.role === 'client' ? 'Müşteri' : 'Vekilhane'}
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`
            fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-1">
            {menuItems.map((item: any) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition
                    ${currentPage === item.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
