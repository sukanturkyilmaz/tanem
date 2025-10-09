import { useEffect, useState } from 'react';
import { supabase, Settings } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, Upload, Plus, X, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const { isAdmin, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [myVerificationCode, setMyVerificationCode] = useState('');
  const [newClient, setNewClient] = useState({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
  });
  const [visibilitySettings, setVisibilitySettings] = useState({
    show_policy_reminders: true,
    show_premium_distribution: true,
    show_policy_types: true,
    show_claims_trend: true,
    show_insurance_companies: true,
  });
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchCompanies();
      fetchClients();
      fetchVisibilitySettings();
      if (profile?.verification_code) {
        setMyVerificationCode(profile.verification_code);
      }
    }
  }, [isAdmin, profile]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').maybeSingle();
      if (data) {
        setSettings(data);
        setCompanyName(data.company_name);
        setPrimaryColor(data.primary_color);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('insurance_companies')
      .select('*')
      .order('name');
    setCompanies(data || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('full_name');
    setClients(data || []);
  };

  const fetchVisibilitySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('dashboard_visibility_settings')
        .select('*')
        .eq('agent_id', user.id)
        .maybeSingle();

      if (data) {
        setVisibilitySettings({
          show_policy_reminders: data.show_policy_reminders,
          show_premium_distribution: data.show_premium_distribution,
          show_policy_types: data.show_policy_types,
          show_claims_trend: data.show_claims_trend,
          show_insurance_companies: data.show_insurance_companies,
        });
      }
    } catch (error) {
      console.error('Error fetching visibility settings:', error);
    }
  };

  const handleSaveVisibilitySettings = async () => {
    setSavingVisibility(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: existing } = await supabase
        .from('dashboard_visibility_settings')
        .select('id')
        .eq('agent_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('dashboard_visibility_settings')
          .update({
            ...visibilitySettings,
            updated_at: new Date().toISOString(),
          })
          .eq('agent_id', user.id);
      } else {
        await supabase
          .from('dashboard_visibility_settings')
          .insert([{
            agent_id: user.id,
            ...visibilitySettings,
          }]);
      }

      alert('Görünürlük ayarları başarıyla kaydedildi');
    } catch (error: any) {
      console.error('Error saving visibility settings:', error);
      alert('Ayarlar kaydedilirken hata oluştu: ' + error.message);
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      let logoUrl = settings?.logo_url || '';

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('settings')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('settings')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      const updateData = {
        company_name: companyName,
        primary_color: primaryColor,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      };

      if (settings) {
        await supabase.from('settings').update(updateData).eq('id', settings.id);
      } else {
        await supabase.from('settings').insert([updateData]);
      }

      alert('Ayarlar başarıyla kaydedildi');
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('Ayarlar kaydedilirken hata oluştu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      alert('Lütfen şirket adını girin');
      return;
    }

    try {
      const { error } = await supabase
        .from('insurance_companies')
        .insert([{ name: newCompanyName }]);

      if (error) throw error;

      setNewCompanyName('');
      fetchCompanies();
      alert('Şirket başarıyla eklendi');
    } catch (error: any) {
      console.error('Error adding company:', error);
      alert('Şirket eklenirken hata oluştu: ' + error.message);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Bu şirketi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('insurance_companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchCompanies();
      alert('Şirket başarıyla silindi');
    } catch (error: any) {
      console.error('Error deleting company:', error);
      alert('Şirket silinirken hata oluştu: ' + error.message);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.email || !newClient.password || !newClient.full_name) {
      alert('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newClient.email,
        password: newClient.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('verification_code')
          .eq('id', authData.user.id)
          .maybeSingle();

        const parentCode = currentProfile?.verification_code || settings?.company_name || 'DEFAULT';

        const { data: codeData } = await supabase.rpc('generate_verification_code');
        const verificationCode = codeData;

        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            email: newClient.email,
            full_name: newClient.full_name,
            company_name: newClient.company_name,
            role: 'client',
            verification_code: verificationCode,
            is_verified: true,
          },
        ]);

        if (profileError) throw profileError;

        setNewClient({ email: '', password: '', full_name: '', company_name: '' });
        fetchClients();
        alert(`Müşteri başarıyla eklendi!\n\nDoğrulama Kodu: ${verificationCode}\n\nBu kodu müşterinizle paylaşın.`);
      }
    } catch (error: any) {
      console.error('Error adding client:', error);
      alert('Müşteri eklenirken hata oluştu: ' + error.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Bu sayfaya erişim yetkiniz yok</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Ayarlar</h2>
        <p className="text-gray-600 mt-2">Sistem ayarlarını yönetin</p>
      </div>

      <div className="space-y-6">
        {myVerificationCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Doğrulama Kodunuz</h3>
            <p className="text-sm text-gray-600 mb-3">
              Müşterilerinizin sisteme giriş yapabilmesi için bu kodu paylaşın
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-white px-4 py-3 rounded-lg text-2xl font-bold text-blue-600 tracking-wider border-2 border-blue-300">
                {myVerificationCode}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(myVerificationCode);
                  alert('Doğrulama kodu kopyalandı!');
                }}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
              >
                Kopyala
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Marka Ayarları</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şirket Adı
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ana Renk
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {settings?.logo_url && (
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="h-16 w-16 object-contain border border-gray-200 rounded"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sigorta Şirketleri</h3>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Yeni şirket adı"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCompany}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-5 h-5" />
                Ekle
              </button>
            </div>

            <div className="space-y-2">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <span className="font-medium">{company.name}</span>
                  <button
                    onClick={() => handleDeleteCompany(company.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Müşteri Dashboard Görünürlük Ayarları</h3>
          <p className="text-sm text-gray-600 mb-4">
            Müşteri dashboard'unda hangi widget'ların görüneceğini belirleyin
          </p>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                {visibilitySettings.show_policy_reminders ? (
                  <Eye className="w-5 h-5 text-green-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium text-gray-900">Poliçe Hatırlatıcıları</span>
              </div>
              <input
                type="checkbox"
                checked={visibilitySettings.show_policy_reminders}
                onChange={(e) =>
                  setVisibilitySettings({
                    ...visibilitySettings,
                    show_policy_reminders: e.target.checked,
                  })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                {visibilitySettings.show_premium_distribution ? (
                  <Eye className="w-5 h-5 text-green-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium text-gray-900">Aylık Prim Dağılımı</span>
              </div>
              <input
                type="checkbox"
                checked={visibilitySettings.show_premium_distribution}
                onChange={(e) =>
                  setVisibilitySettings({
                    ...visibilitySettings,
                    show_premium_distribution: e.target.checked,
                  })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                {visibilitySettings.show_policy_types ? (
                  <Eye className="w-5 h-5 text-green-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium text-gray-900">Poliçe Türleri</span>
              </div>
              <input
                type="checkbox"
                checked={visibilitySettings.show_policy_types}
                onChange={(e) =>
                  setVisibilitySettings({
                    ...visibilitySettings,
                    show_policy_types: e.target.checked,
                  })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                {visibilitySettings.show_claims_trend ? (
                  <Eye className="w-5 h-5 text-green-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium text-gray-900">Hasar Trend Analizi</span>
              </div>
              <input
                type="checkbox"
                checked={visibilitySettings.show_claims_trend}
                onChange={(e) =>
                  setVisibilitySettings({
                    ...visibilitySettings,
                    show_claims_trend: e.target.checked,
                  })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                {visibilitySettings.show_insurance_companies ? (
                  <Eye className="w-5 h-5 text-green-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium text-gray-900">Sigorta Şirketleri</span>
              </div>
              <input
                type="checkbox"
                checked={visibilitySettings.show_insurance_companies}
                onChange={(e) =>
                  setVisibilitySettings({
                    ...visibilitySettings,
                    show_insurance_companies: e.target.checked,
                  })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <button
            onClick={handleSaveVisibilitySettings}
            disabled={savingVisibility}
            className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {savingVisibility ? 'Kaydediliyor...' : 'Görünürlük Ayarlarını Kaydet'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Müşteri Yönetimi</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="email"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                placeholder="E-posta *"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={newClient.password}
                onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                placeholder="Şifre *"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newClient.full_name}
                onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })}
                placeholder="Ad Soyad *"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newClient.company_name}
                onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                placeholder="Şirket Adı"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleAddClient}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="w-5 h-5" />
              Müşteri Ekle
            </button>

            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Mevcut Müşteriler</h4>
              <div className="space-y-2">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{client.full_name}</p>
                        <p className="text-sm text-gray-600">{client.email}</p>
                        {client.company_name && (
                          <p className="text-sm text-gray-600">{client.company_name}</p>
                        )}
                      </div>
                      {client.verification_code && (
                        <div className="ml-4">
                          <p className="text-xs text-gray-500 mb-1">Doğrulama Kodu</p>
                          <code className="bg-white px-3 py-1 rounded border border-blue-300 text-blue-600 font-bold text-sm">
                            {client.verification_code}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
