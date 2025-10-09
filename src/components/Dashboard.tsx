import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, AlertCircle, TrendingUp, DollarSign, Percent, Calendar, Users, MessageSquare, Bell, RefreshCw, FolderOpen, Download } from 'lucide-react';
import MetricDetailModal from './MetricDetailModal';

interface Stats {
  totalPolicies: number;
  totalClaims: number;
  totalPremium: number;
  earnedPremium: number;
  totalClaimAmount: number;
}

interface MonthlyStats {
  newPolicies: number;
  newClaims: number;
  monthlyPremium: number;
  expiringPolicies: number;
}

interface UpcomingRenewal {
  id: string;
  policy_number: string;
  end_date: string;
  policy_type: string;
  insurance_companies: { name: string } | null;
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPolicies: 0,
    totalClaims: 0,
    totalPremium: 0,
    earnedPremium: 0,
    totalClaimAmount: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    newPolicies: 0,
    newClaims: 0,
    monthlyPremium: 0,
    expiringPolicies: 0,
  });
  const [upcomingRenewals, setUpcomingRenewals] = useState<UpcomingRenewal[]>([]);
  const [unansweredMessages, setUnansweredMessages] = useState(0);
  const [pendingRenewals, setPendingRenewals] = useState(0);
  const [todayDocuments, setTodayDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{
    type: 'policies' | 'claims' | 'premium' | 'claimAmount';
    title: string;
  } | null>(null);

  useEffect(() => {
    fetchStats();
    fetchMonthlyStats();
    fetchUpcomingRenewals();
    fetchUnansweredMessages();
    fetchPendingRenewals();
    fetchTodayDocuments();
  }, [profile]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      let policiesQuery = supabase
        .from('policies')
        .select('policy_number, premium_amount, start_date, end_date', { count: 'exact' })
        .is('archived_at', null)
        .eq('is_deleted', false);

      let claimsQuery = supabase
        .from('claims')
        .select('payment_amount, policy:policies(policy_number)', { count: 'exact' });

      if (!isAdmin && profile) {
        policiesQuery = policiesQuery.eq('agent_id', profile.id);
        claimsQuery = claimsQuery.eq('agent_id', profile.id);
      }

      const [{ data: policies, count: policiesCount }, { data: claims, count: claimsCount }] =
        await Promise.all([policiesQuery, claimsQuery]);

      const totalPremium = policies?.reduce((sum, p) => sum + Number(p.premium_amount), 0) || 0;
      const totalClaimAmount = claims?.reduce((sum, c) => sum + Number(c.payment_amount), 0) || 0;

      const policyNumbers = new Set(policies?.map(p => p.policy_number) || []);

      const matchedClaims = claims?.filter(claim =>
        claim.policy?.policy_number && policyNumbers.has(claim.policy.policy_number)
      ) || [];

      const matchedClaimAmount = matchedClaims.reduce((sum, c) => sum + Number(c.payment_amount), 0);

      const matchedPolicyNumbers = new Set(
        matchedClaims.map(c => c.policy?.policy_number).filter(Boolean)
      );

      const matchedPolicies = policies?.filter(p => matchedPolicyNumbers.has(p.policy_number)) || [];

      const today = new Date();
      const earnedPremium = matchedPolicies.reduce((sum, policy) => {
        const startDate = new Date(policy.start_date);
        const endDate = new Date(policy.end_date);
        const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

        const daysElapsed = Math.min(
          totalDays,
          Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        );

        const earnedRatio = daysElapsed / totalDays;
        return sum + (Number(policy.premium_amount) * earnedRatio);
      }, 0);

      setStats({
        totalPolicies: policiesCount || 0,
        totalClaims: claimsCount || 0,
        totalPremium,
        earnedPremium,
        totalClaimAmount: matchedClaimAmount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      let policiesQuery = supabase
        .from('policies')
        .select('premium_amount, start_date')
        .gte('start_date', firstDayOfMonth.toISOString())
        .lte('start_date', lastDayOfMonth.toISOString())
        .is('archived_at', null)
        .eq('is_deleted', false);

      let claimsQuery = supabase
        .from('claims')
        .select('id', { count: 'exact' })
        .gte('claim_date', firstDayOfMonth.toISOString())
        .lte('claim_date', lastDayOfMonth.toISOString());

      let expiringQuery = supabase
        .from('policies')
        .select('id', { count: 'exact' })
        .gte('end_date', today.toISOString())
        .lte('end_date', new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .is('archived_at', null)
        .eq('is_deleted', false)
        .eq('status', 'active');

      if (!isAdmin && profile) {
        policiesQuery = policiesQuery.eq('agent_id', profile.id);
        claimsQuery = claimsQuery.eq('agent_id', profile.id);
        expiringQuery = expiringQuery.eq('agent_id', profile.id);
      }

      const [{ data: newPolicies, count: newPoliciesCount }, { count: newClaimsCount }, { count: expiringCount }] =
        await Promise.all([policiesQuery, claimsQuery, expiringQuery]);

      const monthlyPremium = newPolicies?.reduce((sum, p) => sum + Number(p.premium_amount), 0) || 0;

      setMonthlyStats({
        newPolicies: newPoliciesCount || 0,
        newClaims: newClaimsCount || 0,
        monthlyPremium,
        expiringPolicies: expiringCount || 0,
      });
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  };

  const fetchUpcomingRenewals = async () => {
    try {
      const today = new Date();
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      let query = supabase
        .from('policies')
        .select('id, policy_number, end_date, policy_type, insurance_companies(name)')
        .gte('end_date', today.toISOString())
        .lte('end_date', thirtyDaysLater.toISOString())
        .is('archived_at', null)
        .eq('is_deleted', false)
        .eq('status', 'active')
        .order('end_date', { ascending: true })
        .limit(5);

      if (!isAdmin && profile) {
        query = query.eq('agent_id', profile.id);
      }

      const { data } = await query;
      setUpcomingRenewals((data as any) || []);
    } catch (error) {
      console.error('Error fetching upcoming renewals:', error);
    }
  };

  const fetchUnansweredMessages = async () => {
    try {
      const { count } = await supabase
        .from('customer_messages')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'read']);

      setUnansweredMessages(count || 0);
    } catch (error) {
      console.error('Error fetching unanswered messages:', error);
    }
  };

  const fetchPendingRenewals = async () => {
    try {
      const { count } = await supabase
        .from('policy_renewal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setPendingRenewals(count || 0);
    } catch (error) {
      console.error('Error fetching pending renewals:', error);
    }
  };

  const fetchTodayDocuments = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('client_documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setTodayDocuments(count || 0);
    } catch (error) {
      console.error('Error fetching today documents:', error);
    }
  };

  const handleMetricClick = (type: 'policies' | 'claims' | 'premium' | 'claimAmount', title: string) => {
    setSelectedMetric({ type, title });
    setModalOpen(true);
  };

  const lossRatio = stats.earnedPremium > 0 ? (stats.totalClaimAmount / stats.earnedPremium) * 100 : 0;
  const lossRatioColor = lossRatio < 50 ? 'bg-teal-500' : lossRatio < 75 ? 'bg-yellow-500' : 'bg-red-500';
  const lossRatioStatus = lossRatio < 50 ? 'Çok iyi' : lossRatio < 75 ? 'İyi' : 'Yüksek';

  const statCards = [
    {
      title: 'Toplam Poliçe',
      value: stats.totalPolicies,
      icon: FileText,
      color: 'bg-blue-500',
      metricType: 'policies' as const,
    },
    {
      title: 'Toplam Hasar',
      value: stats.totalClaims,
      icon: AlertCircle,
      color: 'bg-red-500',
      metricType: 'claims' as const,
    },
    {
      title: 'Toplam Prim',
      value: `₺${stats.totalPremium.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-green-500',
      metricType: 'premium' as const,
    },
    {
      title: 'Toplam Hasar Tutarı',
      value: `₺${stats.totalClaimAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      metricType: 'claimAmount' as const,
    },
    {
      title: 'Hasar/Prim Frekansı',
      value: stats.earnedPremium > 0 ? `%${lossRatio.toFixed(1)}` : '-%',
      subtitle: stats.earnedPremium > 0 ? lossRatioStatus : '',
      icon: Percent,
      color: stats.earnedPremium > 0 ? lossRatioColor : 'bg-gray-400',
      metricType: null,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleDownloadBackup = () => {
    const link = document.createElement('a');
    link.href = '/deploy-latest.tar.gz';
    link.download = 'stnsigorta-deployment.tar.gz';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Ana Sayfa</h2>
          <p className="text-gray-600 mt-2">
            Hoş geldiniz, {profile?.full_name}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download className="w-5 h-5" />
            Deployment Dosyası İndir
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              onClick={() => card.metricType && handleMetricClick(card.metricType, card.title)}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${card.metricType ? 'hover:shadow-lg transition cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} rounded-lg p-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Bu Ay</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Yeni Poliçeler</p>
                <p className="text-2xl font-bold text-blue-600">{monthlyStats.newPolicies}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Yeni Hasarlar</p>
                <p className="text-2xl font-bold text-red-600">{monthlyStats.newClaims}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Aylık Prim</p>
                <p className="text-xl font-bold text-green-600">
                  ₺{monthlyStats.monthlyPremium.toLocaleString('tr-TR')}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Kritik Hatırlatıcılar</h3>
          </div>
          <div className="space-y-3">
            {unansweredMessages > 0 && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'messages' }))}
                className="w-full p-3 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-gray-900">Yanıtlanmamış Mesajlar</p>
                      <p className="text-sm text-gray-600">{unansweredMessages} mesaj bekliyor</p>
                    </div>
                  </div>
                  <span className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unansweredMessages}
                  </span>
                </div>
              </button>
            )}
            {pendingRenewals > 0 && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'renewals' }))}
                className="w-full p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Bekleyen Yenileme Talepleri</p>
                      <p className="text-sm text-gray-600">{pendingRenewals} talep onay bekliyor</p>
                    </div>
                  </div>
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingRenewals}
                  </span>
                </div>
              </button>
            )}
            {todayDocuments > 0 && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'documents' }))}
                className="w-full p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Bugün Yüklenen Dosyalar</p>
                      <p className="text-sm text-gray-600">{todayDocuments} yeni dosya</p>
                    </div>
                  </div>
                  <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {todayDocuments}
                  </span>
                </div>
              </button>
            )}
            {monthlyStats.expiringPolicies > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-gray-900">Yaklaşan Yenilemeler</p>
                      <p className="text-sm text-gray-600">30 gün içinde {monthlyStats.expiringPolicies} poliçe</p>
                    </div>
                  </div>
                  <span className="bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {monthlyStats.expiringPolicies}
                  </span>
                </div>
              </div>
            )}
            {unansweredMessages === 0 && monthlyStats.expiringPolicies === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Şu an kritik hatırlatıcı yok</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Yaklaşan Yenilemeler</h3>
          </div>
          <div className="space-y-2">
            {upcomingRenewals.length > 0 ? (
              upcomingRenewals.map((renewal) => (
                <div
                  key={renewal.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{renewal.policy_number}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {renewal.policy_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {renewal.insurance_companies?.name || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Bitiş</p>
                      <p className="text-xs font-medium text-red-600">
                        {new Date(renewal.end_date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">30 gün içinde yenilenecek poliçe yok</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı Erişim</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'policies' }))}
            className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition text-left"
          >
            <FileText className="w-8 h-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">Poliçeler</h4>
            <p className="text-sm text-gray-600">Tüm poliçelerinizi görüntüleyin ve yönetin</p>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'claims' }))}
            className="p-4 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition text-left"
          >
            <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">Hasarlar</h4>
            <p className="text-sm text-gray-600">Hasar kayıtlarını inceleyin ve analiz edin</p>
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'analytics' }))}
            className="p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition text-left"
          >
            <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">Analiz & Raporlar</h4>
            <p className="text-sm text-gray-600">Detaylı raporlar ve istatistikler</p>
          </button>
        </div>
      </div>

      {selectedMetric && (
        <MetricDetailModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedMetric(null);
          }}
          metricType={selectedMetric.type}
          metricTitle={selectedMetric.title}
        />
      )}
    </div>
  );
}
