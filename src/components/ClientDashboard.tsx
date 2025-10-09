import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, AlertCircle, TrendingUp, Eye, Search, ArrowUpDown, Car, Percent, MessageSquare, Download, RefreshCw, Upload, File, Trash2, X } from 'lucide-react';
import PDFViewer from './PDFViewer';
import TopClaimsPlatesModal from './TopClaimsPlatesModal';
import { AgencyContactCard } from './AgencyContactCard';
import { AnnouncementsCard } from './AnnouncementsCard';
import { PolicyRemindersCard } from './PolicyRemindersCard';
import { QuickSupportModal } from './QuickSupportModal';
import { CustomerCharts } from './CustomerCharts';
import * as XLSX from 'xlsx';

interface Policy {
  id: string;
  policy_number: string;
  insurance_companies: { name: string } | null;
  policy_type: string;
  start_date: string;
  end_date: string;
  premium_amount: number;
  insured_name: string | null;
  plate_number: string | null;
  location: string | null;
  address: string | null;
  pdf_data: string | null;
  pdf_filename: string | null;
}

interface Claim {
  id: string;
  claim_number: string;
  policy_type: string;
  insurance_companies: { name: string } | null;
  claim_date: string;
  payment_amount: number;
  status: string;
  claim_type: string | null;
  license_plate: string | null;
}

interface Stats {
  totalPolicies: number;
  totalClaims: number;
  totalPremium: number;
  earnedPremium: number;
  totalClaimAmount: number;
}

