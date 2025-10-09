import { AlertCircle, Bell, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export function AnnouncementsCard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchAnnouncements();
    const dismissed = localStorage.getItem('dismissedAnnouncements');
    if (dismissed) {
      setDismissedIds(JSON.parse(dismissed));
    }
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAnnouncement = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <Bell className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'from-red-50 to-red-100 border-red-200';
      case 'medium':
        return 'from-yellow-50 to-yellow-100 border-yellow-200';
      case 'low':
        return 'from-blue-50 to-blue-100 border-blue-200';
      default:
        return 'from-blue-50 to-blue-100 border-blue-200';
    }
  };

  const visibleAnnouncements = announcements.filter(
    (announcement) => !dismissedIds.includes(announcement.id)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">Duyurular</h3>
      </div>

      <div className="space-y-3">
        {visibleAnnouncements.map((announcement) => (
          <div
            key={announcement.id}
            className={`bg-gradient-to-br ${getPriorityColor(
              announcement.priority
            )} rounded-lg border p-4 relative`}
          >
            <button
              onClick={() => dismissAnnouncement(announcement.id)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <div className="mt-0.5">{getPriorityIcon(announcement.priority)}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {announcement.title}
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {announcement.content}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
