import { useState } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
}

interface ExcelRow {
  [key: string]: string | number | undefined;
}

interface ProcessResult {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  totalPremium?: number;
  skippedPremium?: number;
}

export default function BulkUploadModal({ onClose, onSuccess, clientId }: BulkUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const downloadTemplate = () => {
    let template;

    if (clientId) {
      // Single client mode - no customer info needed
      template = [
        {
          'Sigorta Şirketi': 'Anadolu Sigorta',
          'Poliçe No': 'POL123456',
          'Poliçe Tipi': 'kasko',
          'Sigortalı Adı': 'Ahmet Yılmaz',
          'Plaka': '34ABC123',
          'Riziko Adresi 1': '',
          'Riziko Adresi 2': '',
          'Başlangıç Tarihi': '01.01.2024',
          'Bitiş Tarihi': '01.01.2025',
          'Prim Tutarı': '5000',
        },
        {
          'Sigorta Şirketi': 'Türkiye Sigorta',
          'Poliçe No': 'POL789012',
          'Poliçe Tipi': 'trafik',
          'Sigortalı Adı': 'Ahmet Yılmaz',
          'Plaka': '06XYZ456',
          'Riziko Adresi 1': '',
          'Riziko Adresi 2': '',
          'Başlangıç Tarihi': '15.02.2024',
          'Bitiş Tarihi': '15.02.2025',
          'Prim Tutarı': '2000',
        },
      ];
    } else {
      // Multi-client mode - customer info required
      template = [
        {
          'Müşteri Adı': 'Ahmet Yılmaz',
          'TC Kimlik No': '12345678901',
          'Vergi No': '',
          'Telefon': '05321234567',
          'Email': 'ahmet@example.com',
          'Sigorta Şirketi': 'Anadolu Sigorta',
          'Poliçe No': 'POL123456',
          'Poliçe Tipi': 'kasko',
          'Sigortalı Adı': 'Ahmet Yılmaz',
          'Plaka': '34ABC123',
          'Riziko Adresi 1': '',
          'Riziko Adresi 2': '',
          'Başlangıç Tarihi': '01.01.2024',
          'Bitiş Tarihi': '01.01.2025',
          'Prim Tutarı': '5000',
        },
        {
          'Müşteri Adı': 'Mehmet Kaya',
          'TC Kimlik No': '98765432109',
          'Vergi No': '',
          'Telefon': '05339876543',
          'Email': 'mehmet@example.com',
          'Sigorta Şirketi': 'Türkiye Sigorta',
          'Poliçe No': 'POL789012',
          'Poliçe Tipi': 'trafik',
          'Sigortalı Adı': 'Mehmet Kaya',
          'Plaka': '06XYZ456',
          'Riziko Adresi 1': '',
          'Riziko Adresi 2': '',
          'Başlangıç Tarihi': '15.02.2024',
          'Bitiş Tarihi': '15.02.2025',
          'Prim Tutarı': '2000',
        },
        {
          'Müşteri Adı': 'ABC Şirketi',
          'TC Kimlik No': '',
          'Vergi No': '1234567890',
          'Telefon': '05351112233',
          'Email': 'info@abc.com',
          'Sigorta Şirketi': 'Allianz Sigorta',
          'Poliçe No': 'POL345678',
          'Poliçe Tipi': 'konut',
          'Sigortalı Adı': 'ABC Şirketi',
          'Plaka': '',
          'Riziko Adresi 1': 'Atatürk Caddesi No:123',
          'Riziko Adresi 2': 'Çankaya/Ankara',
          'Başlangıç Tarihi': '20.03.2024',
          'Bitiş Tarihi': '20.03.2025',
          'Prim Tutarı': '3000',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Poliçeler');
    XLSX.writeFile(wb, 'police_sablonu.xlsx');
  };

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;

    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const dateStr = String(dateValue);
    const cleanStr = dateStr.trim();

    const patterns = [
      /(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})/,
      /(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})/,
    ];

    for (const pattern of patterns) {
      const match = cleanStr.match(pattern);
      if (match) {
        let day, month, year;
        if (match[3].length === 4) {
          day = match[1].padStart(2, '0');
          month = match[2].padStart(2, '0');
          year = match[3];
        } else {
          year = match[1];
          month = match[2].padStart(2, '0');
          day = match[3].padStart(2, '0');
        }
        return `${year}-${month}-${day}`;
      }
    }

    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const errors: string[] = [];
    const warnings: string[] = [];
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const policyTypeStats: { [key: string]: number } = {};
    let totalPremium = 0;
    let skippedPremium = 0;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const allRows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

      // Filter out empty rows
      const rows = allRows.filter(row => {
        const values = Object.values(row);
        return values.some(val => val !== undefined && val !== null && val.toString().trim() !== '');
      });

      console.log(`Toplam satır: ${allRows.length}, Dolu satır: ${rows.length}`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      const { data: companies } = await supabase
        .from('insurance_companies')
        .select('id, name');

      // Normalize Turkish characters for better matching
      const normalizeTurkish = (text: string) => {
        return text.toLowerCase()
          .replace(/ğ/g, 'g')
          .replace(/Ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/Ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/Ş/g, 's')
          .replace(/ı/g, 'i')
          .replace(/I/g, 'i')
          .replace(/İ/g, 'i')
          .replace(/i̇/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/Ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/Ç/g, 'c')
          .replace(/\./g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const companyMap = new Map(companies?.map(c => [normalizeTurkish(c.name), c.id]) || []);

      console.log('Excel sütunları:', rows.length > 0 ? Object.keys(rows[0]) : 'Satır yok');

      // Debug: İlk satırı logla
      if (rows.length > 0) {
        console.log('İlk satır örneği:', JSON.stringify(rows[0], null, 2));
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        try {
          const keys = Object.keys(row);

          const companyKey = keys.find(k => k.toLowerCase().includes('sigorta') || k.toLowerCase().includes('şirket'));
          const companyNameRaw = companyKey ? row[companyKey]?.toString().trim() : '';

          if (!companyNameRaw) {
            const hasAnyData = keys.some(k => row[k] && row[k].toString().trim());
            if (!hasAnyData) {
              skipCount++;
              continue;
            }
            errors.push(`Satır ${rowNum}: Sigorta şirketi sütunu boş veya bulunamadı`);
            failCount++;
            continue;
          }

          const companyLower = companyNameRaw.toLowerCase();
          if (companyLower.includes('zeyl') ||
              companyLower.includes('iptal') ||
              companyLower.includes('iade') ||
              companyLower.includes('yenileme')) {
            const premiumKey = keys.find(k => k.toLowerCase().includes('prim') || k.toLowerCase().includes('tutar') || k.toLowerCase().includes('brüt') || k.toLowerCase().includes('brut'));
            const premiumValue = premiumKey ? parseFloat(row[premiumKey]?.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
            skippedPremium += premiumValue;
            warnings.push(`Satır ${rowNum}: İşlem satırı atlandı - ${companyNameRaw} (Prim: ${premiumValue.toFixed(2)} TL)`);
            skipCount++;
            continue;
          }

          const companyNameNormalized = normalizeTurkish(companyNameRaw);

          let companyId = companyMap.get(companyNameNormalized);
          if (!companyId) {
            // Try partial matching
            for (const [name, id] of companyMap.entries()) {
              if (name.includes(companyNameNormalized) || companyNameNormalized.includes(name.split(' ')[0])) {
                companyId = id;
                break;
              }
            }
          }

          if (!companyId) {
            errors.push(`Satır ${rowNum}: Sigorta şirketi bulunamadı: "${companyNameRaw}"`);
            failCount++;
            continue;
          }

          const startDateKey = keys.find(k => k.toLowerCase().includes('başlangıç'));
          const endDateKey = keys.find(k => k.toLowerCase().includes('bitiş'));
          const startDate = startDateKey ? parseDate(row[startDateKey]) : null;
          const endDate = endDateKey ? parseDate(row[endDateKey]) : null;

          if (!startDate || !endDate) {
            errors.push(`Satır ${rowNum}: Tarih formatı hatalı (GG.AA.YYYY)`);
            failCount++;
            continue;
          }

          const policyTypeKey = keys.find(k => {
            const lower = k.toLowerCase();
            return (lower.includes('poliçe') || lower.includes('police')) &&
                   (lower.includes('tip') || lower.includes('tür'));
          });
          let policyType = policyTypeKey ? normalizeTurkish(row[policyTypeKey]?.toString() || '') : '';

          // Debug log for first few rows
          if (i < 5) {
            console.log(`Satır ${rowNum} - Poliçe tipi RAW: "${row[policyTypeKey || '']}" -> Normalized: "${policyType}"`);
          }

          const typeMapping: { [key: string]: string } = {
            'trafik': 'trafik',
            'traffic': 'trafik',
            'dask': 'dask',
            'konut': 'residence',
            'saglik': 'health',
            'sağlık': 'health',
            'saglik sigortasi': 'health',
            'bireysel saglik': 'health',
            'bireysel sağlık': 'health',
            'bireysel saglik sigortasi': 'health',
            'bireyselsaglik': 'health',
            'bireyselsağlık': 'health',
            'isyeri': 'workplace',
            'işyeri': 'workplace',
            'is yeri': 'workplace',
            'iş yeri': 'workplace',
            'grup_saglik': 'group_health',
            'grup_sağlık': 'group_health',
            'grup saglik': 'group_health',
            'grup sağlık': 'group_health',
            'grupsaglik': 'group_health',
            'grupsağlık': 'group_health',
            'grup_ferdi_kaza': 'group_accident',
            'grup ferdi kaza': 'group_accident',
            'grupferdikaza': 'group_accident',
            'ferdi kaza': 'group_accident',
            'ferdikaza': 'group_accident',
          };

          if (typeMapping[policyType]) {
            policyType = typeMapping[policyType];
          }

          const validTypes = ['kasko', 'trafik', 'dask', 'workplace', 'residence', 'health', 'group_health', 'group_accident'];

          if (!policyType) {
            errors.push(`Satır ${rowNum}: Poliçe tipi sütunu boş veya bulunamadı`);
            failCount++;
            continue;
          }

          if (!validTypes.includes(policyType)) {
            errors.push(`Satır ${rowNum}: Geçersiz poliçe tipi: "${policyType}". Kabul edilen: kasko, trafik, konut, işyeri, sağlık, bireysel sağlık, dask, grup_sağlık, grup_ferdi_kaza`);
            failCount++;
            continue;
          }

          const policyNoKey = keys.find(k => {
            const lower = k.toLowerCase();
            return lower.includes('poliçe') && (lower.includes('no') || lower.includes('numarası') || lower.includes('numarasi'));
          });
          const premiumKey = keys.find(k => k.toLowerCase().includes('prim') || k.toLowerCase().includes('tutar') || k.toLowerCase().includes('brüt') || k.toLowerCase().includes('brut'));

          const rizikoAdres1Key = keys.find(k => {
            const lower = k.toLowerCase();
            return lower.includes('riziko') && lower.includes('adres') && lower.includes('1');
          });
          const rizikoAdres2Key = keys.find(k => {
            const lower = k.toLowerCase();
            return lower.includes('riziko') && lower.includes('adres') && lower.includes('2');
          });

          const rizikoAdres1 = rizikoAdres1Key ? row[rizikoAdres1Key]?.toString().trim() : '';
          const rizikoAdres2 = rizikoAdres2Key ? row[rizikoAdres2Key]?.toString().trim() : '';
          const combinedAddress = [rizikoAdres1, rizikoAdres2].filter(Boolean).join(' ') || null;

          const plateKey = keys.find(k => k.toLowerCase().includes('plaka'));
          const plateNumber = plateKey ? row[plateKey]?.toString().trim().toUpperCase() || null : null;

          const policyNumber = policyNoKey ? row[policyNoKey]?.toString().trim() : '';

          if (!policyNumber) {
            errors.push(`Satır ${rowNum}: Poliçe numarası boş`);
            failCount++;
            continue;
          }

          // Get or create client if clientId not provided
          let finalClientId = clientId;
          if (!clientId) {
            const clientNameKey = keys.find(k => k.toLowerCase().includes('müşteri') && k.toLowerCase().includes('adı'));
            const tcKey = keys.find(k => k.toLowerCase().includes('tc') || k.toLowerCase().includes('kimlik'));
            const taxKey = keys.find(k => k.toLowerCase().includes('vergi'));
            const phoneKey = keys.find(k => k.toLowerCase().includes('telefon') || k.toLowerCase().includes('tel'));
            const emailKey = keys.find(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('e-mail') || k.toLowerCase().includes('mail'));

            const clientName = clientNameKey ? row[clientNameKey]?.toString().trim() : '';
            const tcNo = tcKey ? row[tcKey]?.toString().trim() : '';
            const taxNo = taxKey ? row[taxKey]?.toString().trim() : '';
            const phone = phoneKey ? row[phoneKey]?.toString().trim() : '';
            const email = emailKey ? row[emailKey]?.toString().trim() : '';

            if (!clientName) {
              errors.push(`Satır ${rowNum}: Müşteri adı bulunamadı`);
              failCount++;
              continue;
            }

            if (!tcNo && !taxNo) {
              errors.push(`Satır ${rowNum}: TC Kimlik No veya Vergi No gerekli`);
              failCount++;
              continue;
            }

            // Try to find existing client
            let clientQuery = supabase
              .from('clients')
              .select('id')
              .eq('agent_id', user.id);

            if (tcNo) {
              clientQuery = clientQuery.eq('tc_number', tcNo);
            } else if (taxNo) {
              clientQuery = clientQuery.eq('tax_number', taxNo);
            }

            const { data: existingClient } = await clientQuery.maybeSingle();

            if (existingClient) {
              finalClientId = existingClient.id;
            } else {
              // Create new client
              const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .insert({
                  name: clientName,
                  tc_number: tcNo || null,
                  tax_number: taxNo || null,
                  phone: phone || null,
                  email: email || null,
                  agent_id: user.id,
                })
                .select('id')
                .single();

              if (clientError || !newClient) {
                errors.push(`Satır ${rowNum}: Müşteri oluşturulamadı - ${clientError?.message}`);
                failCount++;
                continue;
              }

              finalClientId = newClient.id;
            }
          }

          // Check for duplicate policy
          const { data: existingPolicy } = await supabase
            .from('policies')
            .select('id, status, end_date')
            .eq('policy_number', policyNumber)
            .eq('agent_id', user.id)
            .eq('is_deleted', false)
            .maybeSingle();

          if (existingPolicy) {
            // Skip if exact same policy exists and is active
            if (existingPolicy.status === 'active' && existingPolicy.end_date === endDate) {
              warnings.push(`Satır ${rowNum}: Mükerrer poliçe atlandı - ${policyNumber}`);
              skippedCount++;
              continue;
            }

            // If this is a renewal (same number but different dates), archive old one
            if (new Date(endDate!) > new Date(existingPolicy.end_date)) {
              await supabase
                .from('policies')
                .update({
                  status: 'archived',
                  archived_at: new Date().toISOString(),
                })
                .eq('id', existingPolicy.id);
              warnings.push(`Satır ${rowNum}: Eski poliçe arşivlendi, yeni poliçe ekleniyor - ${policyNumber}`);
            }
          }

          // Get insured_name for policy
          const insuredNameKey = keys.find(k => {
            const lower = k.toLowerCase();
            return lower.includes('sigortalı') && lower.includes('adı');
          });
          const insuredName = insuredNameKey ? row[insuredNameKey]?.toString().trim() : null;

          const policyData: any = {
            client_id: finalClientId,
            insured_name: insuredName,
            insurance_company_id: companyId,
            policy_number: policyNumber,
            policy_type: policyType,
            start_date: startDate,
            end_date: endDate,
            premium_amount: premiumKey ? parseFloat(row[premiumKey]?.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
            plate_number: plateNumber,
            address: combinedAddress,
            agent_id: user.id,
            status: 'active',
            policy_year: new Date(startDate!).getFullYear(),
            renewed_policy_id: existingPolicy?.id || null,
          };

          if (policyType === 'kasko' || policyType === 'trafik') {
            const brandModelKey = keys.find(k => {
              const lower = k.toLowerCase();
              return (lower.includes('marka') && lower.includes('model')) ||
                     lower.includes('araç');
            });

            policyData.license_plate = plateNumber;
            policyData.vehicle_brand_model = brandModelKey ? row[brandModelKey]?.toString().trim() || null : null;
          }

          const { error: policyError } = await supabase
            .from('policies')
            .insert(policyData);

          if (policyError) {
            errors.push(`Satır ${rowNum}: Poliçe eklenemedi - ${policyError.message}`);
            failCount++;
          } else {
            successCount++;
            totalPremium += policyData.premium_amount;
            policyTypeStats[policyType] = (policyTypeStats[policyType] || 0) + 1;
          }
        } catch (error: any) {
          errors.push(`Satır ${rowNum}: ${error.message}`);
          failCount++;
        }
      }

      // Log statistics
      console.log('=== İŞLEM TAMAMLANDI ===');
      console.log('Başarılı:', successCount);
      console.log('Başarısız:', failCount);
      console.log('Atlandı:', skippedCount);
      console.log('Poliçe tipi dağılımı:', policyTypeStats);
      console.log('=== İLK 20 HATA ===');
      errors.slice(0, 20).forEach((err, idx) => {
        console.log(`${idx + 1}. ${err}`);
      });

      setResult({
        success: successCount,
        failed: failCount,
        skipped: skippedCount,
        errors: errors.slice(0, 20),
        warnings: warnings.slice(0, 20),
        totalPremium,
        skippedPremium,
      });

      if (successCount > 0) {
        onSuccess();
      }
    } catch (error: any) {
      alert('Excel dosyası okunamadı: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Toplu Poliçe Yükleme</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">Excel dosyanız şu sütunları içermelidir:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {!clientId && (
                    <>
                      <li>Müşteri Adı (zorunlu - client seçilmemişse)</li>
                      <li>TC Kimlik No veya Vergi No (zorunlu - client seçilmemişse)</li>
                      <li>Telefon, Email (opsiyonel)</li>
                    </>
                  )}
                  <li>Sigorta Şirketi (zorunlu)</li>
                  <li>Poliçe No (zorunlu)</li>
                  <li>Poliçe Tipi (kasko/trafik/konut/işyeri/sağlık/dask/grup_sağlık/grup_ferdi_kaza)</li>
                  <li>Sigortalı Adı (opsiyonel)</li>
                  <li>Plaka (araç poliçeleri için)</li>
                  <li>Riziko Adresi 1, Riziko Adresi 2 (konut/işyeri için)</li>
                  <li>Başlangıç Tarihi, Bitiş Tarihi (GG.AA.YYYY)</li>
                  <li>Prim Tutarı</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Örnek Şablon İndir
          </button>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <label className="flex flex-col items-center cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <span className="text-sm font-medium text-gray-700 mb-1">
                Excel Dosyası Seç
              </span>
              <span className="text-xs text-gray-500">
                .xlsx veya .xls dosyası
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {uploading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">İşleniyor...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Başarılı</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{result.success}</p>
                  {result.totalPremium !== undefined && (
                    <p className="text-xs text-green-700 mt-1">
                      {result.totalPremium.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                    </p>
                  )}
                </div>

                {result.skipped > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Atlandı</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                    {result.skippedPremium !== undefined && result.skippedPremium > 0 && (
                      <p className="text-xs text-yellow-700 mt-1">
                        -{result.skippedPremium.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">Başarısız</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="font-medium text-yellow-800 mb-2">Uyarılar:</p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                    {result.warnings.length === 20 && (
                      <li className="italic">...ve daha fazlası</li>
                    )}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-800 mb-2">Hatalar:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {result.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {result.errors.length === 20 && (
                      <li className="italic">...ve daha fazlası</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}