export default function ClientDashboard() {
  const { profile, clientId } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPolicies: 0,
    totalClaims: 0,
    totalPremium: 0,
    earnedPremium: 0,
    totalClaimAmount: 0,
  });
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'claims' | 'analysis' | 'documents' | 'contact'>('overview');
  const [plateStats, setPlateStats] = useState<any[]>([]);
  const [policyTypeStats, setPolicyTypeStats] = useState<any[]>([]);
  const [analysisView, setAnalysisView] = useState<'plate' | 'policy_type'>('plate');
  const [analysisSortBy, setAnalysisSortBy] = useState<'claim_count' | 'total_claims' | 'loss_ratio'>('loss_ratio');
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [topPlatesModalOpen, setTopPlatesModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPolicyType, setSelectedPolicyType] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [claimSearchTerm, setClaimSearchTerm] = useState('');
  const [claimStartDate, setClaimStartDate] = useState('');
  const [claimEndDate, setClaimEndDate] = useState('');
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [selectedPolicyForRenewal, setSelectedPolicyForRenewal] = useState<Policy | null>(null);
  const [renewalNotes, setRenewalNotes] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedClaimType, setSelectedClaimType] = useState('');
  const [selectedClaimStatus, setSelectedClaimStatus] = useState('');
  const [selectedClaimPolicyType, setSelectedClaimPolicyType] = useState('');
  const [selectedClaimCompany, setSelectedClaimCompany] = useState('');
  const [claimSortBy, setClaimSortBy] = useState<'plate' | 'claim_type' | 'none'>('none');

  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [visibilitySettings, setVisibilitySettings] = useState({
    show_policy_reminders: true,
    show_premium_distribution: true,
    show_policy_types: true,
    show_claims_trend: true,
    show_insurance_companies: true,
  });

  console.log('ClientDashboard - clientId:', clientId, 'profile:', profile);

  useEffect(() => {
    if (clientId) {
      console.log('Fetching data for clientId:', clientId);
      fetchData();
      fetchVisibilitySettings();
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId && activeTab === 'analysis') {
      fetchAnalysisData();
    }
    if (clientId && activeTab === 'documents') {
      fetchDocuments();
    }
  }, [clientId, activeTab]);

  const fetchVisibilitySettings = async () => {
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('agent_id')
        .eq('id', clientId)
        .maybeSingle();

      if (!clientData?.agent_id) return;

      const { data } = await supabase
        .from('dashboard_visibility_settings')
        .select('*')
        .eq('agent_id', clientData.agent_id)
        .maybeSingle();

      if (data) {
        setVisibilitySettings({
          show_policy_reminders: data.show_policy_reminders,
          show_premium_distribution: data.show_premium_distribution,
          show_policy_types: data.show_policy_types,
          show_claims_trend: data.show_claims_trend,
          show_insurance_companies: data.show_insurance_companies,
        });
      }
    } catch (error) {
      console.error('Error fetching visibility settings:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [
        { data: policiesData, count: policiesCount },
        { data: claimsData, count: claimsCount },
      ] = await Promise.all([
        supabase
          .from('policies')
          .select('*, insurance_companies(name)', { count: 'exact' })
          .eq('client_id', clientId)
          .is('archived_at', null)
          .eq('is_deleted', false)
          .gte('end_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('start_date', { ascending: false }),
        supabase
          .from('claims')
          .select('*, insurance_companies(name)', { count: 'exact' })
          .eq('client_id', clientId)
          .order('claim_date', { ascending: false }),
      ]);

      const totalPremium =
        policiesData?.reduce((sum, p) => sum + Number(p.premium_amount), 0) || 0;
      const totalClaimAmount =
        claimsData?.reduce((sum, c) => sum + Number(c.payment_amount), 0) || 0;

      const today = new Date();
      const earnedPremium = policiesData?.reduce((sum, policy) => {
        const startDate = new Date(policy.start_date);
        const endDate = new Date(policy.end_date);
        const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

        const daysElapsed = Math.min(
          totalDays,
          Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        );

        const earnedRatio = daysElapsed / totalDays;
        return sum + (Number(policy.premium_amount) * earnedRatio);
      }, 0) || 0;

      setStats({
        totalPolicies: policiesCount || 0,
        totalClaims: claimsCount || 0,
        totalPremium,
        earnedPremium,
        totalClaimAmount,
      });

      setPolicies(policiesData || []);
      setClaims(claimsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysisData = async () => {
    try {
      const [{ data: policiesData }, { data: claimsData }] = await Promise.all([
        supabase
          .from('policies')
          .select('plate_number, premium_amount, start_date, end_date, policy_type')
          .eq('client_id', clientId)
          .not('plate_number', 'is', null),
        supabase
          .from('claims')
          .select('license_plate, payment_amount, claim_date, policy_type')
          .eq('client_id', clientId)
          .not('license_plate', 'is', null),
      ]);

      const plateMap: { [key: string]: any } = {};
      const today = new Date();

      policiesData?.forEach((policy: any) => {
        const plate = policy.plate_number?.replace(/\s+/g, '').toUpperCase();
        if (!plate) return;
        if (!plateMap[plate]) {
          plateMap[plate] = {
            name: policy.plate_number,
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

      claimsData?.forEach((claim: any) => {
        const plate = claim.license_plate?.replace(/\s+/g, '').toUpperCase();
        if (!plate) return;
        if (!plateMap[plate]) {
          plateMap[plate] = {
            name: plate,
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

      const plateArray = Object.values(plateMap).map((stat: any) => ({
        ...stat,
        loss_ratio: stat.earned_premium > 0 ? (stat.total_claims / stat.earned_premium) * 100 : 0,
      }));
      setPlateStats(plateArray);

      const policyTypeMap: { [key: string]: any } = {};

      policiesData?.forEach((policy: any) => {
        const pType = policy.policy_type || 'Bilinmeyen';
        if (!policyTypeMap[pType]) {
          policyTypeMap[pType] = {
            name: pType,
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

      claimsData?.forEach((claim: any) => {
        const pType = claim.policy_type || 'Bilinmeyen';
        if (!policyTypeMap[pType]) {
          policyTypeMap[pType] = {
            name: pType,
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

      const policyTypeArray = Object.values(policyTypeMap).map((stat: any) => ({
        ...stat,
        loss_ratio: stat.earned_premium > 0 ? (stat.total_claims / stat.earned_premium) * 100 : 0,
      }));
      setPolicyTypeStats(policyTypeArray);
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const { data: userData } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const documentType = (document.getElementById('document_type') as HTMLSelectElement)?.value || 'diger';
      const description = (document.getElementById('document_description') as HTMLTextAreaElement)?.value || '';

      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          agent_id: profile?.id,
          uploaded_by: userData.user?.id,
          document_type: documentType,
          document_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          description: description || null,
        });

      if (dbError) throw dbError;

      alert('✅ Dosya başarıyla yüklendi!');
      setUploadModalOpen(false);
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('❌ Dosya yüklenirken hata oluştu: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getFilteredPolicies = () => {
    let filtered = [...policies];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.policy_number.toLowerCase().includes(search) ||
          p.plate_number?.toLowerCase().includes(search) ||
          p.insurance_companies?.name?.toLowerCase().includes(search)
      );
    }

    if (selectedPolicyType) {
      filtered = filtered.filter((p) => p.policy_type === selectedPolicyType);
    }

    if (selectedCompany) {
      filtered = filtered.filter((p) => p.insurance_companies?.name === selectedCompany);
    }

    if (startDate) {
      filtered = filtered.filter((p) => new Date(p.start_date) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter((p) => new Date(p.end_date) <= new Date(endDate));
    }

    filtered.sort((a, b) => {
      const amountA = Number(a.premium_amount);
      const amountB = Number(b.premium_amount);
      return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
    });

    return filtered;
  };

  const uniquePolicyTypes = Array.from(new Set(policies.map((p) => p.policy_type)));
  const uniqueCompanies = Array.from(
    new Set(policies.map((p) => p.insurance_companies?.name).filter(Boolean))
  );

  const filteredPolicies = getFilteredPolicies();

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedPolicyType('');
    setSelectedCompany('');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchTerm || startDate || endDate || selectedPolicyType || selectedCompany;

  const getFilteredClaims = () => {
    let filtered = [...claims];

    if (claimSearchTerm) {
      const search = claimSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.claim_number && c.claim_number.toLowerCase().includes(search)) ||
          (c.license_plate && c.license_plate.toLowerCase().includes(search))
      );
    }

    if (selectedClaimType) {
      filtered = filtered.filter((c) => c.claim_type === selectedClaimType);
    }

    if (selectedClaimStatus) {
      filtered = filtered.filter((c) => c.status === selectedClaimStatus);
    }

    if (selectedClaimPolicyType) {
      filtered = filtered.filter((c) => c.policy_type === selectedClaimPolicyType);
    }

    if (selectedClaimCompany) {
      filtered = filtered.filter((c) => c.insurance_companies?.name === selectedClaimCompany);
    }

    if (claimStartDate) {
      filtered = filtered.filter((c) => new Date(c.claim_date) >= new Date(claimStartDate));
    }

    if (claimEndDate) {
      filtered = filtered.filter((c) => new Date(c.claim_date) <= new Date(claimEndDate));
    }

    if (claimSortBy === 'plate') {
      const plateCounts = filtered.reduce((acc, claim) => {
        if (claim.license_plate) {
          acc[claim.license_plate] = (acc[claim.license_plate] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      filtered.sort((a, b) => {
        const countA = a.license_plate ? plateCounts[a.license_plate] || 0 : 0;
        const countB = b.license_plate ? plateCounts[b.license_plate] || 0 : 0;
        return countB - countA;
      });
    } else if (claimSortBy === 'claim_type') {
      const claimTypeCounts = filtered.reduce((acc, claim) => {
        if (claim.claim_type) {
          acc[claim.claim_type] = (acc[claim.claim_type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      filtered.sort((a, b) => {
        const countA = a.claim_type ? claimTypeCounts[a.claim_type] || 0 : 0;
        const countB = b.claim_type ? claimTypeCounts[b.claim_type] || 0 : 0;
        return countB - countA;
      });
    }

    return filtered;
  };

  const uniqueClaimTypes = Array.from(new Set(claims.map((c) => c.claim_type).filter(Boolean)));
  const uniqueClaimStatuses = Array.from(new Set(claims.map((c) => c.status)));
  const uniqueClaimPolicyTypes = Array.from(new Set(claims.map((c) => c.policy_type)));
  const uniqueClaimCompanies = Array.from(
    new Set(claims.map((c) => c.insurance_companies?.name).filter(Boolean))
  );

  const filteredClaims = getFilteredClaims();

  const clearClaimFilters = () => {
    setClaimSearchTerm('');
    setClaimStartDate('');
    setClaimEndDate('');
    setSelectedClaimType('');
    setSelectedClaimStatus('');
    setSelectedClaimPolicyType('');
    setSelectedClaimCompany('');
    setClaimSortBy('none');
  };

  const hasActiveClaimFilters =
    claimSearchTerm ||
    claimStartDate ||
    claimEndDate ||
    selectedClaimType ||
    selectedClaimStatus ||
    selectedClaimPolicyType ||
    selectedClaimCompany ||
    claimSortBy !== 'none';

  const getSortedAnalysisData = () => {
    let data = analysisView === 'plate' ? plateStats : policyTypeStats;
    const sortedData = [...data];

    if (analysisSortBy === 'claim_count') {
      sortedData.sort((a: any, b: any) => b.claim_count - a.claim_count);
    } else if (analysisSortBy === 'total_claims') {
      sortedData.sort((a: any, b: any) => b.total_claims - a.total_claims);
    } else {
      sortedData.sort((a: any, b: any) => b.loss_ratio - a.loss_ratio);
    }

    return sortedData;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: string } } = {
      open: { label: 'Açık', color: 'bg-blue-100 text-blue-800' },
      closed: { label: 'Ödendi', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Red Oldu', color: 'bg-red-100 text-red-800' },
    };

    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const exportAllDataToExcel = () => {
    const wb = XLSX.utils.book_new();

    const policiesData = policies.map((policy) => ({
      'Poliçe No': policy.policy_number,
      'Poliçe Türü': policy.policy_type,
      'Sigorta Şirketi': policy.insurance_companies?.name || '-',
      'Sigortalı': policy.insured_name || '-',
      'Plaka': policy.plate_number || '-',
      'Başlangıç': new Date(policy.start_date).toLocaleDateString('tr-TR'),
      'Bitiş': new Date(policy.end_date).toLocaleDateString('tr-TR'),
      'Prim': Number(policy.premium_amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }),
      'Durum': policy.status === 'active' ? 'Aktif' : policy.status === 'expired' ? 'Süresi Dolmuş' : 'İptal',
    }));

    const claimsData = claims.map((claim) => ({
      'Hasar No': claim.claim_number,
      'Hasar Tarihi': new Date(claim.claim_date).toLocaleDateString('tr-TR'),
      'Plaka': claim.plate_number || '-',
      'Poliçe Türü': claim.policy_type || '-',
      'Açıklama': claim.description,
      'Ödeme Tutarı': Number(claim.payment_amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }),
      'Durum': claim.status || 'Beklemede',
    }));

    const summaryData = [
      { 'Özet': 'Toplam Poliçe Sayısı', 'Değer': policies.length },
      { 'Özet': 'Aktif Poliçeler', 'Değer': policies.filter(p => p.status === 'active').length },
      { 'Özet': 'Toplam Hasar Sayısı', 'Değer': claims.length },
      { 'Özet': 'Toplam Prim', 'Değer': policies.reduce((sum, p) => sum + Number(p.premium_amount), 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) },
      { 'Özet': 'Toplam Hasar Ödemesi', 'Değer': claims.reduce((sum, c) => sum + Number(c.payment_amount), 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) },
    ];

    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(policiesData);
    const ws3 = XLSX.utils.json_to_sheet(claimsData);

    XLSX.utils.book_append_sheet(wb, ws1, 'Özet');
    XLSX.utils.book_append_sheet(wb, ws2, 'Poliçelerim');
    XLSX.utils.book_append_sheet(wb, ws3, 'Hasarlarım');

    const fileName = `Sigorta_Raporum_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Müşteri Paneli</h2>
          <p className="text-gray-600 mt-2">Hoş geldiniz, {profile?.full_name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportAllDataToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-5 h-5" />
            Rapor İndir
          </button>
          <button
            onClick={() => setSupportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <MessageSquare className="w-5 h-5" />
            Destek Talebi
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Genel Bakış
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'policies'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Poliçelerim
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'claims'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Hasarlarım
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'analysis'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Hasar Analizi
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'documents'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Dosyalarım
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'contact'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          İletişim
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-500 rounded-lg p-3">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Toplam Poliçe</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPolicies}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-red-500 rounded-lg p-3">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Toplam Hasar</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClaims}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-500 rounded-lg p-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Toplam Prim</h3>
              <p className="text-2xl font-bold text-gray-900">
                ₺{stats.totalPremium.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-orange-500 rounded-lg p-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Toplam Hasar Tutarı</h3>
              <p className="text-2xl font-bold text-gray-900">
                ₺{stats.totalClaimAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${
                  stats.earnedPremium > 0
                    ? (stats.totalClaimAmount / stats.earnedPremium) * 100 < 50
                      ? 'bg-teal-500'
                      : (stats.totalClaimAmount / stats.earnedPremium) * 100 < 75
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                    : 'bg-gray-400'
                } rounded-lg p-3`}>
                  <Percent className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Hasar/Prim Frekansı</h3>
              <p className="text-2xl font-bold text-gray-900">
                {stats.earnedPremium > 0
                  ? `%${((stats.totalClaimAmount / stats.earnedPremium) * 100).toFixed(1)}`
                  : '-%'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.earnedPremium > 0
                  ? (stats.totalClaimAmount / stats.earnedPremium) * 100 < 50
                    ? 'Çok iyi'
                    : (stats.totalClaimAmount / stats.earnedPremium) * 100 < 75
                    ? 'İyi'
                    : 'Yüksek'
                  : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Poliçeler</h3>
                  <div className="space-y-3">
                    {policies.slice(0, 5).map((policy) => (
                      <div key={policy.id} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <p className="font-medium text-gray-900">{policy.policy_number}</p>
                          <p className="text-sm text-gray-600">{policy.insurance_companies?.name || 'Bilinmiyor'}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          ₺{Number(policy.premium_amount).toLocaleString('tr-TR')}
                        </span>
                      </div>
                    ))}
                    {policies.length === 0 && (
                      <p className="text-gray-500 text-center py-4">Henüz poliçe bulunmuyor</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Hasarlar</h3>
                  <div className="space-y-3">
                    {claims.slice(0, 5).map((claim) => (
                      <div key={claim.id} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <p className="font-medium text-gray-900">{claim.claim_number}</p>
                          <p className="text-sm text-gray-600">{claim.insurance_companies?.name || 'Bilinmiyor'}</p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(claim.status)}
                        </div>
                      </div>
                    ))}
                    {claims.length === 0 && (
                      <p className="text-gray-500 text-center py-4">Henüz hasar bulunmuyor</p>
                    )}
                  </div>
                </div>
              </div>

              <AnnouncementsCard />
              {visibilitySettings.show_policy_reminders && <PolicyRemindersCard />}
            </div>
          </div>

          <CustomerCharts
            policies={policies}
            claims={claims}
            visibilitySettings={visibilitySettings}
          />
        </>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Poliçe No, Plaka Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <input
                  type="date"
                  placeholder="Başlangıç Tarihi"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <input
                  type="date"
                  placeholder="Bitiş Tarihi"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <select
                  value={selectedPolicyType}
                  onChange={(e) => setSelectedPolicyType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tüm Poliçe Türleri</option>
                  {uniquePolicyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tüm Şirketler</option>
                  {uniqueCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSortOrder}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Prim: {sortOrder === 'desc' ? 'Yüksekten Düşüğe' : 'Düşükten Yükseğe'}
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {filteredPolicies.length} poliçe gösteriliyor
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Poliçe No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sigorta Şirketi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Poliçe Türü
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Detay
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Başlangıç
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bitiş
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Prim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    PDF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{policy.policy_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{policy.insurance_companies?.name || 'Bilinmiyor'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{policy.policy_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(policy.policy_type === 'trafik' || policy.policy_type === 'kasko') && policy.plate_number ? (
                        policy.plate_number
                      ) : (policy.policy_type === 'isyeri' || policy.policy_type === 'konut' || policy.policy_type === 'dask') ? (
                        [policy.address, policy.location].filter(Boolean).join(' ') || '-'
                      ) : policy.policy_type === 'saglik' && policy.insured_name ? (
                        policy.insured_name
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(policy.start_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(policy.end_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₺{Number(policy.premium_amount).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {policy.pdf_data && (
                        <button
                          onClick={() => setSelectedPdf(policy.pdf_data)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => {
                          setSelectedPolicyForRenewal(policy);
                          setRenewalModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Yenile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPolicies.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Henüz poliçe bulunmuyor</p>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Hasar No, Plaka Ara..."
                  value={claimSearchTerm}
                  onChange={(e) => setClaimSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <input
                  type="date"
                  placeholder="Başlangıç Tarihi"
                  value={claimStartDate}
                  onChange={(e) => setClaimStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <input
                  type="date"
                  placeholder="Bitiş Tarihi"
                  value={claimEndDate}
                  onChange={(e) => setClaimEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <select
                  value={selectedClaimType}
                  onChange={(e) => setSelectedClaimType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tüm Hasar Nedenleri</option>
                  {uniqueClaimTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedClaimStatus}
                  onChange={(e) => setSelectedClaimStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tüm Durumlar</option>
                  {uniqueClaimStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status === 'open' ? 'Açık' : status === 'closed' ? 'Ödendi' : status === 'rejected' ? 'Red' : status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedClaimPolicyType}
                  onChange={(e) => setSelectedClaimPolicyType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tüm Poliçe Türleri</option>
                  {uniqueClaimPolicyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedClaimCompany}
                  onChange={(e) => setSelectedClaimCompany(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tüm Şirketler</option>
                  {uniqueClaimCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={claimSortBy}
                  onChange={(e) => setClaimSortBy(e.target.value as 'plate' | 'claim_type' | 'none')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="none">Sıralama Seçin</option>
                  <option value="plate">En Fazla Hasar Yapan Araç</option>
                  <option value="claim_type">En Fazla Hasar Nedeni</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                {filteredClaims.length} hasar gösteriliyor
              </div>

              {hasActiveClaimFilters && (
                <button
                  onClick={clearClaimFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hasar No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sigorta Şirketi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Poliçe Türü
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hasar Nedeni
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Plaka
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Olay Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hasar Tutarı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{claim.claim_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{claim.insurance_companies?.name || 'Bilinmiyor'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{claim.policy_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{claim.claim_type || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{claim.license_plate || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(claim.claim_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₺{Number(claim.payment_amount).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(claim.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredClaims.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Henüz hasar bulunmuyor</p>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hasar Sıklığı Analizi</h3>
                <p className="text-sm text-gray-600">En çok hasar yapan plakalar ve detaylı bilgiler</p>
              </div>
              <button
                onClick={() => setTopPlatesModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Car className="w-5 h-5" />
                En Çok Hasar Yapan Plakalar
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Hasar/Prim Frekans Analizi</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setAnalysisView('plate')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    analysisView === 'plate'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Plakaya Göre
                </button>
                <button
                  onClick={() => setAnalysisView('policy_type')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    analysisView === 'policy_type'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Poliçe Türüne Göre
                </button>
              </div>
            </div>

            <div className="mt-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sıralama</label>
              <select
                value={analysisSortBy}
                onChange={(e) => setAnalysisSortBy(e.target.value as 'claim_count' | 'total_claims' | 'loss_ratio')}
                className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="loss_ratio">Hasar/Prim Oranına Göre (Yüksekten Düşüğe)</option>
                <option value="claim_count">Açılan Dosya Sayısına Göre (Çoktan Aza)</option>
                <option value="total_claims">Toplam Hasara Göre (Yüksekten Düşüğe)</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      {analysisView === 'plate' ? 'Plaka' : 'Poliçe Türü'}
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Poliçe Sayısı</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Kazanılmış Prim</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Açılan Dosya Sayısı</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Toplam Hasar</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Hasar/Prim Frekansı</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedAnalysisData().map((stat) => (
                    <tr key={stat.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-900">{stat.name}</td>
                      <td className="py-4 px-4 text-right text-gray-700">{stat.policy_count}</td>
                      <td className="py-4 px-4 text-right font-medium text-green-600">
                        ₺{stat.earned_premium.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-700">{stat.claim_count}</td>
                      <td className="py-4 px-4 text-right font-medium text-red-600">
                        ₺{stat.total_claims.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            stat.loss_ratio < 50
                              ? 'bg-green-100 text-green-700'
                              : stat.loss_ratio < 75
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          %{stat.loss_ratio.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {getSortedAnalysisData().length === 0 && (
                <div className="text-center py-12">
                  <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Analiz için yeterli veri bulunmuyor</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Dosyalarım</h3>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Upload className="w-4 h-4" />
                Dosya Yükle
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <File className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{doc.document_name}</p>
                        <p className="text-xs text-gray-500">
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Tür: <span className="font-medium">{doc.document_type}</span>
                  </p>
                  {doc.description && (
                    <p className="text-xs text-gray-600 mb-2">{doc.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        const { data } = await supabase.storage
                          .from('client-documents')
                          .createSignedUrl(doc.file_path, 3600);
                        if (data) window.open(data.signedUrl, '_blank');
                      }}
                      className="flex-1 text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Görüntüle
                    </button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Henüz dosya yüklenmemiş</p>
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Upload className="w-4 h-4" />
                    İlk Dosyayı Yükle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="max-w-4xl mx-auto">
          <AgencyContactCard clientId={clientId} />
        </div>
      )}

      {selectedPdf && (
        <PDFViewer pdfUrl={selectedPdf} onClose={() => setSelectedPdf(null)} />
      )}

      <TopClaimsPlatesModal
        isOpen={topPlatesModalOpen}
        onClose={() => setTopPlatesModalOpen(false)}
      />

      <QuickSupportModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />

      {renewalModalOpen && selectedPolicyForRenewal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Poliçe Yenileme Talebi</h3>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600 mb-1">Poliçe No</p>
                <p className="font-semibold text-gray-900">{selectedPolicyForRenewal.policy_number}</p>
                <p className="text-sm text-gray-600 mt-2 mb-1">Poliçe Türü</p>
                <p className="font-semibold text-gray-900">{selectedPolicyForRenewal.policy_type}</p>
                <p className="text-sm text-gray-600 mt-2 mb-1">Sigorta Şirketi</p>
                <p className="font-semibold text-gray-900">{selectedPolicyForRenewal.insurance_companies?.name || '-'}</p>
                <p className="text-sm text-gray-600 mt-2 mb-1">Bitiş Tarihi</p>
                <p className="font-semibold text-gray-900">
                  {new Date(selectedPolicyForRenewal.end_date).toLocaleDateString('tr-TR')}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notlarınız (Opsiyonel)
                </label>
                <textarea
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  placeholder="Yenileme ile ilgili özel talepleriniz varsa buraya yazabilirsiniz..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRenewalModalOpen(false);
                    setRenewalNotes('');
                    setSelectedPolicyForRenewal(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { data: userData } = await supabase.auth.getUser();
                      const { data: clientData } = await supabase
                        .from('clients')
                        .select('id')
                        .eq('user_id', userData.user?.id)
                        .single();

                      if (!clientData) {
                        alert('Müşteri bilgisi bulunamadı');
                        return;
                      }

                      const { error } = await supabase
                        .from('policy_renewal_requests')
                        .insert({
                          policy_id: selectedPolicyForRenewal.id,
                          client_id: clientData.id,
                          agent_id: profile?.id,
                          request_notes: renewalNotes || null,
                        });

                      if (error) throw error;

                      alert('✅ Yenileme talebiniz başarıyla gönderildi. En kısa sürede size dönüş yapılacaktır.');
                      setRenewalModalOpen(false);
                      setRenewalNotes('');
                      setSelectedPolicyForRenewal(null);
                    } catch (error: any) {
                      console.error('Error creating renewal request:', error);
                      alert('❌ Talep gönderilirken hata oluştu: ' + error.message);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Yenileme Talebi Gönder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Dosya Yükle</h3>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosya Türü
                  </label>
                  <select
                    id="document_type"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ruhsat">Ruhsat</option>
                    <option value="ehliyet">Ehliyet</option>
                    <option value="hasar_fotografi">Hasar Fotoğrafı</option>
                    <option value="fatura">Fatura</option>
                    <option value="sozlesme">Sözleşme</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama (Opsiyonel)
                  </label>
                  <textarea
                    id="document_description"
                    placeholder="Bu dosya hakkında kısa bir açıklama..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosya Seç
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept="image/*,.pdf,.doc,.docx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimum dosya boyutu: 10MB
                  </p>
                </div>

                {uploading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-sm text-gray-600">Yükleniyor...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
