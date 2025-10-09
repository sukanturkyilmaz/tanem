import { useState, useEffect } from 'react';
import { X, Plus, Loader, Upload, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddClaimModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClaimModal({ onClose, onSuccess }: AddClaimModalProps) {
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const [uploadMode, setUploadMode] = useState<'manual' | 'excel'>('manual');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    claim_number: '',
    policy_id: '',
    claim_date: '',
    claim_type: '',
    license_plate: '',
    payment_amount: '',
    description: '',
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    const { data } = await supabase
      .from('policies')
      .select('id, policy_number, license_plate, policy_type, client_id')
      .order('policy_number');
    setPolicies(data || []);
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      alert('Lütfen bir Excel dosyası seçin');
      return;
    }

    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split('\n').filter(row => row.trim());

          if (rows.length < 2) {
            throw new Error('Excel dosyası boş veya geçersiz');
          }

          const headers = rows[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
          const claims = [];

          for (let i = 1; i < rows.length; i++) {
            const values = rows[i].split(/[,;\t]/).map(v => v.trim());

            const policyNumber = values[headers.indexOf('policeNo')] || values[headers.indexOf('police_no')] || values[0];
            const claimDate = values[headers.indexOf('hasartarihi')] || values[headers.indexOf('hasar_tarihi')] || values[1];
            const claimType = values[headers.indexOf('hasartipi')] || values[headers.indexOf('hasar_tipi')] || values[2];
            const licensePlate = values[headers.indexOf('plaka')] || values[3] || '';
            const paymentAmount = values[headers.indexOf('odenentutar')] || values[headers.indexOf('odenen_tutar')] || values[4] || '0';
            const description = values[headers.indexOf('aciklama')] || values[5] || '';

            const policy = policies.find(p => p.policy_number === policyNumber);

            if (policy) {
              claims.push({
                policy_id: policy.id,
                client_id: policy.client_id,
                claim_date: claimDate,
                claim_type: claimType,
                license_plate: licensePlate || policy.license_plate,
                payment_amount: parseFloat(paymentAmount.replace(/[^\d.-]/g, '')) || 0,
                description: description,
              });
            }
          }

          if (claims.length === 0) {
            throw new Error('Geçerli hasar kaydı bulunamadı. Poliçe numaralarını kontrol edin.');
          }

          const { error } = await supabase.from('claims').insert(claims);
          if (error) throw error;

          alert(`${claims.length} hasar kaydı başarıyla eklendi!`);
          onSuccess();
        } catch (error: any) {
          console.error('Excel parse error:', error);
          alert('Excel dosyası işlenirken hata oluştu: ' + error.message);
          setLoading(false);
        }
      };

      reader.readAsText(excelFile);
    } catch (error: any) {
      console.error('Error uploading excel:', error);
      alert('Dosya yüklenirken hata oluştu: ' + error.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadMode === 'excel') {
      await handleExcelUpload();
      return;
    }

    if (!formData.policy_id) {
      alert('Lütfen bir poliçe seçin');
      return;
    }

    setLoading(true);

    try {
      const selectedPolicy = policies.find(p => p.id === formData.policy_id);

      const claimData = {
        claim_number: formData.claim_number || null,
        policy_id: formData.policy_id,
        claim_date: formData.claim_date,
        claim_type: formData.claim_type,
        license_plate: formData.license_plate || null,
        payment_amount: parseFloat(formData.payment_amount) || 0,
        description: formData.description || null,
        client_id: selectedPolicy?.client_id,
      };

      const { error } = await supabase.from('claims').insert([claimData]);

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error('Error adding claim:', error);
      alert('Hasar eklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Yeni Hasar Ekle</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUploadMode('manual')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                uploadMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-5 h-5" />
              Manuel Giriş
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('excel')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                uploadMode === 'excel'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
              Excel ile Yükle
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {uploadMode === 'excel' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Excel Dosya Formatı</h4>
                <p className="text-sm text-gray-600 mb-3">
                  CSV veya Excel dosyanız aşağıdaki sütunları içermelidir:
                </p>
                <div className="bg-white rounded border border-gray-200 p-3 font-mono text-xs overflow-x-auto">
                  <div className="whitespace-nowrap">
                    policeNo, hasarTarihi, hasarTipi, plaka, odenenTutar, aciklama
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Not: Sütun başlıkları küçük/büyük harf duyarlı değildir. Dosya CSV formatında olmalıdır.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Excel/CSV Dosyası *
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                {excelFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Seçilen dosya: {excelFile.name}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poliçe *
              </label>
              <select
                required
                value={formData.policy_id}
                onChange={(e) => {
                  const policy = policies.find(p => p.id === e.target.value);
                  setFormData({
                    ...formData,
                    policy_id: e.target.value,
                    license_plate: policy?.license_plate || '',
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Poliçe Seçin</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.policy_number} {policy.license_plate ? `- ${policy.license_plate}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasar Numarası
              </label>
              <input
                type="text"
                value={formData.claim_number}
                onChange={(e) => setFormData({ ...formData, claim_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Opsiyonel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasar Tarihi *
              </label>
              <input
                type="date"
                required
                value={formData.claim_date}
                onChange={(e) => setFormData({ ...formData, claim_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasar Şekli *
              </label>
              <input
                type="text"
                required
                value={formData.claim_type}
                onChange={(e) => setFormData({ ...formData, claim_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: Çarpma, Yangın, Hırsızlık"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plaka
              </label>
              <input
                type="text"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ödeme Tutarı (₺) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.payment_amount}
                onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Hasar hakkında ek bilgiler..."
              />
            </div>
          </div>

          )}

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {uploadMode === 'excel' ? 'Yükleniyor...' : 'Kaydediliyor...'}
                </>
              ) : (
                <>
                  {uploadMode === 'excel' ? (
                    <>
                      <Upload className="w-5 h-5" />
                      Yükle
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Kaydet
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
