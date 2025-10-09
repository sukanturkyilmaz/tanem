import { Calendar, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Policy {
  id: string;
  policy_number: string;
  policy_type: string;
  end_date: string;
  plate_number?: string;
  insured_name?: string;
  insurance_companies?: {
    name: string;
  };
}

export function PolicyRemindersCard() {
  const [expiringPolicies, setExpiringPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiringPolicies();
  }, []);

  const fetchExpiringPolicies = async () => {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const { data: userData } = await supabase.auth.getUser();

      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userData.user?.id)
        .single();

      if (!clientData) return;

      const { data, error } = await supabase
        .from('policies')
        .select(`
          id,
          policy_number,
          policy_type,
          end_date,
          plate_number,
          insured_name,
          insurance_companies (name)
        `)
        .eq('client_id', clientData.id)
        .gte('end_date', today.toISOString())
        .lte('end_date', thirtyDaysFromNow.toISOString())
        .order('end_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setExpiringPolicies(data || []);
    } catch (error) {
      console.error('Error fetching expiring policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'from-red-50 to-red-100 border-red-200';
    if (days <= 15) return 'from-yellow-50 to-yellow-100 border-yellow-200';
    return 'from-blue-50 to-blue-100 border-blue-200';
  };

  const getUrgencyText = (days: number) => {
    if (days <= 7) return 'Acil';
    if (days <= 15) return 'Yaklaşıyor';
    return 'Yakında';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (expiringPolicies.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Poliçe Hatırlatıcıları</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">Önümüzdeki 30 gün içinde yenilenecek poliçe bulunmuyor</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">Poliçe Hatırlatıcıları</h3>
        <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
          {expiringPolicies.length} Poliçe
        </span>
      </div>

      <div className="space-y-3">
        {expiringPolicies.map((policy) => {
          const daysLeft = getDaysUntilExpiry(policy.end_date);
          return (
            <div
              key={policy.id}
              className={`bg-gradient-to-br ${getUrgencyColor(
                daysLeft
              )} rounded-lg border p-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {policy.policy_number}
                    </h4>
                    <span className="text-xs font-medium text-gray-600 bg-white px-2 py-0.5 rounded">
                      {policy.policy_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    {policy.insurance_companies?.name || 'Bilinmiyor'}
                  </p>
                  {(policy.plate_number || policy.insured_name) && (
                    <p className="text-xs text-gray-600">
                      {policy.plate_number || policy.insured_name}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>
                      Bitiş: {new Date(policy.end_date).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      daysLeft <= 7
                        ? 'bg-red-600 text-white'
                        : daysLeft <= 15
                        ? 'bg-yellow-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {daysLeft <= 7 && <AlertTriangle className="w-3 h-3" />}
                    {getUrgencyText(daysLeft)}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {daysLeft} gün
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          <strong>Not:</strong> Poliçelerinizin yenilenmesi için acente yetkiliniz ile
          iletişime geçmeyi unutmayın.
        </p>
      </div>
    </div>
  );
}
