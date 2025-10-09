import { useState } from 'react';
import { X, UserPlus, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tc_number: '',
    tax_number: '',
    phone: '',
    email: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || (!formData.tc_number && !formData.tax_number)) {
      alert('Lütfen isim ve TC Kimlik No veya Vergi No doldurun');
      return;
    }

    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      if (formData.tc_number) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('tc_number', formData.tc_number)
          .eq('agent_id', userData.user.id)
          .maybeSingle();

        if (existingClient) {
          alert('Bu TC Kimlik No ile kayıtlı müşteri zaten var!');
          setSaving(false);
          return;
        }
      }

      if (formData.tax_number) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('tax_number', formData.tax_number)
          .eq('agent_id', userData.user.id)
          .maybeSingle();

        if (existingClient) {
          alert('Bu Vergi No ile kayıtlı müşteri zaten var!');
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase.from('clients').insert([
        {
          name: formData.name,
          tc_number: formData.tc_number || null,
          tax_number: formData.tax_number || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          agent_id: userData.user.id,
        },
      ]);

      if (error) throw error;

      alert('Müşteri başarıyla eklendi!');
      onSuccess();
    } catch (error: any) {
      console.error('Error adding client:', error);
      if (error.code === '23505') {
        alert('Bu vergi numarası zaten kayıtlı!');
      } else {
        alert('Müşteri eklenirken hata oluştu: ' + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Yeni Müşteri Ekle</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Müşteri Adı / Şirket Adı *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ege Ulaşım Ltd. Şti."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              TC Kimlik No
            </label>
            <input
              type="text"
              value={formData.tc_number}
              onChange={(e) => setFormData({ ...formData, tc_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="12345678901"
              maxLength={11}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vergi No
            </label>
            <input
              type="text"
              value={formData.tax_number}
              onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="1234567890"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">TC Kimlik No veya Vergi No gerekli</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0532 123 45 67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-posta
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="ornek@sirket.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adres
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="İzmir, Türkiye"
              rows={2}
            />
          </div>

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
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
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
