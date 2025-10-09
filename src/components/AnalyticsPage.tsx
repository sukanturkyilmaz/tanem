import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, BarChart3, TrendingUp, TrendingDown, Car, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CompanyStats {
  company_name: string;
  total_premium: number;
  total_claims: number;
  loss_ratio: number;
  policy_count: number;
  claim_count: number;
}

interface Client {
  id: string;
  name: string;
}

interface InsuranceCompany {
  id: number;
  name: string;
}

export default function AnalyticsPage() {
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState<CompanyStats[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'company' | 'client' | 'branch' | 'plate' | 'policy_type'>('company');
  const [clientStats, setClientStats] = useState<any[]>([]);
  const [branchStats, setBranchStats] = useState<any[]>([]);
  const [plateStats, setPlateStats] = useState<any[]>([]);
  const [policyTypeStats, setPolicyTypeStats] = useState<any[]>([]);
  const [plateSortBy, setPlateSortBy] = useState<'claim_count' | 'total_claims' | 'loss_ratio'>('loss_ratio');
  const [policyTypeSortBy, setPolicyTypeSortBy] = useState<'claim_count' | 'total_claims' | 'loss_ratio'>('loss_ratio');

  useEffect(() => {
    const today = new Date();
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    setStartDate(lastYear.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    fetchClientsAndCompanies();
  }, []);

  const fetchClientsAndCompanies = async () => {
    try {
      const [{ data: clientsData }, { data: companiesData }] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('insurance_companies').select('id, name').order('name'),
      ]);
      setClients(clientsData || []);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalytics();
    }
  }, [startDate, endDate, profile, selectedClient, selectedCompany, selectedPolicyType]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      let policiesQuery = supabase
        .from('policies')
        .select('insurance_company_id, client_id, premium_amount, policy_type, insurance_company:insurance_companies(name)')
        .gte('start_date', startDate)
        .lte('start_date', endDate);

      let claimsQuery = supabase
        .from('claims')
        .select('payment_amount, client_id, insurance_company_id, policy_type, insurance_company:insurance_companies(name)')
        .gte('claim_date', startDate)
        .lte('claim_date', endDate);

      if (!isAdmin && profile) {
        policiesQuery = policiesQuery.eq('agent_id', profile.id);
        claimsQuery = claimsQuery.eq('policy.agent_id', profile.id);
      }

      if (selectedClient) {
        policiesQuery = policiesQuery.eq('client_id', selectedClient);
        claimsQuery = claimsQuery.eq('client_id', selectedClient);
      }

      if (selectedCompany) {
        policiesQuery = policiesQuery.eq('insurance_company_id', Number(selectedCompany));
        claimsQuery = claimsQuery.eq('insurance_company_id', Number(selectedCompany));
      }

      if (selectedPolicyType) {
        policiesQuery = policiesQuery.eq('policy_type', selectedPolicyType);
        claimsQuery = claimsQuery.eq('policy_type', selectedPolicyType);
      }

      const [{ data: policies, error: policiesError }, { data: claims, error: claimsError }] = await Promise.all([
        policiesQuery,
        claimsQuery,
      ]);

      console.log('Analiz - Poliçe sayısı:', policies?.length, 'Hata:', policiesError);
      console.log('Analiz - Hasar sayısı:', claims?.length, 'Hata:', claimsError);

      const clientIds = new Set<string>();
      policies?.forEach(p => p.client_id && clientIds.add(p.client_id));
      claims?.forEach(c => c.client_id && clientIds.add(c.client_id));

      const clientNamesMap = new Map<string, string>();
      if (clientIds.size > 0) {
        const { data: clientProfiles } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', Array.from(clientIds));

        clientProfiles?.forEach(profile => {
          clientNamesMap.set(profile.id, profile.name);
        });
      }

      const companyMap: { [key: string]: CompanyStats } = {};

      policies?.forEach((policy: any) => {
        const companyName = policy.insurance_company?.name || 'Bilinmeyen';
        if (!companyMap[companyName]) {
          companyMap[companyName] = {
            company_name: companyName,
            total_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }
        companyMap[companyName].total_premium += Number(policy.premium_amount) || 0;
        companyMap[companyName].policy_count += 1;
      });

      claims?.forEach((claim: any) => {
        const companyName = claim.insurance_company?.name || 'Bilinmeyen';
        if (!companyMap[companyName]) {
          companyMap[companyName] = {
            company_name: companyName,
            total_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }
        companyMap[companyName].total_claims += Number(claim.payment_amount) || 0;
        companyMap[companyName].claim_count += 1;
      });

      const statsArray = Object.values(companyMap).map((stat) => ({
        ...stat,
        loss_ratio: stat.total_premium > 0 ? (stat.total_claims / stat.total_premium) * 100 : 0,
      }));

      statsArray.sort((a, b) => b.total_premium - a.total_premium);
      setStats(statsArray);

      const clientMap: { [key: string]: CompanyStats } = {};
      policies?.forEach((policy: any) => {
        const clientName = clientNamesMap.get(policy.client_id) || 'Bilinmeyen';
        if (!clientMap[clientName]) {
          clientMap[clientName] = {
            company_name: clientName,
            total_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }
        clientMap[clientName].total_premium += Number(policy.premium_amount) || 0;
        clientMap[clientName].policy_count += 1;
      });

      claims?.forEach((claim: any) => {
        const clientName = clientNamesMap.get(claim.client_id) || 'Bilinmeyen';
        if (!clientMap[clientName]) {
          clientMap[clientName] = {
            company_name: clientName,
            total_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }
        clientMap[clientName].total_claims += Number(claim.payment_amount) || 0;
        clientMap[clientName].claim_count += 1;
      });

      const clientArray = Object.values(clientMap).map((stat) => ({
        ...stat,
        loss_ratio: stat.total_premium > 0 ? (stat.total_claims / stat.total_premium) * 100 : 0,
      }));
      clientArray.sort((a, b) => b.total_claims - a.total_claims);
      setClientStats(clientArray);

      const branchMap: { [key: string]: CompanyStats } = {};
      policies?.forEach((policy: any) => {
        const branchName = policy.policy_type || 'Bilinmeyen';
        if (!branchMap[branchName]) {
          branchMap[branchName] = {
            company_name: branchName,
            total_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }
        branchMap[branchName].total_premium += Number(policy.premium_amount) || 0;
        branchMap[branchName].policy_count += 1;
      });

      claims?.forEach((claim: any) => {
        const branchName = claim.policy_type || 'Bilinmeyen';
        if (!branchMap[branchName]) {
          branchMap[branchName] = {
            company_name: branchName,
            total_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }
        branchMap[branchName].total_claims += Number(claim.payment_amount) || 0;
        branchMap[branchName].claim_count += 1;
      });

      const branchArray = Object.values(branchMap).map((stat) => ({
        ...stat,
        loss_ratio: stat.total_premium > 0 ? (stat.total_claims / stat.total_premium) * 100 : 0,
      }));
      branchArray.sort((a, b) => b.total_claims - a.total_claims);
      setBranchStats(branchArray);

      const { data: policiesWithPlates } = await supabase
        .from('policies')
        .select('plate_number, premium_amount, start_date, end_date, policy_type')
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .not('plate_number', 'is', null);

      const { data: claimsWithPlates } = await supabase
        .from('claims')
        .select('license_plate, payment_amount, claim_date, policy_type')
        .gte('claim_date', startDate)
        .lte('claim_date', endDate)
        .not('license_plate', 'is', null);

      const plateMap: { [key: string]: any } = {};
      const today = new Date();

      policiesWithPlates?.forEach((policy: any) => {
        const plate = policy.plate_number?.replace(/\s+/g, '').toUpperCase();
        if (!plate) return;
        if (!plateMap[plate]) {
          plateMap[plate] = {
            company_name: policy.plate_number,
            normalized_plate: plate,
            total_premium: 0,
            earned_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }

        const startDate = new Date(policy.start_date);
        const endDate = new Date(policy.end_date);
        const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const earnedDays = Math.min((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24), totalDays);
        const earnedRatio = totalDays > 0 ? Math.max(0, Math.min(earnedDays / totalDays, 1)) : 0;
        const earnedPremium = Number(policy.premium_amount) * earnedRatio;

        plateMap[plate].total_premium += Number(policy.premium_amount) || 0;
        plateMap[plate].earned_premium += earnedPremium;
        plateMap[plate].policy_count += 1;
      });

      claimsWithPlates?.forEach((claim: any) => {
        const plate = claim.license_plate?.replace(/\s+/g, '').toUpperCase();
        if (!plate) return;
        if (!plateMap[plate]) {
          plateMap[plate] = {
            company_name: plate,
            total_premium: 0,
            earned_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }
        plateMap[plate].total_claims += Number(claim.payment_amount) || 0;
        plateMap[plate].claim_count += 1;
      });

      let plateArray = Object.values(plateMap).map((stat: any) => ({
        ...stat,
        loss_ratio: stat.earned_premium > 0 ? (stat.total_claims / stat.earned_premium) * 100 : 0,
      }));
      setPlateStats(plateArray);

      const policyTypeMap: { [key: string]: any } = {};

      policiesWithPlates?.forEach((policy: any) => {
        const pType = policy.policy_type || 'Bilinmeyen';
        if (!policyTypeMap[pType]) {
          policyTypeMap[pType] = {
            company_name: pType,
            total_premium: 0,
            earned_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }

        const startDate = new Date(policy.start_date);
        const endDate = new Date(policy.end_date);
        const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const earnedDays = Math.min((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24), totalDays);
        const earnedRatio = totalDays > 0 ? Math.max(0, Math.min(earnedDays / totalDays, 1)) : 0;
        const earnedPremium = Number(policy.premium_amount) * earnedRatio;

        policyTypeMap[pType].total_premium += Number(policy.premium_amount) || 0;
        policyTypeMap[pType].earned_premium += earnedPremium;
        policyTypeMap[pType].policy_count += 1;
      });

      claimsWithPlates?.forEach((claim: any) => {
        const pType = claim.policy_type || 'Bilinmeyen';
        if (!policyTypeMap[pType]) {
          policyTypeMap[pType] = {
            company_name: pType,
            total_premium: 0,
            earned_premium: 0,
            total_claims: 0,
            loss_ratio: 0,
            policy_count: 0,
            claim_count: 0,
          };
        }
        policyTypeMap[pType].total_claims += Number(claim.payment_amount) || 0;
        policyTypeMap[pType].claim_count += 1;
      });

      let policyTypeArray = Object.values(policyTypeMap).map((stat: any) => ({
        ...stat,
        loss_ratio: stat.earned_premium > 0 ? (stat.total_claims / stat.earned_premium) * 100 : 0,
      }));
      setPolicyTypeStats(policyTypeArray);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  const formatPercent = (percent: number) => {
    return `%${percent.toFixed(2)}`;
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const companyData = stats.map((stat) => ({
      'Sigorta Şirketi': stat.company_name,
      'Toplam Prim': formatCurrency(stat.total_premium),
      'Toplam Hasar Ödemesi': formatCurrency(stat.total_claims),
      'Hasar/Prim Oranı': formatPercent(stat.loss_ratio),
      'Poliçe Sayısı': stat.policy_count,
      'Hasar Sayısı': stat.claim_count,
    }));

    const clientData = clientStats.map((stat) => ({
      'Müşteri': stat.client_name,
      'Toplam Prim': formatCurrency(stat.total_premium),
      'Toplam Hasar Ödemesi': formatCurrency(stat.total_claims),
      'Hasar/Prim Oranı': formatPercent(stat.loss_ratio),
      'Poliçe Sayısı': stat.policy_count,
      'Hasar Sayısı': stat.claim_count,
    }));

    const branchData = branchStats.map((stat) => ({
      'Branş': stat.branch_name,
      'Toplam Prim': formatCurrency(stat.total_premium),
      'Toplam Hasar Ödemesi': formatCurrency(stat.total_claims),
      'Hasar/Prim Oranı': formatPercent(stat.loss_ratio),
      'Poliçe Sayısı': stat.policy_count,
      'Hasar Sayısı': stat.claim_count,
    }));

    const plateData = plateStats.map((stat) => ({
      'Plaka': stat.plate_number,
      'Toplam Hasar Ödemesi': formatCurrency(stat.total_claims),
      'Hasar/Prim Oranı': formatPercent(stat.loss_ratio),
      'Hasar Sayısı': stat.claim_count,
    }));

    const policyTypeData = policyTypeStats.map((stat) => ({
      'Poliçe Türü': stat.policy_type,
      'Toplam Hasar Ödemesi': formatCurrency(stat.total_claims),
      'Hasar/Prim Oranı': formatPercent(stat.loss_ratio),
      'Hasar Sayısı': stat.claim_count,
    }));

    if (companyData.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(companyData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Şirket Analizi');
    }

    if (clientData.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(clientData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Müşteri Analizi');
    }

    if (branchData.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(branchData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Branş Analizi');
    }

    if (plateData.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(plateData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Plaka Analizi');
    }

    if (policyTypeData.length > 0) {
      const ws5 = XLSX.utils.json_to_sheet(policyTypeData);
      XLSX.utils.book_append_sheet(wb, ws5, 'Poliçe Türü Analizi');
    }

    const fileName = `Analiz_Raporu_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getSortedData = () => {
    let data = groupBy === 'company' ? stats : groupBy === 'client' ? clientStats : groupBy === 'branch' ? branchStats : groupBy === 'plate' ? plateStats : policyTypeStats;

    if (groupBy === 'plate' || groupBy === 'policy_type') {
      const sortBy = groupBy === 'plate' ? plateSortBy : policyTypeSortBy;
      const sortedData = [...data];

      if (sortBy === 'claim_count') {
        sortedData.sort((a: any, b: any) => b.claim_count - a.claim_count);
      } else if (sortBy === 'total_claims') {
        sortedData.sort((a: any, b: any) => b.total_claims - a.total_claims);
      } else {
        sortedData.sort((a: any, b: any) => b.loss_ratio - a.loss_ratio);
      }

      return sortedData;
    }

    return data;
  };

  const getTotalStats = () => {
    return stats.reduce(
      (acc, stat) => ({
        totalPremium: acc.totalPremium + stat.total_premium,
        totalClaims: acc.totalClaims + stat.total_claims,
        totalPolicies: acc.totalPolicies + stat.policy_count,
        totalClaimCount: acc.totalClaimCount + stat.claim_count,
      }),
      { totalPremium: 0, totalClaims: 0, totalPolicies: 0, totalClaimCount: 0 }
    );
  };

  const totals = getTotalStats();
  const overallLossRatio =
    totals.totalPremium > 0 ? (totals.totalClaims / totals.totalPremium) * 100 : 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analiz & Raporlar</h2>
          <p className="text-gray-600 mt-2">Sigorta şirketlerine göre hasar-prim analizi</p>
        </div>
        <button
          onClick={exportToExcel}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          Excel İndir
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtreler</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Müşteri</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tümü</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sigorta Şirketi</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tümü</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Branş</label>
            <select
              value={selectedPolicyType}
              onChange={(e) => setSelectedPolicyType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tümü</option>
              <option value="Kasko">Kasko</option>
              <option value="Trafik">Trafik</option>
              <option value="DASK">DASK</option>
              <option value="Konut">Konut</option>
              <option value="İşyeri">İşyeri</option>
              <option value="Sağlık">Sağlık</option>
              <option value="Hayat">Hayat</option>
              <option value="Ferdi Kaza">Ferdi Kaza</option>
              <option value="Seyahat">Seyahat</option>
              <option value="IMM">IMM</option>
              <option value="Nakliyat">Nakliyat</option>
              <option value="Yangın">Yangın</option>
              <option value="Mühendislik">Mühendislik</option>
              <option value="Sorumluluk">Sorumluluk</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
              <h4 className="text-sm font-medium mb-2 opacity-90">Toplam Üretim</h4>
              <p className="text-2xl font-bold">{formatCurrency(totals.totalPremium)}</p>
              <p className="text-xs opacity-75 mt-1">{totals.totalPolicies} poliçe</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-sm p-6 text-white">
              <h4 className="text-sm font-medium mb-2 opacity-90">Toplam Hasar</h4>
              <p className="text-2xl font-bold">{formatCurrency(totals.totalClaims)}</p>
              <p className="text-xs opacity-75 mt-1">{totals.totalClaimCount} hasar</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
              <h4 className="text-sm font-medium mb-2 opacity-90">Hasar/Prim Oranı</h4>
              <p className="text-2xl font-bold">{formatPercent(overallLossRatio)}</p>
              <div className="flex items-center gap-1 mt-1 text-xs">
                {overallLossRatio < 70 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>Düşük risk</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Yüksek risk</span>
                  </>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
              <h4 className="text-sm font-medium mb-2 opacity-90">Üretim Frekansı</h4>
              <p className="text-2xl font-bold">{totals.totalPolicies > 0 ? (totals.totalPremium / totals.totalPolicies).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'} ₺</p>
              <p className="text-xs opacity-75 mt-1">Ortalama prim</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm p-6 text-white">
              <h4 className="text-sm font-medium mb-2 opacity-90">Hasar Frekansı</h4>
              <p className="text-2xl font-bold">{totals.totalPolicies > 0 ? ((totals.totalClaimCount / totals.totalPolicies) * 100).toFixed(1) : '0'}%</p>
              <p className="text-xs opacity-75 mt-1">{totals.totalClaimCount}/{totals.totalPolicies} poliçe</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Detaylı Analiz
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setGroupBy('company')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    groupBy === 'company'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Sigorta Şirketine Göre
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setGroupBy('client')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      groupBy === 'client'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Müşteriye Göre
                  </button>
                )}
                <button
                  onClick={() => setGroupBy('branch')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    groupBy === 'branch'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Branşa Göre
                </button>
                <button
                  onClick={() => setGroupBy('plate')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    groupBy === 'plate'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Plakaya Göre
                </button>
                <button
                  onClick={() => setGroupBy('policy_type')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    groupBy === 'policy_type'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Poliçe Türüne Göre
                </button>
              </div>
            </div>

            {(groupBy === 'plate' || groupBy === 'policy_type') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sıralama</label>
                <select
                  value={groupBy === 'plate' ? plateSortBy : policyTypeSortBy}
                  onChange={(e) => {
                    const value = e.target.value as 'claim_count' | 'total_claims' | 'loss_ratio';
                    if (groupBy === 'plate') {
                      setPlateSortBy(value);
                    } else {
                      setPolicyTypeSortBy(value);
                    }
                  }}
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="loss_ratio">Hasar/Prim Oranına Göre (Yüksekten Düşüğe)</option>
                  <option value="claim_count">Açılan Dosya Sayısına Göre (Çoktan Aza)</option>
                  <option value="total_claims">Toplam Hasara Göre (Yüksekten Düşüğe)</option>
                </select>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      {groupBy === 'company' ? 'Sigorta Şirketi' : groupBy === 'client' ? 'Müşteri' : groupBy === 'branch' ? 'Branş' : groupBy === 'plate' ? 'Plaka' : 'Poliçe Türü'}
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">
                      Poliçe Sayısı
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">
                      {groupBy === 'plate' || groupBy === 'policy_type' ? 'Kazanılmış Prim' : 'Toplam Prim'}
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">
                      Açılan Dosya Sayısı
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">
                      Toplam Hasar
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">
                      Hasar/Prim Oranı
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedData().map((stat) => (
                    <tr key={stat.company_name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-900">
                        {stat.company_name}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-700">
                        {stat.policy_count}
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-green-600">
                        {formatCurrency(groupBy === 'plate' || groupBy === 'policy_type' ? stat.earned_premium : stat.total_premium)}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-700">
                        {stat.claim_count}
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-red-600">
                        {formatCurrency(stat.total_claims)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            stat.loss_ratio < 50
                              ? 'bg-green-100 text-green-700'
                              : stat.loss_ratio < 70
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {formatPercent(stat.loss_ratio)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {getSortedData().length === 0 && (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Seçili tarih aralığında veri bulunmuyor</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hasar/Prim Oranı Grafiği</h3>
            <div className="space-y-4">
              {getSortedData().map((stat) => {
                const currentData = getSortedData();
                const premiumValue = (groupBy === 'plate' || groupBy === 'policy_type') ? stat.earned_premium : stat.total_premium;
                const maxPremium = Math.max(...currentData.map((s: any) => (groupBy === 'plate' || groupBy === 'policy_type') ? s.earned_premium : s.total_premium));
                const premiumWidth = maxPremium > 0 ? (premiumValue / maxPremium) * 100 : 0;
                const claimsWidth = premiumValue > 0 ? (stat.total_claims / premiumValue) * 100 : 0;

                return (
                  <div key={stat.company_name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {stat.company_name}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatPercent(stat.loss_ratio)}
                      </span>
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="absolute h-full bg-blue-500 rounded-lg transition-all duration-500"
                        style={{ width: `${premiumWidth}%` }}
                      >
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white">
                          {formatCurrency(premiumValue)}
                        </span>
                      </div>
                      <div
                        className="absolute h-full bg-red-500 rounded-lg transition-all duration-500"
                        style={{ width: `${Math.min(claimsWidth, premiumWidth)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span>Prim</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>Hasar</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {getSortedData().length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Görüntülenecek veri yok</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
