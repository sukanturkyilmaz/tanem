import { useState, useEffect } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UploadPolicyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadPolicyModal({ onClose, onSuccess }: UploadPolicyModalProps) {
  const [uploading, setUploading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    policy_number: '',
    policy_type: 'kasko',
    client_id: '',
    insurance_company_id: '',
    start_date: '',
    end_date: '',
    premium_amount: '',
    license_plate: '',
    vehicle_value: '',
    chassis_value: '',
    accessories_value: '',
    other_values: '',
    no_claims_discount: '',
    address: '',
    building_value: '',
    fixtures_value: '',
    electronics_value: '',
    inventory_value: '',
    workplace_other_values: '',
    vehicle_brand_model: '',
    trafik_coverage_amount: '',
    plate_number: '',
    location: '',
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    fetchClients();
    fetchCompanies();
  }, []);

  const fetchClients = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('agent_id', userData.user.id)
      .order('name');

    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data || []);
    }
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('insurance_companies')
      .select('*')
      .order('name');
    setCompanies(data || []);
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.insurance_company_id) {
      alert('Lütfen müşteri ve sigorta şirketi seçin');
      return;
    }

    setUploading(true);

    try {
      let pdfData = '';

      if (pdfFile) {
        const reader = new FileReader();
        pdfData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pdfFile);
        });
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Kullanıcı bulunamadı');

      const policyData: any = {
        policy_number: formData.policy_number,
        policy_type: formData.policy_type,
        client_id: formData.client_id,
        insurance_company_id: formData.insurance_company_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        premium_amount: parseFloat(formData.premium_amount) || 0,
        pdf_data: pdfData,
        pdf_filename: pdfFile?.name || '',
        agent_id: userData.user.id,
        plate_number: formData.plate_number ? formData.plate_number.toUpperCase() : null,
        location: formData.location ? formData.location.toLowerCase() : null,
      };

      if (formData.policy_type === 'kasko') {
        policyData.license_plate = formData.license_plate;
        policyData.vehicle_value = parseFloat(formData.vehicle_value) || 0;
        policyData.chassis_value = parseFloat(formData.chassis_value) || 0;
        policyData.accessories_value = parseFloat(formData.accessories_value) || 0;
        policyData.other_values = parseFloat(formData.other_values) || 0;
        policyData.no_claims_discount = parseInt(formData.no_claims_discount) || 0;
      } else if (formData.policy_type === 'trafik') {
        policyData.license_plate = formData.license_plate;
        policyData.vehicle_brand_model = formData.vehicle_brand_model;
        policyData.trafik_coverage_amount = parseFloat(formData.trafik_coverage_amount) || 0;
      } else {
        policyData.address = formData.address;
        policyData.building_value = parseFloat(formData.building_value) || 0;
        policyData.fixtures_value = parseFloat(formData.fixtures_value) || 0;
        policyData.electronics_value = parseFloat(formData.electronics_value) || 0;
        policyData.inventory_value = parseFloat(formData.inventory_value) || 0;
        policyData.workplace_other_values = parseFloat(formData.workplace_other_values) || 0;
      }

      const { error } = await supabase.from('policies').insert([policyData]);

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error('Error uploading policy:', error);
      alert('Poliçe yüklenirken hata oluştu: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Yeni Poliçe Ekle</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Müşteri *
              </label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Müşteri Seçin</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sigorta Şirketi *
              </label>
              <select
                required
                value={formData.insurance_company_id}
                onChange={(e) => setFormData({ ...formData, insurance_company_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Şirket Seçin</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poliçe Numarası *
              </label>
              <input
                type="text"
                required
                value={formData.policy_number}
                onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poliçe Tipi *
              </label>
              <select
                required
                value={formData.policy_type}
                onChange={(e) => setFormData({ ...formData, policy_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="kasko">Kasko</option>
                <option value="trafik">Trafik</option>
                <option value="workplace">İşyeri</option>
                <option value="residence">Konut</option>
                <option value="health">Sağlık</option>
                <option value="dask">Dask</option>
                <option value="group_health">Grup Sağlık</option>
                <option value="group_accident">Grup Ferdi Kaza</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitiş Tarihi *
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prim Tutarı (₺) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.premium_amount}
                onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF Dosyası
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">PDF yalnızca saklanacaktır, bilgileri manuel olarak giriniz</p>
            </div>
          </div>

          {formData.policy_type === 'kasko' && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Kasko Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Araç Bedeli (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.vehicle_value}
                    onChange={(e) => setFormData({ ...formData, vehicle_value: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kasa Bedeli (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.chassis_value}
                    onChange={(e) => setFormData({ ...formData, chassis_value: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aksesuar Bedeli (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.accessories_value}
                    onChange={(e) => setFormData({ ...formData, accessories_value: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diğer Bedeller (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.other_values}
                    onChange={(e) => setFormData({ ...formData, other_values: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hasarsızlık Kademesi
                  </label>
                  <input
                    type="number"
                    value={formData.no_claims_discount}
                    onChange={(e) => setFormData({ ...formData, no_claims_discount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.policy_type === 'trafik' && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Trafik Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plaka (PDF Eşleştirme İçin) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="16AN425"
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marka Model
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_brand_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_brand_model: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teminat Tutarı (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.trafik_coverage_amount}
                    onChange={(e) => setFormData({ ...formData, trafik_coverage_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.policy_type === 'workplace' && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-md font-semibold text-gray-900 mb-4">İşyeri Bilgileri</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lokasyon (PDF Eşleştirme İçin) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="bursa"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adres
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bina Bedeli (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.building_value}
                      onChange={(e) => setFormData({ ...formData, building_value: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Demirbaş Bedeli (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.fixtures_value}
                      onChange={(e) => setFormData({ ...formData, fixtures_value: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Elektronik Cihaz Bedeli (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.electronics_value}
                      onChange={(e) => setFormData({ ...formData, electronics_value: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emtea Bedeli (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.inventory_value}
                      onChange={(e) => setFormData({ ...formData, inventory_value: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Diğer Bedeller (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.workplace_other_values}
                      onChange={(e) => setFormData({ ...formData, workplace_other_values: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
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
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
