import { useEffect, useState } from 'react';
import { supabase, Policy } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Search, Filter, X, FileText, Calendar, DollarSign, Building, Car, UserPlus, FileSpreadsheet, FilePlus, CreditCard as Edit, Trash2, RefreshCw, Home, Heart, Shield, Users, Download } from 'lucide-react';
import UploadPolicyModal from './UploadPolicyModal';
import AddClientModal from './AddClientModal';
import BulkUploadModal from './BulkUploadModal';
import UploadPolicyPDFModal from './UploadPolicyPDFModal';
import BulkPolicyUpdateModal from './BulkPolicyUpdateModal';
import BulkPDFUploadModal from './BulkPDFUploadModal';

interface Client {
  id: string;
  name: string;
  tax_number: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
}

export default function PoliciesPage() {
  const { profile, isAdmin } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'kasko' | 'trafik' | 'workplace' | 'residence' | 'health' | 'dask' | 'group_health' | 'group_accident'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showPDFUploadModal, setShowPDFUploadModal] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showBulkPDFUploadModal, setShowBulkPDFUploadModal] = useState(false);
  const [plateFilter, setPlateFilter] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  useEffect(() => {
    fetchPolicies();
    fetchClients();
    fetchInsuranceCompanies();
  }, [profile]);

  useEffect(() => {
    filterPolicies();
  }, [policies, searchTerm, filterType, plateFilter, selectedClient, selectedCompany]);

  const fetchClients = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('id, name, tax_number')
        .eq('agent_id', userData.user.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchInsuranceCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setInsuranceCompanies(data || []);
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
    }
  };

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('policies')
        .select('*, insurance_company:insurance_companies(*), client:clients(id, name, tax_number)')
        .eq('is_deleted', false)
        .in('status', ['active', 'expired']);

      if (!isAdmin && profile) {
        query = query.eq('client_id', profile.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (selectedClient !== 'all') {
      const client = clients.find(c => c.id === selectedClient);
      const clientPoliciesCount = filteredPolicies.length;

      if (!confirm(`⚠️ UYARI: "${client?.name}" müşterisinin ${clientPoliciesCount} adet poliçesini kalıcı olarak silmek istediğinizden emin misiniz?\n\n(Müşteri kaydı SİLİNMEYECEK, sadece poliçeler silinecek)`)) {
        return;
      }

      if (!confirm(`✋ SON ONAY: ${client?.name} için ${clientPoliciesCount} poliçe kalıcı olarak VERİTABANINDAN silinecek.\n\nBu işlem GERİ ALINAMAZ! Devam edilsin mi?`)) {
        return;
      }

      try {
        const { error } = await supabase
          .from('policies')
          .delete()
          .eq('client_id', selectedClient)
          .eq('agent_id', userData.user.id);

        if (error) throw error;
        alert(`✅ ${client?.name} müşterisinin ${clientPoliciesCount} poliçesi silindi (Müşteri kaydı korundu)`);
        fetchPolicies();
      } catch (error) {
        console.error('Silme hatası:', error);
        alert('❌ Silme işlemi başarısız: ' + (error as any).message);
      }
    } else {
      const totalPolicies = policies.length;
      const totalClients = clients.length;

      if (!confirm(`🚨 TEHLİKELİ İŞLEM!\n\n${totalClients} müşteriye ait TOPLAM ${totalPolicies} POLİÇE kalıcı olarak silinecek.\n\n(Müşteri kayıtları SİLİNMEYECEK)\n\nBu işlem GERİ ALINAMAZ! Emin misiniz?`)) {
        return;
      }

      if (!confirm(`✋ SON UYARI!\n\nTüm poliçeler (${totalPolicies} adet) kalıcı olarak VERİTABANINDAN silinecek.\n\nDevam edilsin mi?`)) {
        return;
      }

      if (!confirm(`⛔ LÜTFEN ONAYLAYIN:\n\n"${totalPolicies} poliçe kalıcı olarak silinecek"\n\nBu mesajı okuyup anladınız mı?`)) {
        return;
      }

      try {
        const { error } = await supabase
          .from('policies')
          .delete()
          .eq('agent_id', userData.user.id);

        if (error) throw error;
        alert(`✅ Toplam ${totalPolicies} poliçe silindi. Müşteri kayıtları korundu.`);
        fetchPolicies();
      } catch (error) {
        console.error('Silme hatası:', error);
        alert('❌ Silme işlemi başarısız: ' + (error as any).message);
      }
    }
  };

  const handleDeletePolicy = async (policyId: string, policyNumber: string) => {
    if (!confirm(`${policyNumber} numaralı poliçeyi kalıcı olarak silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('policies')
        .delete()
        .eq('id', policyId);

      if (error) throw error;

      alert('✅ Poliçe başarıyla silindi');
      fetchPolicies();
    } catch (error: any) {
      alert('❌ Poliçe silinemedi: ' + error.message);
    }
  };

  const exportToExcel = async () => {
    const { default: XLSX } = await import('xlsx');

    const excelData = filteredPolicies.map((policy) => ({
      'Poliçe No': policy.policy_number,
      'Müşteri': policy.clients?.full_name || '-',
      'TC/VKN': policy.clients?.tc_number || '-',
      'Poliçe Türü': policy.policy_type,
      'Sigorta Şirketi': policy.insurance_companies?.name || '-',
      'Sigortalı': policy.insured_name || '-',
      'Plaka': policy.plate_number || '-',
      'Başlangıç': new Date(policy.start_date).toLocaleDateString('tr-TR'),
      'Bitiş': new Date(policy.end_date).toLocaleDateString('tr-TR'),
      'Prim': Number(policy.premium_amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }),
      'Durum': policy.status === 'active' ? 'Aktif' : policy.status === 'expired' ? 'Süresi Dolmuş' : 'İptal',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Poliçeler');

    const fileName = `Poliçeler_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const filterPolicies = () => {
    let filtered = [...policies];

    if (selectedClient !== 'all') {
      filtered = filtered.filter((p) => p.client_id === selectedClient);
    }

    if (selectedCompany !== 'all') {
      filtered = filtered.filter((p) => p.insurance_company_id === selectedCompany);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((p) => p.policy_type === filterType);
    }

    if (plateFilter) {
      filtered = filtered.filter((p) =>
        p.plate_number?.toLowerCase().includes(plateFilter.toLowerCase())
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.policy_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPolicies(filtered);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₺0,00';
    return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const downloadPolicyReport = async () => {
    const XLSX = await import('xlsx');
    const reportData = filteredPolicies.map(policy => ({
      'Poliçe No': policy.policy_number,
      'Sigorta Şirketi': policy.insurance_company?.name || 'Belirtilmemiş',
      'Poliçe Tipi': policy.policy_type === 'kasko' ? 'Kasko' :
                     policy.policy_type === 'trafik' ? 'Trafik' :
                     policy.policy_type === 'workplace' ? 'İşyeri' :
                     policy.policy_type === 'residence' ? 'Konut' :
                     policy.policy_type === 'health' ? 'Sağlık' :
                     policy.policy_type === 'dask' ? 'Dask' :
                     policy.policy_type === 'group_health' ? 'Grup Sağlık' :
                     policy.policy_type === 'group_accident' ? 'Grup Ferdi Kaza' : 'Diğer',
      'Plaka/Yer': policy.plate_number || policy.location || '',
      'Başlangıç': formatDate(policy.start_date),
      'Bitiş': formatDate(policy.end_date),
      'Prim': policy.premium_amount
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Poliçeler');
    XLSX.writeFile(wb, 'police_raporu.xlsx');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Poliçeler</h2>
            <p className="text-gray-600 mt-2">Tüm poliçe kayıtlarınız ({filteredPolicies.length} adet)</p>
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-5 h-5" />
            Excel İndir
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('Sadece yöneticiler müşteri ekleyebilir');
                return;
              }
              setShowAddClientModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Müşteri
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('Sadece yöneticiler poliçe ekleyebilir');
                return;
              }
              setShowUploadModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Poliçe
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('Sadece yöneticiler toplu yükleme yapabilir');
                return;
              }
              setShowBulkUploadModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-orange-600 text-white px-3 py-2.5 rounded-lg hover:bg-orange-700 transition text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('Sadece yöneticiler PDF yükleyebilir');
                return;
              }
              setShowPDFUploadModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2.5 rounded-lg hover:bg-red-700 transition text-sm font-medium"
          >
            <FilePlus className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('Sadece yöneticiler toplu PDF yükleyebilir');
                return;
              }
              setShowBulkPDFUploadModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-pink-600 text-white px-3 py-2.5 rounded-lg hover:bg-pink-700 transition text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Toplu PDF
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('Sadece yöneticiler güncelleme yapabilir');
                return;
              }
              setShowBulkUpdateModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-cyan-600 text-white px-3 py-2.5 rounded-lg hover:bg-cyan-700 transition text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Güncelle
          </button>
          <button
            onClick={downloadPolicyReport}
            className="flex items-center justify-center gap-2 bg-teal-600 text-white px-3 py-2.5 rounded-lg hover:bg-teal-700 transition text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Rapor
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('Sadece yöneticiler toplu silme yapabilir');
                return;
              }
              handleDeleteAll();
            }}
            className="flex items-center justify-center gap-2 bg-red-700 text-white px-3 py-2.5 rounded-lg hover:bg-red-800 transition text-sm font-medium border-2 border-red-900"
          >
            <Trash2 className="w-4 h-4" />
            Tümünü Sil
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Poliçe no, plaka, adres ara..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={plateFilter}
              onChange={(e) => setPlateFilter(e.target.value)}
              placeholder="Plaka ile filtrele (örn: 34ABC)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Poliçeler</option>
              <option value="kasko">Kasko</option>
              <option value="trafik">Trafik</option>
              <option value="workplace">İşyeri</option>
              <option value="residence">Konut</option>
              <option value="health">Sağlık</option>
              <option value="dask">Dask</option>
              <option value="group_health">Grup Sağlık</option>
              <option value="group_accident">Grup Ferdi Kaza</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-gray-400" />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className={`flex-1 px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                selectedClient === 'all' ? 'border-gray-300 bg-white' : 'border-blue-500 bg-blue-50 font-semibold'
              }`}
            >
              <option value="all">Tüm Müşteriler</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.tax_number})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className={`flex-1 px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                selectedCompany === 'all' ? 'border-gray-300 bg-white' : 'border-green-500 bg-green-50 font-semibold'
              }`}
            >
              <option value="all">Tüm Şirketler</option>
              {insuranceCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredPolicies.map((policy) => (
          <div
            key={policy.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-3 ${
                    policy.policy_type === 'kasko' ? 'bg-blue-100' :
                    policy.policy_type === 'trafik' ? 'bg-orange-100' :
                    policy.policy_type === 'workplace' ? 'bg-green-100' :
                    policy.policy_type === 'residence' ? 'bg-cyan-100' :
                    policy.policy_type === 'health' ? 'bg-red-100' :
                    policy.policy_type === 'dask' ? 'bg-yellow-100' :
                    policy.policy_type === 'group_health' ? 'bg-pink-100' :
                    policy.policy_type === 'group_accident' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}
                >
                  {policy.policy_type === 'kasko' ? (
                    <Car className="w-6 h-6 text-blue-600" />
                  ) : policy.policy_type === 'trafik' ? (
                    <Car className="w-6 h-6 text-orange-600" />
                  ) : policy.policy_type === 'workplace' ? (
                    <Building className="w-6 h-6 text-green-600" />
                  ) : policy.policy_type === 'residence' ? (
                    <Home className="w-6 h-6 text-cyan-600" />
                  ) : policy.policy_type === 'health' ? (
                    <Heart className="w-6 h-6 text-red-600" />
                  ) : policy.policy_type === 'dask' ? (
                    <Shield className="w-6 h-6 text-yellow-600" />
                  ) : policy.policy_type === 'group_health' ? (
                    <Users className="w-6 h-6 text-pink-600" />
                  ) : policy.policy_type === 'group_accident' ? (
                    <Shield className="w-6 h-6 text-purple-600" />
                  ) : (
                    <FileText className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {policy.policy_number}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {policy.insurance_company?.name || 'Bilinmeyen Şirket'}
                  </p>
                  {policy.plate_number && (
                    <p className="text-xs text-gray-500 mt-1">
                      Plaka: <span className="font-medium">{policy.plate_number}</span>
                    </p>
                  )}
                  {policy.location && (
                    <p className="text-xs text-gray-500 mt-1">
                      Yer: <span className="font-medium">{policy.location}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(policy as any).pdf_data && (
                  <a
                    href={(policy as any).pdf_data}
                    download={policy.pdf_filename || `policy_${policy.policy_number}.pdf`}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </a>
                )}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleDeletePolicy(policy.id, policy.policy_number)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    policy.policy_type === 'kasko' ? 'bg-blue-100 text-blue-700' :
                    policy.policy_type === 'trafik' ? 'bg-orange-100 text-orange-700' :
                    policy.policy_type === 'workplace' ? 'bg-green-100 text-green-700' :
                    policy.policy_type === 'residence' ? 'bg-cyan-100 text-cyan-700' :
                    policy.policy_type === 'health' ? 'bg-red-100 text-red-700' :
                    policy.policy_type === 'dask' ? 'bg-yellow-100 text-yellow-700' :
                    policy.policy_type === 'group_health' ? 'bg-pink-100 text-pink-700' :
                    policy.policy_type === 'group_accident' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {policy.policy_type === 'kasko' ? 'Kasko' :
                   policy.policy_type === 'trafik' ? 'Trafik' :
                   policy.policy_type === 'workplace' ? 'İşyeri' :
                   policy.policy_type === 'residence' ? 'Konut' :
                   policy.policy_type === 'health' ? 'Sağlık' :
                   policy.policy_type === 'dask' ? 'Dask' :
                   policy.policy_type === 'group_health' ? 'Grup Sağlık' :
                   policy.policy_type === 'group_accident' ? 'Grup Ferdi Kaza' :
                   'Diğer'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(policy.policy_type === 'kasko' || policy.policy_type === 'trafik') && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Plaka</p>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-medium">{policy.plate_number || policy.license_plate || '-'}</p>
                  </div>
                </div>
              )}

              {(policy.policy_type === 'workplace' || policy.policy_type === 'residence' || policy.policy_type === 'dask') && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Adres</p>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-medium truncate">{policy.address || policy.location || '-'}</p>
                  </div>
                </div>
              )}

              {policy.policy_type === 'health' && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Sigortalı Adı</p>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-medium">{policy.insured_name || '-'}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Başlangıç</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium">{formatDate(policy.start_date)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Bitiş</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium">{formatDate(policy.end_date)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredPolicies.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Henüz poliçe kaydı bulunmuyor</p>
          </div>
        )}
      </div>

      {showUploadModal && (
        <UploadPolicyModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchPolicies();
          }}
        />
      )}

      {showPDFUploadModal && (
        <UploadPolicyPDFModal
          onClose={() => setShowPDFUploadModal(false)}
          onSuccess={() => {
            setShowPDFUploadModal(false);
            fetchPolicies();
          }}
        />
      )}

      {showAddClientModal && (
        <AddClientModal
          onClose={() => setShowAddClientModal(false)}
          onSuccess={() => {
            setShowAddClientModal(false);
            fetchClients();
          }}
        />
      )}

      {showBulkUploadModal && (
        <BulkUploadModal
          clientId={selectedClient !== 'all' ? selectedClient : undefined}
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={() => {
            setShowBulkUploadModal(false);
            fetchPolicies();
          }}
        />
      )}

      {showBulkUpdateModal && (
        <BulkPolicyUpdateModal
          onClose={() => setShowBulkUpdateModal(false)}
          onSuccess={() => {
            setShowBulkUpdateModal(false);
            fetchPolicies();
          }}
        />
      )}

      {showBulkPDFUploadModal && (
        <BulkPDFUploadModal
          isOpen={showBulkPDFUploadModal}
          onClose={() => setShowBulkPDFUploadModal(false)}
          onSuccess={() => {
            fetchPolicies();
          }}
        />
      )}
    </div>
  );
}
