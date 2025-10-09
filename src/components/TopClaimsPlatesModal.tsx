import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TopPlate {
  plate: string;
  policyType: string;
  uniqueClaimsCount: number;
  totalAmount: number;
}

interface TopClaimsPlatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TopClaimsPlatesModal({ isOpen, onClose }: TopClaimsPlatesModalProps) {
  const { profile, isAdmin, clientId } = useAuth();
  const [topPlates, setTopPlates] = useState<TopPlate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchTopPlates();
    }
  }, [isOpen, profile, clientId]);

  const fetchTopPlates = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('claims')
        .select('license_plate, claim_number, payment_amount, policy_type')
        .not('license_plate', 'is', null);

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (!isAdmin && profile) {
        query = query.eq('agent_id', profile.id);
      }

      const { data: claims, error } = await query;

      if (error) throw error;

      const plateMap = new Map<string, { claimNumbers: Set<string>; total: number; policyType: string }>();

      claims?.forEach((claim) => {
        if (claim.license_plate) {
          const existing = plateMap.get(claim.license_plate) || {
            claimNumbers: new Set<string>(),
            total: 0,
            policyType: claim.policy_type || '-'
          };

          if (claim.claim_number) {
            existing.claimNumbers.add(claim.claim_number);
          }

          existing.total += Number(claim.payment_amount || 0);

          plateMap.set(claim.license_plate, existing);
        }
      });

      const topPlatesData = Array.from(plateMap.entries())
        .map(([plate, data]) => ({
          plate,
          policyType: data.policyType,
          uniqueClaimsCount: data.claimNumbers.size,
          totalAmount: data.total,
        }))
        .sort((a, b) => b.uniqueClaimsCount - a.uniqueClaimsCount);

      setTopPlates(topPlatesData);
    } catch (error) {
      console.error('Error fetching top plates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Hasar Sıklığı Analizi</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : topPlates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Henüz hasar kaydı bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sıra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plaka / Detay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Poliçe Türü
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Benzersiz Dosya Sayısı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Toplam Hasar Tutarı
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topPlates.map((item, index) => (
                    <tr key={item.plate} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.plate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.policyType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.uniqueClaimsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₺{item.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
