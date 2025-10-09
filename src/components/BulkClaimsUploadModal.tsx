import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';

interface BulkClaimsUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ClaimRow {
  'Dosya No': string;
  'Poliçe No': string;
  'Plaka': string;
  'Sigorta Şirketi'?: string;
  'Poliçe Türü'?: string;
  'Hasar Tarihi': string;
  'Ödeme Tutarı': number;
  'Hasar Nedeni'?: string;
}

export default function BulkClaimsUploadModal({ onClose, onSuccess }: BulkClaimsUploadModalProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<{ added: number; updated: number; failed: number }>({ added: 0, updated: 0, failed: 0 });
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, tax_number')
      .order('name');
    if (data) setClients(data);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Dosya No': 'HS-2024-001',
        'Poliçe No': 'POL123456',
        'Plaka': '34ABC123',
        'Sigorta Şirketi': 'Anadolu Sigorta',
        'Poliçe Türü': 'Kasko',
        'Hasar Tarihi': '15.01.2024',
        'Ödeme Tutarı': 5000,
        'Hasar Nedeni': 'Çarpma hasarı'
      },
      {
        'Dosya No': 'HS-2024-002',
        'Poliçe No': 'POL789012',
        'Plaka': '34XYZ789',
        'Sigorta Şirketi': 'Quick Sigorta',
        'Poliçe Türü': 'Trafik',
        'Hasar Tarihi': '20.01.2024',
        'Ödeme Tutarı': 3500,
        'Hasar Nedeni': 'Park halinde çarpma'
      },
      {
        'Dosya No': 'HS-2024-003',
        'Poliçe No': 'POL345678',
        'Plaka': '',
        'Sigorta Şirketi': 'Allianz',
        'Poliçe Türü': 'İşyeri',
        'Hasar Tarihi': '25.01.2024',
        'Ödeme Tutarı': 15000,
        'Hasar Nedeni': 'Yangın'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hasarlar');
    XLSX.writeFile(wb, 'hasar_sablonu.xlsx');
  };

  const parseDate = (dateStr: string | number): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    if (typeof dateStr === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateStr * 86400000);
      return date.toISOString().split('T')[0];
    }

    const str = String(dateStr).trim();

    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1]);
      const month = parseInt(ddmmyyyyMatch[2]);
      const year = parseInt(ddmmyyyyMatch[3]);
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const yyyymmddMatch = str.match(/^(\d{4})[\.\/-](\d{1,2})[\.\/-](\d{1,2})$/);
    if (yyyymmddMatch) {
      const year = parseInt(yyyymmddMatch[1]);
      const month = parseInt(yyyymmddMatch[2]);
      const day = parseInt(yyyymmddMatch[3]);
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      setResults({ added: 0, updated: 0, failed: 0 });

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: ClaimRow[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Excel dosyası boş');
      }

      console.log('Excel sütun adları:', Object.keys(jsonData[0]));
      console.log('İlk satır verisi:', jsonData[0]);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Kullanıcı bulunamadı');

      console.log('Seçilen müşteri ID:', selectedClientId);

      let policiesQuery = supabase
        .from('policies')
        .select('id, policy_number, license_plate, policy_type, client_id, agent_id, insurance_company_id');

      if (selectedClientId) {
        policiesQuery = policiesQuery.eq('client_id', selectedClientId);
      }

      const { data: allPolicies } = await policiesQuery;
      console.log('Bulunan poliçe sayısı:', allPolicies?.length || 0);

      const { data: allCompanies } = await supabase
        .from('insurance_companies')
        .select('id, name');

      const { data: allClaims } = await supabase
        .from('claims')
        .select('id, claim_number, policy_id, claim_date');

      if (!allPolicies || !allCompanies || !allClaims) {
        throw new Error('Veriler yüklenemedi');
      }

      const companyMap = new Map(
        allCompanies.map(c => [c.name.toLowerCase().trim(), c.id])
      );

      const findCompanyId = (searchTerm: string): string | undefined => {
        const normalized = searchTerm.toLowerCase().trim();
        console.log('Aranan şirket:', `"${searchTerm}"`, '→ normalize:', `"${normalized}"`);

        const exactMatch = companyMap.get(normalized);
        if (exactMatch) {
          console.log('✓ Tam eşleşme bulundu');
          return exactMatch;
        }

        const withSigorta = normalized + ' sigorta';
        const exactWithSigorta = companyMap.get(withSigorta);
        if (exactWithSigorta) {
          console.log('✓ "sigorta" ekleyerek eşleşme bulundu');
          return exactWithSigorta;
        }

        for (const [name, id] of companyMap) {
          if (name.includes(normalized) || normalized.includes(name)) {
            console.log('✓ Kısmi eşleşme bulundu:', name);
            return id;
          }
        }

        console.log('✗ Hiç eşleşme bulunamadı. Mevcut şirketler:', Array.from(companyMap.keys()).join(', '));

        return undefined;
      };

      const policyByNumberCompanyType = new Map();
      allPolicies.forEach(p => {
        if (p.policy_number && p.insurance_company_id) {
          const key = `${p.policy_number.toLowerCase()}-${p.insurance_company_id}-${(p.policy_type || '').toLowerCase()}`;
          policyByNumberCompanyType.set(key, p);
        }
      });

      const policyByPlate = new Map();
      allPolicies.forEach(p => {
        if (p.license_plate) {
          const plate = String(p.license_plate).replace(/\s+/g, '').toUpperCase();
          if (!policyByPlate.has(plate)) {
            policyByPlate.set(plate, []);
          }
          policyByPlate.get(plate).push(p);
        }
      });

      const claimByNumber = new Map(
        allClaims.map(c => [c.claim_number?.toLowerCase(), c])
      );

      let added = 0;
      let updated = 0;
      let failed = 0;
      const errors: string[] = [];

      const claimsToInsert = [];
      const claimsToUpdate = [];

      for (const row of jsonData) {
        try {
          let policyData = null;
          let insuranceCompanyId = null;

          if (row['Sigorta şirketi']) {
            const companyName = String(row['Sigorta şirketi']);
            insuranceCompanyId = findCompanyId(companyName);
            if (!insuranceCompanyId) {
              console.warn(`Sigorta şirketi bulunamadı: "${companyName}" (Dosya: ${row['Dosya No']})`);
            }
          }

          const policyType = row['Poliçe Türü'] ? String(row['Poliçe Türü']).toLowerCase().trim() : '';
          const claimDate = parseDate(row['Hasar Tarihi']);

          if (row['Poliçe No']) {
            const policyNum = String(row['Poliçe No']).toLowerCase();
            let matchingPolicies = allPolicies.filter(p =>
              p.policy_number?.toLowerCase() === policyNum
            );

            if (matchingPolicies.length > 0 && insuranceCompanyId) {
              matchingPolicies = matchingPolicies.filter(p =>
                p.insurance_company_id === insuranceCompanyId
              );
            }

            if (matchingPolicies.length > 0) {
              policyData = matchingPolicies[0];
            }
          }

          const paymentAmount = row['Ödeme Tutarı'];
          let amount = 0;
          if (typeof paymentAmount === 'number') {
            amount = paymentAmount;
          } else if (typeof paymentAmount === 'string') {
            const cleaned = paymentAmount.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
            amount = parseFloat(cleaned) || 0;
          }
          const status = amount > 0 ? 'closed' : 'open';

          const finalClientId = selectedClientId || policyData?.client_id || null;

          console.log('İşlenen satır:', {
            dosyaNo: row['Dosya No'],
            selectedClientId,
            policyClientId: policyData?.client_id,
            finalClientId
          });

          if (!finalClientId) {
            const identifier = row['Dosya No'] || row['Poliçe No'] || 'Bilinmeyen';
            errors.push(`Müşteri bulunamadı: ${identifier} - Lütfen müşteri seçin veya geçerli bir poliçe eşleştirin`);
            failed++;
            continue;
          }

          const claimData = {
            claim_number: row['Dosya No'] || `HS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            policy_id: policyData?.id || null,
            client_id: finalClientId,
            agent_id: user?.id || null,
            insurance_company_id: insuranceCompanyId || null,
            claim_date: claimDate,
            payment_amount: isNaN(amount) ? 0 : amount,
            license_plate: row['Plaka'] || null,
            policy_type: policyType || null,
            description: !policyData ? `Eski poliçe - Poliçe No: ${row['Poliçe No'] || 'Yok'}` : null,
            claim_type: row['Hasar Nedeni'] || 'Belirtilmemiş',
            status: status
          };

          let existingClaim = null;
          if (row['Dosya No']) {
            existingClaim = claimByNumber.get(String(row['Dosya No']).toLowerCase());
          }

          if (existingClaim) {
            claimsToUpdate.push({ ...claimData, id: existingClaim.id });
            updated++;
          } else {
            claimsToInsert.push(claimData);
            added++;
          }
        } catch (err) {
          const identifier = row['Dosya No'] || row['Poliçe No'] || 'Bilinmeyen';
          const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
          errors.push(`${identifier}: ${errorMsg}`);
          failed++;
        }
      }

      if (claimsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('claims')
          .insert(claimsToInsert);

        if (insertError) {
          console.error('Toplu ekleme hatası:', insertError);
          throw insertError;
        }
      }

      for (const claim of claimsToUpdate) {
        const { id, ...updateData } = claim;
        const { error: updateError } = await supabase
          .from('claims')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          console.error('Güncelleme hatası:', updateError);
        }
      }

      setResults({ added, updated, failed });

      if (errors.length > 0) {
        console.log('Detaylı hatalar:', errors.slice(0, 10));
        if (failed === jsonData.length) {
          setError(`Tüm kayıtlar başarısız. İlk hatalar: ${errors.slice(0, 3).join(', ')}`);
        }
      }

      if (added > 0 || updated > 0) {
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
          <h2 className="text-2xl font-bold text-gray-900">Toplu Hasar Yükleme</h2>
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
                  <li>Müşteri seçerek sadece o müşterinin poliçeleriyle eşleştirebilirsiniz</li>
                  <li>Poliçe Türü (Kasko/Trafik) belirtilmesi önemlidir</li>
                  <li>Eşleştirme: Müşteri + Poliçe No + Sigorta Şirketi + Poliçe Türü</li>
                  <li>Dosya No aynı olan kayıtlar güncellenir</li>
                  <li>Tarih formatı: 15.01.2024 veya 15/01/2024</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Müşteri Seç (Opsiyonel)
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm Müşteriler</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.tax_number ? `(${client.tax_number})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Müşteri seçerseniz, sadece o müşterinin poliçeleriyle eşleştirilir
              </p>
            </div>

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
                  {uploading ? 'Yükleniyor...' : 'Excel Dosyasını Seç'}
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

          {(results.added > 0 || results.updated > 0 || results.failed > 0) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Eklenen:</span>
                <span className="text-sm font-bold text-green-600">{results.added}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Güncellenen:</span>
                <span className="text-sm font-bold text-blue-600">{results.updated}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Başarısız:</span>
                <span className="text-sm font-bold text-red-600">{results.failed}</span>
              </div>
            </div>
          )}

          {(results.added > 0 || results.updated > 0) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  Yükleme başarılı! Sayfa otomatik yenilenecek...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
