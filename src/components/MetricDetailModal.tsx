import { useEffect, useState } from 'react';
import { X, Building2, Package, Users, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface MetricDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricType: 'policies' | 'claims' | 'premium' | 'claimAmount';
  metricTitle: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
}

interface CompanyStats {
  company_id: string;
  company_name: string;
  total: number;
  byType: { [key: string]: number };
}

interface ClientStats {
  client_id: string;
  client_name: string;
  client_tax_number: string;
  total: number;
}

interface TypeStats {
  type: string;
  total: number;
}

export default function MetricDetailModal({
  isOpen,
  onClose,
  metricType,
  metricTitle,
}: MetricDetailModalProps) {
  const { profile, isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<'client' | 'insurer' | 'type'>('client');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [companyStats, setCompanyStats] = useState<CompanyStats[]>([]);
  const [clientStats, setClientStats] = useState<ClientStats[]>([]);
  const [typeStats, setTypeStats] = useState<TypeStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, viewMode, selectedId, metricType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'client' && !selectedId) {
        await fetchClientStats();
      } else if (viewMode === 'client' && selectedId) {
        await fetchClientTypeBreakdown();
      } else if (viewMode === 'insurer' && !selectedId) {
        await fetchCompanyStats();
      } else if (viewMode === 'insurer' && selectedId) {
        await fetchCompanyTypeBreakdown();
      } else if (viewMode === 'type') {
        await fetchTypeStats();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyStats = async () => {
    const isPolicyMetric = metricType === 'policies' || metricType === 'premium';
    const tableName = isPolicyMetric ? 'policies' : 'claims';

    let query = supabase
      .from(tableName)
      .select(
        isPolicyMetric
          ? 'insurance_company_id, insurance_company:insurance_companies(name), premium_amount'
          : 'payment_amount, policy:policies!inner(agent_id, insurance_company_id, insurance_company:insurance_companies(name))'
      );

    if (isPolicyMetric) {
      query = query.is('archived_at', null).eq('is_deleted', false);
      if (!isAdmin && profile) {
        query = query.eq('agent_id', profile.id);
      }
    } else {
      query = query.not('policy_id', 'is', null);
      if (!isAdmin && profile) {
        query = query.eq('policy.agent_id', profile.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('fetchCompanyStats error:', error);
      throw error;
    }

    console.log('fetchCompanyStats data:', { metricType, isPolicyMetric, dataLength: data?.length, sampleData: data?.[0] });

    const statsMap = new Map<string, CompanyStats>();

    data?.forEach((item: any) => {
      const companyId = isPolicyMetric ? item.insurance_company_id : item.policy?.insurance_company_id;
      const companyName = isPolicyMetric
        ? item.insurance_company?.name
        : item.policy?.insurance_company?.name || 'Bilinmeyen Şirket';

      if (!companyId) {
        console.log('Skipping item - no companyId:', item);
        return;
      }

      if (!statsMap.has(companyId)) {
        statsMap.set(companyId, {
          company_id: companyId,
          company_name: companyName,
          total: 0,
          byType: {},
        });
      }

      const stat = statsMap.get(companyId)!;

      if (metricType === 'policies' || metricType === 'claims') {
        stat.total += 1;
      } else if (metricType === 'premium') {
        stat.total += Number(item.premium_amount || 0);
      } else if (metricType === 'claimAmount') {
        stat.total += Number(item.payment_amount || 0);
      }
    });

    const result = Array.from(statsMap.values()).sort((a, b) => b.total - a.total);
    console.log('fetchCompanyStats result:', result);
    setCompanyStats(result);
  };

  const fetchCompanyTypeBreakdown = async () => {
    const isPolicyMetric = metricType === 'policies' || metricType === 'premium';
    const tableName = isPolicyMetric ? 'policies' : 'claims';

    let query;
    if (isPolicyMetric) {
      query = supabase
        .from(tableName)
        .select('policy_type, premium_amount')
        .eq('insurance_company_id', selectedId)
        .is('archived_at', null)
        .eq('is_deleted', false);
      if (!isAdmin && profile) {
        query = query.eq('agent_id', profile.id);
      }
    } else {
      query = supabase
        .from(tableName)
        .select('payment_amount, policy:policies!inner(agent_id, insurance_company_id, policy_type)')
        .eq('policy.insurance_company_id', selectedId);
      if (!isAdmin && profile) {
        query = query.eq('policy.agent_id', profile.id);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    const statsMap = new Map<string, number>();

    data?.forEach((item: any) => {
      const type = isPolicyMetric ? item.policy_type : item.policy?.policy_type || 'Bilinmeyen';
      const current = statsMap.get(type) || 0;

      if (metricType === 'policies' || metricType === 'claims') {
        statsMap.set(type, current + 1);
      } else if (metricType === 'premium') {
        statsMap.set(type, current + Number(item.premium_amount || 0));
      } else if (metricType === 'claimAmount') {
        statsMap.set(type, current + Number(item.payment_amount || 0));
      }
    });

    const typeStatsArray = Array.from(statsMap.entries()).map(([type, total]) => ({
      type: formatPolicyType(type),
      total,
    }));

    setTypeStats(typeStatsArray.sort((a, b) => b.total - a.total));
  };

  const fetchClientStats = async () => {
    const isPolicyMetric = metricType === 'policies' || metricType === 'premium';
    const tableName = isPolicyMetric ? 'policies' : 'claims';

    let query = supabase
      .from(tableName)
      .select(
        isPolicyMetric
          ? 'client_id, client:clients(name, tax_number), premium_amount'
          : 'payment_amount, policy:policies!inner(agent_id, client_id, client:clients(name, tax_number))'
      );

    if (isPolicyMetric) {
      query = query.is('archived_at', null).eq('is_deleted', false);
      if (!isAdmin && profile) {
        query = query.eq('agent_id', profile.id);
      }
    } else {
      query = query.not('policy_id', 'is', null);
      if (!isAdmin && profile) {
        query = query.eq('policy.agent_id', profile.id);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    const statsMap = new Map<string, ClientStats>();

    data?.forEach((item: any) => {
      const clientId = isPolicyMetric ? item.client_id : item.policy?.client_id;
      if (!clientId) return;

      const clientName = isPolicyMetric
        ? item.client?.name || 'Bilinmeyen Müşteri'
        : item.policy?.client?.name || 'Bilinmeyen Müşteri';
      const clientTaxNumber = isPolicyMetric
        ? item.client?.tax_number || ''
        : item.policy?.client?.tax_number || '';

      if (!statsMap.has(clientId)) {
        statsMap.set(clientId, {
          client_id: clientId,
          client_name: clientName,
          client_tax_number: clientTaxNumber,
          total: 0,
        });
      }

      const stat = statsMap.get(clientId)!;

      if (metricType === 'policies' || metricType === 'claims') {
        stat.total += 1;
      } else if (metricType === 'premium') {
        stat.total += Number(item.premium_amount || 0);
      } else if (metricType === 'claimAmount') {
        stat.total += Number(item.payment_amount || 0);
      }
    });

    setClientStats(Array.from(statsMap.values()).sort((a, b) => b.total - a.total));
  };

  const fetchClientTypeBreakdown = async () => {
    const isPolicyMetric = metricType === 'policies' || metricType === 'premium';
    const tableName = isPolicyMetric ? 'policies' : 'claims';

    let query;
    if (isPolicyMetric) {
      query = supabase
        .from(tableName)
        .select('policy_type, premium_amount')
        .eq('client_id', selectedId)
        .is('archived_at', null)
        .eq('is_deleted', false);
      if (!isAdmin && profile) {
        query = query.eq('agent_id', profile.id);
      }
    } else {
      query = supabase
        .from(tableName)
        .select('payment_amount, policy:policies!inner(agent_id, client_id, policy_type)')
        .eq('policy.client_id', selectedId);
      if (!isAdmin && profile) {
        query = query.eq('policy.agent_id', profile.id);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    const statsMap = new Map<string, number>();

    data?.forEach((item: any) => {
      const type = isPolicyMetric ? item.policy_type : item.policy?.policy_type || 'Bilinmeyen';
      const current = statsMap.get(type) || 0;

      if (metricType === 'policies' || metricType === 'claims') {
        statsMap.set(type, current + 1);
      } else if (metricType === 'premium') {
        statsMap.set(type, current + Number(item.premium_amount || 0));
      } else if (metricType === 'claimAmount') {
        statsMap.set(type, current + Number(item.payment_amount || 0));
      }
    });

    const typeStatsArray = Array.from(statsMap.entries()).map(([type, total]) => ({
      type: formatPolicyType(type),
      total,
    }));

    setTypeStats(typeStatsArray.sort((a, b) => b.total - a.total));
  };

  const fetchTypeStats = async () => {
    const isPolicyMetric = metricType === 'policies' || metricType === 'premium';
    const tableName = isPolicyMetric ? 'policies' : 'claims';

    let query;
    if (isPolicyMetric) {
      query = supabase
        .from(tableName)
        .select('policy_type, premium_amount')
        .is('archived_at', null)
        .eq('is_deleted', false);
      if (!isAdmin && profile) {
        query = query.eq('agent_id', profile.id);
      }
    } else {
      query = supabase
        .from(tableName)
        .select('payment_amount, policy:policies!inner(agent_id, policy_type)');
      if (!isAdmin && profile) {
        query = query.eq('policy.agent_id', profile.id);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    const statsMap = new Map<string, number>();

    data?.forEach((item: any) => {
      const type = isPolicyMetric ? item.policy_type : item.policy?.policy_type || 'Bilinmeyen';
      const current = statsMap.get(type) || 0;

      if (metricType === 'policies' || metricType === 'claims') {
        statsMap.set(type, current + 1);
      } else if (metricType === 'premium') {
        statsMap.set(type, current + Number(item.premium_amount || 0));
      } else if (metricType === 'claimAmount') {
        statsMap.set(type, current + Number(item.payment_amount || 0));
      }
    });

    const typeStatsArray = Array.from(statsMap.entries()).map(([type, total]) => ({
      type: formatPolicyType(type),
      total,
    }));

    setTypeStats(typeStatsArray.sort((a, b) => b.total - a.total));
  };

  const formatPolicyType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      kasko: 'Kasko',
      trafik: 'Trafik',
      workplace: 'İşyeri',
      residence: 'Konut',
      health: 'Sağlık',
      dask: 'DASK',
      group_health: 'Grup Sağlık',
      group_accident: 'Grup Kaza',
      traffic: 'Trafik',
      comprehensive: 'Kasko',
      property: 'Mülk',
      liability: 'Sorumluluk',
    };
    return typeMap[type] || type;
  };

  const formatValue = (value: number): string => {
    if (metricType === 'premium' || metricType === 'claimAmount') {
      return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    }
    return value.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{metricTitle} - Detaylı Görünüm</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {isAdmin && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setViewMode('client');
                  setSelectedId(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  viewMode === 'client'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Müşteriye Göre
              </button>
              <button
                onClick={() => {
                  setViewMode('insurer');
                  setSelectedId(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  viewMode === 'insurer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                Sigorta Şirketine Göre
              </button>
              <button
                onClick={() => {
                  setViewMode('type');
                  setSelectedId(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  viewMode === 'type'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Package className="w-4 h-4" />
                Branşa Göre
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[60vh]">
              {viewMode === 'client' && !selectedId && (
                <div className="space-y-3">
                  {clientStats.map((stat) => (
                    <div
                      key={stat.client_id}
                      onClick={() => setSelectedId(stat.client_id)}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-blue-600" />
                          <div>
                            <span className="font-medium text-gray-900 block">{stat.client_name}</span>
                            {stat.client_tax_number && (
                              <span className="text-xs text-gray-500">VKN: {stat.client_tax_number}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-lg font-bold text-blue-600">
                          {formatValue(stat.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {clientStats.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Veri bulunamadı
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'client' && selectedId && (
                <div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Müşterilere Geri Dön
                  </button>
                  <div className="space-y-3">
                    {typeStats.map((stat) => (
                      <div
                        key={stat.type}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-gray-900">{stat.type}</span>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {formatValue(stat.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {typeStats.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Veri bulunamadı
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewMode === 'insurer' && !selectedId && (
                <div className="space-y-3">
                  {companyStats.map((stat) => (
                    <div
                      key={stat.company_id}
                      onClick={() => setSelectedId(stat.company_id)}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-purple-600" />
                          <span className="font-medium text-gray-900">{stat.company_name}</span>
                        </div>
                        <span className="text-lg font-bold text-purple-600">
                          {formatValue(stat.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {companyStats.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Veri bulunamadı
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'insurer' && selectedId && (
                <div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Sigorta Şirketlerine Geri Dön
                  </button>
                  <div className="space-y-3">
                    {typeStats.map((stat) => (
                      <div
                        key={stat.type}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-gray-900">{stat.type}</span>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {formatValue(stat.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {typeStats.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Veri bulunamadı
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewMode === 'type' && (
                <div className="space-y-3">
                  {typeStats.map((stat) => (
                    <div
                      key={stat.type}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-gray-900">{stat.type}</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">
                          {formatValue(stat.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {typeStats.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Veri bulunamadı
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
