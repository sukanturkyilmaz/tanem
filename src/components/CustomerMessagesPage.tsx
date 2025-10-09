import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';

interface Message {
  id: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'read' | 'replied' | 'closed';
  created_at: string;
  clients: {
    full_name: string;
    email: string;
    phone: string;
  };
}

export default function CustomerMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    fetchMessages();

    const subscription = supabase
      .channel('customer_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_messages',
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('customer_messages')
        .select(
          `
          *,
          clients (
            full_name,
            email,
            phone
          )
        `
        )
        .eq('agent_id', userData.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = async (message: Message) => {
    setSelectedMessage(message);

    if (message.status === 'new') {
      try {
        const { error } = await supabase
          .from('customer_messages')
          .update({ status: 'read', updated_at: new Date().toISOString() })
          .eq('id', message.id);

        if (error) throw error;
        await fetchMessages();
      } catch (error) {
        console.error('Error updating message status:', error);
      }
    }
  };

  const handleStatusChange = async (messageId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('customer_messages')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
      await fetchMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, status: newStatus as any });
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700',
    };
    const labels = { high: 'Acil', medium: 'Normal', low: 'Düşük' };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority as keyof typeof colors]}`}
      >
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700',
      read: 'bg-purple-100 text-purple-700',
      replied: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      new: 'Yeni',
      read: 'Okundu',
      replied: 'Yanıtlandı',
      closed: 'Kapatıldı',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'read':
        return <Eye className="w-4 h-4 text-purple-600" />;
      case 'replied':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const filteredMessages = filterStatus
    ? messages.filter((m) => m.status === filterStatus)
    : messages;

  const newMessagesCount = messages.filter((m) => m.status === 'new').length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Müşteri Mesajları</h2>
          <p className="text-gray-600 mt-2">
            Müşterilerinizden gelen destek taleplerini görüntüleyin ve yönetin
          </p>
        </div>
        {newMessagesCount > 0 && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-semibold">
            {newMessagesCount} Yeni Mesaj
          </div>
        )}
      </div>

      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Tüm Mesajlar ({messages.length})</option>
          <option value="new">Yeni ({messages.filter((m) => m.status === 'new').length})</option>
          <option value="read">
            Okundu ({messages.filter((m) => m.status === 'read').length})
          </option>
          <option value="replied">
            Yanıtlandı ({messages.filter((m) => m.status === 'replied').length})
          </option>
          <option value="closed">
            Kapatıldı ({messages.filter((m) => m.status === 'closed').length})
          </option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Mesajlar</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => handleViewMessage(message)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                  selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                } ${message.status === 'new' ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(message.status)}
                    <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">
                      {message.subject}
                    </h4>
                  </div>
                  {getPriorityBadge(message.priority)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{message.clients.full_name}</p>
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{message.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(message.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {getStatusBadge(message.status)}
                </div>
              </button>
            ))}
            {filteredMessages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Mesaj bulunmuyor</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          {selectedMessage ? (
            <>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedMessage.subject}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="font-medium">{selectedMessage.clients.full_name}</span>
                      <span>•</span>
                      <span>{selectedMessage.clients.email}</span>
                      <span>•</span>
                      <span>{selectedMessage.clients.phone}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {getPriorityBadge(selectedMessage.priority)}
                    {getStatusBadge(selectedMessage.status)}
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(selectedMessage.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-gray-800 whitespace-pre-line">{selectedMessage.message}</p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Durum Güncelle</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(selectedMessage.id, 'read')}
                      disabled={selectedMessage.status === 'read'}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                    >
                      Okundu İşaretle
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedMessage.id, 'replied')}
                      disabled={selectedMessage.status === 'replied'}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      Yanıtlandı İşaretle
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedMessage.id, 'closed')}
                      disabled={selectedMessage.status === 'closed'}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      Kapat
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    <strong>Not:</strong> Müşteriyle iletişim kurmak için yukarıdaki telefon veya
                    e-posta bilgilerini kullanabilirsiniz.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-12">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Görüntülemek için bir mesaj seçin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
