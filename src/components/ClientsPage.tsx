import { useState, useEffect } from 'react';
import { Users, Trash2, UserPlus, Search, Phone, Mail, FileText, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AddClientModal from './AddClientModal';
import CreateClientAccountModal from './CreateClientAccountModal';

interface Client {
  id: string;
  name: string;
  tc_number: string | null;
  tax_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  policy_count?: number;
  claim_count?: number;
  user_id: string | null;
  password_set: boolean;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(term) ||
        client.tc_number?.includes(term) ||
        client.tax_number?.includes(term) ||
        client.phone?.includes(term) ||
        client.email?.toLowerCase().includes(term)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const loadClients = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agent_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clientsWithCounts = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { count: policyCount } = await supabase
            .from('policies')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .eq('is_deleted', false);

          const { count: claimCount } = await supabase
            .from('claims')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          return {
            ...client,
            policy_count: policyCount || 0,
            claim_count: claimCount || 0,
          };
        })
      );

      setClients(clientsWithCounts);
      setFilteredClients(clientsWithCounts);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (client.policy_count! > 0 || client.claim_count! > 0) {
      alert(`Bu müşterinin ${client.policy_count} poliçesi ve ${client.claim_count} hasarı var. Önce bunları silmeniz gerekiyor.`);
      return;
    }

    if (!confirm(`${client.name} müşterisini silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      alert('Müşteri başarıyla silindi!');
      loadClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      alert('Müşteri silinirken hata oluştu: ' + error.message);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-gray-600 mt-1">Toplam {clients.length} müşteri</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Yeni Müşteri
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Müşteri adı, TC No, Vergi No, telefon veya email ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Müşteri bulunamadı' : 'Henüz müşteri eklenmemiş'}
          </h3>
          <p className="text-gray-600">
            {searchTerm ? 'Arama kriterlerinize uygun müşteri bulunamadı.' : 'Yeni müşteri eklemek için yukarıdaki butona tıklayın.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müşteri Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TC / Vergi No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Poliçe
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hasar
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hesap Durumu
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          {client.address && (
                            <div className="text-xs text-gray-500">{client.address}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.tc_number && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">TC:</span>
                            <span>{client.tc_number}</span>
                          </div>
                        )}
                        {client.tax_number && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">VN:</span>
                            <span>{client.tax_number}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.phone && (
                          <div className="flex items-center gap-1 mb-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="text-xs">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FileText className="w-3 h-3 mr-1" />
                        {client.policy_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <FileText className="w-3 h-3 mr-1" />
                        {client.claim_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {client.password_set ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Aktif
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowCreateAccountModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
                        >
                          <Key className="w-3 h-3 mr-1" />
                          Hesap Oluştur
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(client)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadClients();
          }}
        />
      )}

      {showCreateAccountModal && selectedClient && (
        <CreateClientAccountModal
          client={selectedClient}
          onClose={() => {
            setShowCreateAccountModal(false);
            setSelectedClient(null);
          }}
          onSuccess={() => {
            setShowCreateAccountModal(false);
            setSelectedClient(null);
            loadClients();
          }}
        />
      )}
    </div>
  );
}
