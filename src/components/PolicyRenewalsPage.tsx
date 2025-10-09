import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCw, Clock, CheckCircle, XCircle, FileText, User, Calendar, MessageSquare } from 'lucide-react';

interface RenewalRequest {
  id: string;
  policy_id: string;
  client_id: string;
  agent_id: string;
  request_notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  policies: {
    policy_number: string;
    policy_type: string;
    end_date: string;
    insurance_companies: { name: string } | null;
  };
  clients: {
    full_name: string;
    email: string;
    phone: string | null;
  };
}

export default function PolicyRenewalsPage() {
  const { profile } = useAuth();
  const [renewals, setRenewals] = useState<RenewalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRenewals();
  }, []);

  const fetchRenewals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('policy_renewal_requests')
        .select(`
          *,
          policies (
            policy_number,
            policy_type,
            end_date,
            insurance_companies (name)
          ),
          clients (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRenewals(data || []);
    } catch (error) {
      console.error('Error fetching renewals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (renewalId: string, newStatus: 'approved' | 'rejected' | 'completed') => {
    try {
      setProcessing(true);

      const { error } = await supabase
        .from('policy_renewal_requests')
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          processed_by: profile?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', renewalId);

      if (error) throw error;

      alert('✅ Talep durumu güncellendi!');
      setModalOpen(false);
      setSelectedRenewal(null);
      setAdminNotes('');
      fetchRenewals();
    } catch (error: any) {
      console.error('Error updating renewal:', error);
      alert('❌ Hata: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Beklemede
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Reddedildi
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Tamamlandı
          </span>
        );
      default:
        return null;
    }
  };

  const filteredRenewals = renewals.filter((renewal) => {
    if (filterStatus === 'all') return true;
    return renewal.status === filterStatus;
  });

  const stats = {
    total: renewals.length,
    pending: renewals.filter((r) => r.status === 'pending').length,
    approved: renewals.filter((r) => r.status === 'approved').length,
    completed: renewals.filter((r) => r.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Poliçe Yenileme Talepleri</h1>
          <p className="text-gray-600 mt-1">Müşterilerden gelen yenileme taleplerini yönetin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Talep</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <RefreshCw className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bekleyen</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Onaylanan</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.approved}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tamamlanan</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tümü ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bekleyen ({stats.pending})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'approved'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Onaylanan ({stats.approved})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tamamlanan ({stats.completed})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRenewals.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Henüz yenileme talebi bulunmuyor</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Poliçe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Poliçe Türü
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bitiş Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Talep Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRenewals.map((renewal) => (
                  <tr key={renewal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {renewal.clients.full_name}
                        </p>
                        <p className="text-xs text-gray-500">{renewal.clients.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {renewal.policies.policy_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {renewal.policies.policy_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(renewal.policies.end_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(renewal.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(renewal.status)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedRenewal(renewal);
                          setAdminNotes(renewal.admin_notes || '');
                          setModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Detay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && selectedRenewal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Yenileme Talebi Detayı</h3>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setSelectedRenewal(null);
                    setAdminNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-medium text-gray-600">Müşteri</p>
                    </div>
                    <p className="font-semibold text-gray-900">{selectedRenewal.clients.full_name}</p>
                    <p className="text-sm text-gray-600">{selectedRenewal.clients.email}</p>
                    {selectedRenewal.clients.phone && (
                      <p className="text-sm text-gray-600">{selectedRenewal.clients.phone}</p>
                    )}
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-gray-600">Poliçe Bilgileri</p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {selectedRenewal.policies.policy_number}
                    </p>
                    <p className="text-sm text-gray-600">{selectedRenewal.policies.policy_type}</p>
                    <p className="text-sm text-gray-600">
                      {selectedRenewal.policies.insurance_companies?.name || '-'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-medium text-gray-600">Tarih Bilgileri</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Poliçe Bitiş Tarihi</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedRenewal.policies.end_date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Talep Tarihi</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedRenewal.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedRenewal.request_notes && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-yellow-600" />
                      <p className="text-sm font-medium text-gray-600">Müşteri Notları</p>
                    </div>
                    <p className="text-sm text-gray-900">{selectedRenewal.request_notes}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notları
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Talep hakkında notlarınız..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    disabled={processing}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Mevcut Durum:</span>
                  {getStatusBadge(selectedRenewal.status)}
                </div>

                {selectedRenewal.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleStatusUpdate(selectedRenewal.id, 'approved')}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedRenewal.id, 'rejected')}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                    >
                      Reddet
                    </button>
                  </div>
                )}

                {selectedRenewal.status === 'approved' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedRenewal.id, 'completed')}
                    disabled={processing}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    Yenilemeyi Tamamla
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
