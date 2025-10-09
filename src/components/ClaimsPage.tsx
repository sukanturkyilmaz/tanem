import { useEffect, useState } from 'react';
import { supabase, Claim } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, AlertCircle, TrendingDown, TrendingUp, FileSpreadsheet, Trash2, Users, Download } from 'lucide-react';
import AddClaimModal from './AddClaimModal';
import BulkClaimsUploadModal from './BulkClaimsUploadModal';

interface Client {
  id: string;
  name: string;
}

export default function ClaimsPage() {
  const { profile, isAdmin } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'count'>('date');
  const [filterInsuranceCompany, setFilterInsuranceCompany] = useState<string>('');
  const [filterClaimType, setFilterClaimType] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [topVehicles, setTopVehicles] = useState<any[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<string[]>([]);
  const [claimTypes, setClaimTypes] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientForDelete, setSelectedClientForDelete] = useState<string>('');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);

  useEffect(() => {
    fetchClaims();
    fetchClients();
  }, [profile]);

  useEffect(() => {
    filterAndSortClaims();
    calculateTopVehicles();
  }, [claims, searchTerm, sortBy, filterInsuranceCompany, filterClaimType]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('claims')
        .select('*, policy:policies(policy_number, license_plate, insurance_company:insurance_companies(*)), insurance_company:insurance_companies(*)');

      if (!isAdmin && profile) {
        query = query.eq('client_id', profile.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);

      const uniqueCompanies = [...new Set(data?.map(c =>
        c.policy_id ? c.policy?.insurance_company?.name : c.insurance_company?.name
      ).filter(Boolean) as string[])];
      setInsuranceCompanies(uniqueCompanies.sort());

      const uniqueClaimTypes = [...new Set(data?.map(c => c.claim_type).filter(Boolean) as string[])];
      setClaimTypes(uniqueClaimTypes.sort());
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, paymentAmount: number) => {
    let statusInfo = { label: 'Açık', color: 'bg-blue-100 text-blue-800' };

    if (status === 'rejected') {
      statusInfo = { label: 'Red Oldu', color: 'bg-red-100 text-red-800' };
    } else if (status === 'closed' || paymentAmount > 0) {
      statusInfo = { label: 'Ödendi', color: 'bg-green-100 text-green-800' };
    }

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const filterAndSortClaims = () => {
    let filtered = [...claims];

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.claim_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.policy?.policy_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterInsuranceCompany) {
      filtered = filtered.filter(c => {
        const companyName = c.policy_id
          ? c.policy?.insurance_company?.name
          : c.insurance_company?.name;
        return companyName === filterInsuranceCompany;
      });
    }

    if (filterClaimType) {
      filtered = filtered.filter(c => c.claim_type === filterClaimType);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.claim_date).getTime() - new Date(a.claim_date).getTime();
      } else if (sortBy === 'amount') {
        return b.payment_amount - a.payment_amount;
      } else {
        const plateA = a.license_plate || a.policy?.license_plate || '';
        const plateB = b.license_plate || b.policy?.license_plate || '';
        const countA = claims.filter(c => (c.license_plate || c.policy?.license_plate) === plateA).length;
        const countB = claims.filter(c => (c.license_plate || c.policy?.license_plate) === plateB).length;
        return countB - countA;
      }
    });

    setFilteredClaims(filtered);
  };

  const calculateTopVehicles = () => {
    const vehicleStats: { [key: string]: { count: number; total: number } } = {};

    claims.forEach((claim) => {
      const plate = claim.license_plate || claim.policy?.license_plate || 'Bilinmeyen';
      if (!vehicleStats[plate]) {
        vehicleStats[plate] = { count: 0, total: 0 };
      }
      vehicleStats[plate].count++;
      vehicleStats[plate].total += Number(claim.payment_amount);
    });

    const vehicleArray = Object.entries(vehicleStats).map(([plate, stats]) => ({
      plate,
      count: stats.count,
      total: stats.total,
    }));

    vehicleArray.sort((a, b) => b.total - a.total);
    setTopVehicles(vehicleArray.slice(0, 5));
  };

  const formatCurrency = (amount: number) => {
    return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const fetchClients = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('agent_id', userData.user.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const exportToExcel = async () => {
    const { default: XLSX } = await import('xlsx');

    const excelData = filteredClaims.map((claim) => ({
      'Hasar No': claim.claim_number,
      'Müşteri': claim.clients?.full_name || '-',
      'Plaka': claim.plate_number || '-',
      'Poliçe Türü': claim.policy_type || '-',
      'Sigorta Şirketi': claim.insurance_companies?.name || '-',
      'Hasar Tarihi': new Date(claim.claim_date).toLocaleDateString('tr-TR'),
      'Açıklama': claim.description,
      'Ödeme Tutarı': Number(claim.payment_amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }),
      'Durum': claim.status || 'Beklemede',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hasarlar');

    const fileName = `Hasarlar_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleDeleteClaim = async (claimId: string) => {
    if (!confirm('Bu hasarı kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!')) return;

    try {
      const { error } = await supabase
        .from('claims')
        .delete()
        .eq('id', claimId);

      if (error) throw error;
      alert('✅ Hasar başarıyla silindi');
      await fetchClaims();
    } catch (err) {
      console.error('Hasar silinirken hata:', err);
      alert('❌ Hasar silinirken hata oluştu: ' + (err as any).message);
    }
  };

  const handleBulkDeleteStart = () => {
    if (!selectedClientForDelete) {
      alert('Lütfen bir müşteri seçin');
      return;
    }
    setDeleteConfirmStep(1);
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (deleteConfirmStep === 1) {
      setDeleteConfirmStep(2);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: clientClaims } = await supabase
        .from('claims')
        .select('id')
        .eq('client_id', selectedClientForDelete)
        .eq('agent_id', userData.user.id);

      if (!clientClaims || clientClaims.length === 0) {
        alert('Bu müşteriye ait hasar bulunamadı');
        setShowBulkDeleteConfirm(false);
        setDeleteConfirmStep(1);
        return;
      }

      const { error } = await supabase
        .from('claims')
        .delete()
        .eq('client_id', selectedClientForDelete)
        .eq('agent_id', userData.user.id);

      if (error) throw error;

      alert(`✅ ${clientClaims.length} adet hasar başarıyla silindi`);
      setShowBulkDeleteConfirm(false);
      setDeleteConfirmStep(1);
      setSelectedClientForDelete('');
      await fetchClaims();
    } catch (err) {
      console.error('Hasarlar silinirken hata:', err);
      alert('❌ Hasarlar silinirken hata oluştu: ' + (err as any).message);
    }
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Hasarlar</h2>
          <p className="text-gray-600 mt-2">Hasar kayıtları ve analizi</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-5 h-5" />
            Excel İndir
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('Sadece yöneticiler toplu yükleme yapabilir');
                return;
              }
              setShowBulkUploadModal(true);
            }}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Excel Yükle
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                alert('Sadece yöneticiler hasar ekleyebilir');
                return;
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Yeni Hasar
          </button>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-600" />
          <select
            value={selectedClientForDelete}
            onChange={(e) => setSelectedClientForDelete(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Müşteri seçin...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <button
            onClick={handleBulkDeleteStart}
            disabled={!selectedClientForDelete}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5" />
            Seçili Müşterinin Tüm Hasarlarını Sil
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Hasar no, plaka veya poliçe ara..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={filterInsuranceCompany}
                onChange={(e) => setFilterInsuranceCompany(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm Sigorta Şirketleri</option>
                {insuranceCompanies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>

              <select
                value={filterClaimType}
                onChange={(e) => setFilterClaimType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm Hasar Şekilleri</option>
                {claimTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date">Tarihe Göre</option>
                  <option value="amount">En Büyük Tutar</option>
                  <option value="count">En Çok Hasar Adedi</option>
                </select>
              </div>
            </div>

            {(filterInsuranceCompany || filterClaimType) && (
              <div className="flex gap-2">
                {filterInsuranceCompany && (
                  <button
                    onClick={() => setFilterInsuranceCompany('')}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition"
                  >
                    {filterInsuranceCompany} ✕
                  </button>
                )}
                {filterClaimType && (
                  <button
                    onClick={() => setFilterClaimType('')}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition"
                  >
                    {filterClaimType} ✕
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filteredClaims.map((claim) => (
              <div
                key={claim.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 rounded-lg p-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        <span className="text-xs text-gray-500 font-normal mr-1">Hasar:</span>
                        {claim.claim_number || 'Hasar No Yok'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        <span className="text-xs text-gray-400 mr-1">Poliçe:</span>
                        {claim.policy?.policy_number || 'Poliçe Yok'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {claim.payment_amount > 0 && (
                        <div className="text-lg font-bold text-red-600 mb-1">
                          {formatCurrency(claim.payment_amount)}
                        </div>
                      )}
                      {getStatusBadge(claim.status || 'open', claim.payment_amount)}
                    </div>
                    <button
                      onClick={() => handleDeleteClaim(claim.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hasarı Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Tarih:</span>
                    <p className="font-medium">{formatDate(claim.claim_date)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Hasar Şekli:</span>
                    <p className="font-medium">{claim.claim_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Sigorta Şirketi:</span>
                    <p className="font-medium">
                      {claim.policy_id
                        ? (claim.policy?.insurance_company?.name || 'Bilinmiyor')
                        : (claim.insurance_company?.name || 'Bilinmiyor')
                      }
                    </p>
                  </div>
                  {(claim.license_plate || claim.policy?.license_plate) && (
                    <div>
                      <span className="text-gray-500">Plaka:</span>
                      <p className="font-medium">
                        {claim.policy_id
                          ? (claim.policy?.license_plate || claim.license_plate)
                          : claim.license_plate
                        }
                      </p>
                    </div>
                  )}
                  {claim.description && (
                    <div className="col-span-2 md:col-span-4">
                      <span className="text-gray-500">Açıklama:</span>
                      <p className="font-medium text-sm">{claim.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredClaims.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Henüz hasar kaydı bulunmuyor</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Hasar Yapan Araçlar</h3>
          <div className="space-y-3">
            {topVehicles.map((vehicle, index) => (
              <div key={vehicle.plate} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-gray-900">{vehicle.plate}</span>
                  </div>
                  {index === 0 ? (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Hasar Sayısı</p>
                    <p className="font-bold text-gray-900">{vehicle.count}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Toplam Tutar</p>
                    <p className="font-bold text-red-600">{formatCurrency(vehicle.total)}</p>
                  </div>
                </div>
              </div>
            ))}

            {topVehicles.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Henüz veri yok</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddClaimModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchClaims();
          }}
        />
      )}

      {showBulkUploadModal && (
        <BulkClaimsUploadModal
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={() => {
            setShowBulkUploadModal(false);
            fetchClaims();
          }}
        />
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {deleteConfirmStep === 1 ? 'Onay 1/2' : 'Onay 2/2 - Son Uyarı'}
              </h3>
            </div>

            <div className="mb-6">
              {deleteConfirmStep === 1 ? (
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <span className="font-semibold">
                      {clients.find(c => c.id === selectedClientForDelete)?.name}
                    </span> müşterisinin tüm hasarlarını silmek üzeresiniz.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-700 font-semibold">
                    SON UYARI: Bu işlem geri alınamaz!
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      Tüm hasarlar kalıcı olarak silinecektir. Bu işlemi geri almanız mümkün olmayacak.
                    </p>
                  </div>
                  <p className="text-gray-700">
                    Silmek için onaylayın:
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkDeleteConfirm(false);
                  setDeleteConfirmStep(1);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                İptal
              </button>
              <button
                onClick={handleBulkDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                {deleteConfirmStep === 1 ? 'Devam Et' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
