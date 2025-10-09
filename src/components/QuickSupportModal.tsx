import { X, Send } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface QuickSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSupportModal({ isOpen, onClose }: QuickSupportModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', userData.user?.id)
        .single();

      if (clientError) throw clientError;

      const { error } = await supabase.from('customer_messages').insert({
        client_id: clientData.id,
        agent_id: clientData.agent_id,
        subject,
        message,
        priority,
        status: 'new',
      });

      if (error) throw error;

      alert('Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapılacaktır.');
      setSubject('');
      setMessage('');
      setPriority('medium');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Mesaj gönderilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Destek Talebi</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Öncelik Düzeyi
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="low">Düşük - Genel Bilgi</option>
                <option value="medium">Orta - Normal Talep</option>
                <option value="high">Yüksek - Acil Durum</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konu
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Örn: Poliçe Yenileme Talebi"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mesajınız
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Lütfen talebinizi detaylı olarak açıklayın..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Not:</strong> Mesajınız acente yetkilinize iletilecektir. Normal
                mesajlar 24 saat içinde, acil talepler ise en kısa sürede yanıtlanacaktır.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
