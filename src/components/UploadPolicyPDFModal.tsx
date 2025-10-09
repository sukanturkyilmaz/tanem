import { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UploadPolicyPDFModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function UploadPolicyPDFModal({ onClose, onSuccess }: UploadPolicyPDFModalProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const errors: string[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;

        if (!fileName.toLowerCase().endsWith('.pdf')) {
          errors.push(`${fileName}: PDF dosyası değil`);
          failCount++;
          continue;
        }

        const nameParts = fileName.replace('.pdf', '').split('_');

        if (nameParts.length < 3) {
          errors.push(`${fileName}: Format hatalı (plaka_bitiştarihi_tip.pdf)`);
          failCount++;
          continue;
        }

        const plateOrLocation = nameParts[0].trim().toUpperCase();
        const endDate = nameParts[1].trim();
        const policyType = nameParts[2].trim().toLowerCase().replace('.pdf', '');

        let plateNumber = null;
        let location = null;

        if (plateOrLocation.match(/^\d{2}[A-Z]+\d+$/i)) {
          plateNumber = plateOrLocation;
        } else {
          location = plateOrLocation.toLowerCase();
        }

        let query = supabase
          .from('policies')
          .select('id, policy_number, plate_number, location')
          .eq('agent_id', user.id)
          .eq('policy_type', policyType)
          .eq('end_date', endDate)
          .eq('is_deleted', false)
          .eq('status', 'active');

        if (plateNumber) {
          query = query.ilike('plate_number', plateNumber);
        } else if (location) {
          query = query.ilike('location', location);
        }

        const { data: policies, error: queryError } = await query;

        if (queryError) {
          errors.push(`${fileName}: Poliçe sorgulanamadı - ${queryError.message}`);
          failCount++;
          continue;
        }

        let matchingPolicy = null;

        if (policies && policies.length > 0) {
          matchingPolicy = policies[0];
        }

        if (!matchingPolicy) {
          errors.push(`${fileName}: Eşleşen poliçe bulunamadı`);
          failCount++;
          continue;
        }

        const reader = new FileReader();
        const pdfData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { error: updateError } = await supabase
          .from('policies')
          .update({
            pdf_data: pdfData,
            pdf_filename: fileName,
          })
          .eq('id', matchingPolicy.id);

        if (updateError) {
          errors.push(`${fileName}: Veritabanı güncelleme hatası - ${updateError.message}`);
          failCount++;
          continue;
        }

        successCount++;
      }

      setResult({
        success: successCount,
        failed: failCount,
        errors,
      });

      if (successCount > 0) {
        onSuccess();
      }
    } catch (error: any) {
      setResult({
        success: 0,
        failed: files.length,
        errors: [error.message],
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Poliçe PDF Yükle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!result ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">📁 Toplu PDF Yükleme</h3>
                <div className="bg-white rounded p-3 mb-3">
                  <p className="text-blue-900 font-medium mb-1">✅ Tek seferde tüm PDF'leri seçebilirsiniz!</p>
                  <p className="text-blue-700 text-sm">Dosya seçerken Ctrl (Windows) veya Cmd (Mac) tuşuyla çoklu seçim yapın</p>
                </div>

                <h4 className="font-semibold text-blue-900 mb-2">Dosya Adlandırma Formatı:</h4>
                <p className="text-blue-800 text-sm mb-3">
                  <strong>plaka_bitiştarihi_tip.pdf</strong> veya <strong>yer_bitiştarihi_tip.pdf</strong>
                </p>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Örnekler:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li><code className="bg-blue-100 px-2 py-1 rounded">34ABC123_2025-01-01_trafik.pdf</code></li>
                    <li><code className="bg-blue-100 px-2 py-1 rounded">06XYZ789_2025-06-15_kasko.pdf</code></li>
                    <li><code className="bg-blue-100 px-2 py-1 rounded">istanbulanadolusubesi_2025-03-20_konut.pdf</code></li>
                  </ul>
                  <p className="mt-3"><strong>Poliçe Tipleri:</strong> trafik, kasko, dask, saglik, konut, isyeri</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="pdf-upload"
                  multiple
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-blue-500 mb-4" />
                  <p className="text-xl font-bold text-gray-900 mb-2">
                    🚀 Tüm PDF'leri Tek Seferde Seçin
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Dosya seçerken <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl</kbd> + Tıklama ile çoklu seçim
                  </p>
                  <p className="text-xs text-gray-500">
                    veya sürükleyip bırakın
                  </p>
                </label>
              </div>

              {uploading && (
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Dosyalar yükleniyor...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{result.success} başarılı</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{result.failed} başarısız</span>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">Hatalar:</h4>
                  <ul className="space-y-1 text-sm text-red-800 max-h-60 overflow-y-auto">
                    {result.errors.map((error, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  setResult(null);
                  onClose();
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Kapat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
