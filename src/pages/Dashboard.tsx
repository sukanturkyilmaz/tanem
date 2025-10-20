import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Client, Policy, Claim } from '../types/database';
import {
  LayoutDashboard,
  Users,
  FileText,
  AlertCircle,
  LogOut,
  Shield,
  Bell,
  Settings,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface DashboardProps {
  profile: Profile;
  onLogout: () => void;
}

export default function Dashboard({ profile, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalClients: 0,
    activePolicies: 0,
    pendingClaims: 0,
    expiringPolicies: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [clientsResult, policiesResult, claimsResult] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase
          .from('policies')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('claims')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const { count: expiringCount } = await supabase
        .from('policies')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('end_date', today.toISOString())
        .lte('end_date', thirtyDaysFromNow.toISOString());

      setStats({
        totalClients: clientsResult.count || 0,
        activePolicies: policiesResult.count || 0,
        pendingClaims: claimsResult.count || 0,
        expiringPolicies: expiringCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    color,
  }: {
    icon: any;
    title: string;
    value: number;
    color: string;
  }) => (
    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-4 rounded-full ${color}`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">STN Sigorta</h1>
                <p className="text-xs text-gray-500">Yönetim Paneli</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Hoş Geldiniz, {profile.full_name}
          </h2>
          <p className="text-gray-600">
            İşte bugünün sigorta portföyünüze genel bakış
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={Users}
              title="Toplam Müşteri"
              value={stats.totalClients}
              color="bg-blue-600"
            />
            <StatCard
              icon={FileText}
              title="Aktif Poliçe"
              value={stats.activePolicies}
              color="bg-green-600"
            />
            <StatCard
              icon={AlertCircle}
              title="Bekleyen Hasar"
              value={stats.pendingClaims}
              color="bg-orange-600"
            />
            <StatCard
              icon={Calendar}
              title="Yaklaşan Yenilemeler"
              value={stats.expiringPolicies}
              color="bg-red-600"
            />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="border-b mb-6">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-4 px-2 font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 inline mr-2" />
                Genel Bakış
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`pb-4 px-2 font-medium transition-colors ${
                  activeTab === 'clients'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-5 h-5 inline mr-2" />
                Müşteriler
              </button>
              <button
                onClick={() => setActiveTab('policies')}
                className={`pb-4 px-2 font-medium transition-colors ${
                  activeTab === 'policies'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                Poliçeler
              </button>
            </div>
          </div>

          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sigorta Yönetim Sistemi Aktif
            </h3>
            <p className="text-gray-600 mb-6">
              Veritabanı bağlantınız başarılı. Sistemin tam işlevselliği için veritabanı migration'ını çalıştırın.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <h4 className="font-semibold text-blue-900 mb-2">Sonraki Adımlar:</h4>
              <ol className="text-left text-sm text-blue-800 space-y-1">
                <li>1. Supabase Dashboard'a gidin</li>
                <li>2. SQL Editor'de COMPLETE_MIGRATION.sql dosyasını çalıştırın</li>
                <li>3. Admin profili oluşturun</li>
                <li>4. Sistemi kullanmaya başlayın</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
