import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface BulkPDFUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadResult {
  filename: string;
  policyNumber: string;
  status: 'success' | 'error' | 'not_found';
  message: string;
}

export default function BulkPDFUploadModal({ isOpen, onClose, onSuccess }: BulkPDFUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      setFiles(selectedFiles);
      setResults([]);
      setShowResults(false);
    }
  };

  const extractPolicyNumber = (filename: string): string => {
    const nameWithoutExt = filename.replace('.pdf', '');

    const match = nameWithoutExt.match(/(\d{9,})/);
    if (match) {
      return match[1];
    }

    const parts = nameWithoutExt.split(/[-_\s]/);
    for (const part of parts) {
      if (/^\d{9,}$/.test(part)) {
        return part;
      }
    }

    return nameWithoutExt;
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Lütfen en az bir PDF dosyası seçin');
      return;
    }

    setUploading(true);
    const uploadResults: UploadResult[] = [];

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Kullanıcı bulunamadı');

      for (const file of files) {
        const policyNumber = extractPolicyNumber(file.name);

        try {
          const { data: policy, error: policyError } = await supabase
            .from('policies')
            .select('id, policy_number, is_deleted')
            .eq('policy_number', policyNumber)
            .eq('is_deleted', false)
            .maybeSingle();

          if (policyError) throw policyError;

          if (!policy) {
            uploadResults.push({
              filename: file.name,
              policyNumber,
              status: 'not_found',
              message: 'Poliçe bulunamadı'
            });
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
              pdf_filename: file.name
            })
            .eq('id', policy.id);

          if (updateError) throw updateError;

          uploadResults.push({
            filename: file.name,
            policyNumber,
            status: 'success',
            message: `Poliçe ${policy.policy_number} ile eşleştirildi`
          });

        } catch (error: any) {
          uploadResults.push({
            filename: file.name,
            policyNumber,
            status: 'error',
            message: error.message
          });
        }
      }

      setResults(uploadResults);
      setShowResults(true);

      const successCount = uploadResults.filter(r => r.status === 'success').length;
      if (successCount > 0) {
        setTimeout(() => onSuccess(), 2000);
      }

    } catch (error: any) {
      alert('Yükleme hatası: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setResults([]);
    setShowResults(false);
    onClose();
  };

  if (!isOpen) return null;

  const successCount = results.filter(r => r.status === 'success').length;
  const notFoundCount = results.filter(r => r.status === 'not_found').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Toplu PDF Yükleme</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!showResults ? (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Dosya İsimlendirme:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">123456789.pdf</code> - Sadece poliçe numarası</li>
                  <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">123456789-kasko.pdf</code> - Poliçe no + açıklama</li>
                  <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">AXA_123456789.pdf</code> - Şirket + poliçe no</li>
                  <li className="mt-2 font-medium">⚠️ Dosya adında en az 9 haneli poliçe numarası olmalı</li>
                </ul>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF Dosyaları Seçin
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {files.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Seçilen Dosyalar ({files.length} adet)
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {files.map((file, index) => {
                      const policyNumber = extractPolicyNumber(file.name);
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              Tespit edilen poliçe no: <span className="font-semibold text-blue-600">{policyNumber}</span>
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Başarılı</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{successCount}</p>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-900">Bulunamadı</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{notFoundCount}</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Hata</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : result.status === 'not_found'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : result.status === 'not_found' ? (
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{result.filename}</p>
                        <p className="text-sm text-gray-600">Poliçe No: {result.policyNumber}</p>
                        <p className={`text-sm ${
                          result.status === 'success'
                            ? 'text-green-700'
                            : result.status === 'not_found'
                            ? 'text-yellow-700'
                            : 'text-red-700'
                        }`}>
                          {result.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {!showResults ? (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                İptal
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    {files.length} Dosyayı Yükle
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
