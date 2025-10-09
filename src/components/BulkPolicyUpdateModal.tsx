import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkPolicyUpdateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface PolicyRow {
  'Poliçe No': string;
  'Sigorta Şirketi': string;
}

export default function BulkPolicyUpdateModal({ onClose, onSuccess }: BulkPolicyUpdateModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<{ updated: number; failed: number; notFound: number }>({
    updated: 0,
    failed: 0,
    notFound: 0
  });

  const downloadTemplate = () => {
    const template = [
      {
        'Poliçe No': 'POL123456',
        'Sigorta Şirketi': 'Anadolu Sigorta'
      },
      {
        'Poliçe No': 'POL789012',
        'Sigorta Şirketi': 'Türkiye Sigorta'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Poliçe Güncelleme');
    XLSX.writeFile(wb, 'police_guncelleme_sablonu.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      setResults({ updated: 0, failed: 0, notFound: 0 });

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: PolicyRow[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Excel dosyası boş');
      }

      let updated = 0;
      let failed = 0;
      let notFound = 0;
      const errors: string[] = [];

      for (const row of jsonData) {
        try {
          if (!row['Poliçe No'] || !row['Sigorta Şirketi']) {
            errors.push(`Eksik bilgi: ${row['Poliçe No'] || 'Poliçe No yok'}`);
            failed++;
            continue;
          }

          const { data: policy } = await supabase
            .from('policies')
            .select('id')
            .eq('policy_number', row['Poliçe No'])
            .maybeSingle();

          if (!policy) {
            errors.push(`Poliçe bulunamadı: ${row['Poliçe No']}`);
            notFound++;
            continue;
          }

          const { data: insuranceCompany } = await supabase
            .from('insurance_companies')
            .select('id')
            .ilike('name', row['Sigorta Şirketi'])
            .maybeSingle();

          if (!insuranceCompany) {
            errors.push(`Sigorta şirketi bulunamadı: ${row['Sigorta Şirketi']}`);
            failed++;
            continue;
          }

          const { error: updateError } = await supabase
            .from('policies')
            .update({ insurance_company_id: insuranceCompany.id })
            .eq('id', policy.id);

          if (updateError) {
            throw updateError;
          }

          updated++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
          errors.push(`${row['Poliçe No']}: ${errorMsg}`);
          failed++;
        }
      }

      setResults({ updated, failed, notFound });

      if (errors.length > 0 && errors.length <= 10) {
        console.log('Hatalar:', errors);
      }

      if (updated > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Yükleme sırasında hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Poliçe Sigorta Şirketi Güncelleme</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Nasıl Çalışır?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Poliçe No ile eşleşen poliçelerin sigorta şirketi güncellenir</li>
                  <li>Sigorta şirketi adı veritabanındaki ile eşleşmelidir</li>
                  <li>Geçerli şirketler: Anadolu Sigorta, Türkiye Sigorta, Quick Sigorta, HDI Sigorta, Neova Sigorta</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition"
            >
              <Download className="w-5 h-5" />
              Excel Şablonunu İndir
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer flex flex-col items-center gap-3 ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-lg font-semibold text-gray-700">
                  {uploading ? 'Güncelleniyor...' : 'Excel Dosyasını Seç'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  veya sürükleyip bırakın
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {(results.updated > 0 || results.failed > 0 || results.notFound > 0) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Güncellenen:</span>
                <span className="text-sm font-bold text-green-600">{results.updated}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Bulunamayan:</span>
                <span className="text-sm font-bold text-orange-600">{results.notFound}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Başarısız:</span>
                <span className="text-sm font-bold text-red-600">{results.failed}</span>
              </div>
            </div>
          )}

          {results.updated > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  Güncelleme başarılı! Sayfa otomatik yenilenecek...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
