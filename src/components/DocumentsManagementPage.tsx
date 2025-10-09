import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { File, User, Calendar, Download, Trash2, Eye, Search, Filter } from 'lucide-react';

interface Document {
  id: string;
  client_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  description: string | null;
  created_at: string;
  clients: {
    full_name: string;
    email: string;
  };
}

export default function DocumentsManagementPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_documents')
        .select(`
          *,
          clients (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string, filePath: string) => {
    if (!confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      alert('✅ Dosya başarıyla silindi!');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      alert('❌ Dosya silinirken hata oluştu: ' + error.message);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading document:', error);
      alert('❌ Dosya indirilirken hata oluştu: ' + error.message);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      ruhsat: 'Ruhsat',
      ehliyet: 'Ehliyet',
      hasar_fotografi: 'Hasar Fotoğrafı',
      fatura: 'Fatura',
      sozlesme: 'Sözleşme',
      diger: 'Diğer',
    };
    return types[type] || type;
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.clients.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.clients.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || doc.document_type === filterType;

    return matchesSearch && matchesType;
  });

  const stats = {
    total: documents.length,
    ruhsat: documents.filter((d) => d.document_type === 'ruhsat').length,
    ehliyet: documents.filter((d) => d.document_type === 'ehliyet').length,
    hasar: documents.filter((d) => d.document_type === 'hasar_fotografi').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dosya Yönetimi</h1>
          <p className="text-gray-600 mt-1">Müşteri dosyalarını görüntüleyin ve yönetin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Dosya</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <File className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ruhsat</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.ruhsat}</p>
            </div>
            <File className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ehliyet</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.ehliyet}</p>
            </div>
            <File className="w-10 h-10 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hasar Fotoğrafı</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.hasar}</p>
            </div>
            <File className="w-10 h-10 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Dosya adı, müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Tüm Dosya Türleri</option>
                <option value="ruhsat">Ruhsat</option>
                <option value="ehliyet">Ehliyet</option>
                <option value="hasar_fotografi">Hasar Fotoğrafı</option>
                <option value="fatura">Fatura</option>
                <option value="sozlesme">Sözleşme</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Dosya bulunamadı</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dosya Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Boyut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.document_name}</p>
                          {doc.description && (
                            <p className="text-xs text-gray-500">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {doc.clients.full_name}
                        </p>
                        <p className="text-xs text-gray-500">{doc.clients.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {getDocumentTypeLabel(doc.document_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const { data } = await supabase.storage
                              .from('client-documents')
                              .createSignedUrl(doc.file_path, 3600);
                            if (data) window.open(data.signedUrl, '_blank');
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc.file_path, doc.document_name)}
                          className="text-green-600 hover:text-green-800"
                          title="İndir"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.file_path)}
                          className="text-red-600 hover:text-red-800"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
