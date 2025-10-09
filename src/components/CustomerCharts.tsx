import { TrendingUp, PieChart, Calendar, DollarSign } from 'lucide-react';

interface Policy {
  policy_type: string;
  premium_amount: number;
  start_date: string;
  insurance_companies: { name: string } | null;
}

interface Claim {
  claim_date: string;
  payment_amount: number;
}

interface CustomerChartsProps {
  policies: Policy[];
  claims: Claim[];
  visibilitySettings: {
    show_policy_reminders: boolean;
    show_premium_distribution: boolean;
    show_policy_types: boolean;
    show_claims_trend: boolean;
    show_insurance_companies: boolean;
  };
}

export function CustomerCharts({ policies, claims, visibilitySettings }: CustomerChartsProps) {
  const getPolicyTypeDistribution = () => {
    const distribution: { [key: string]: number } = {};
    policies.forEach((policy) => {
      const type = policy.policy_type;
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return Object.entries(distribution).map(([type, count]) => ({
      type,
      count,
      percentage: (count / policies.length) * 100,
    }));
  };

  const getMonthlyPremiumData = () => {
    const monthlyData: { [key: string]: number } = {};
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
      monthlyData[key] = 0;
    }

    policies.forEach((policy) => {
      const startDate = new Date(policy.start_date);
      const key = startDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
      if (monthlyData.hasOwnProperty(key)) {
        monthlyData[key] += Number(policy.premium_amount);
      }
    });

    const values = Object.values(monthlyData);
    const max = Math.max(...values, 1);

    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount,
      percentage: (amount / max) * 100,
    }));
  };

  const getMonthlyClaimsData = () => {
    const monthlyData: { [key: string]: { count: number; amount: number } } = {};
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
      monthlyData[key] = { count: 0, amount: 0 };
    }

    claims.forEach((claim) => {
      const claimDate = new Date(claim.claim_date);
      const key = claimDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
      if (monthlyData.hasOwnProperty(key)) {
        monthlyData[key].count += 1;
        monthlyData[key].amount += Number(claim.payment_amount);
      }
    });

    const maxCount = Math.max(...Object.values(monthlyData).map(d => d.count), 1);

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      amount: data.amount,
      percentage: (data.count / maxCount) * 100,
    }));
  };

  const getCompanyDistribution = () => {
    const distribution: { [key: string]: number } = {};
    policies.forEach((policy) => {
      const company = policy.insurance_companies?.name || 'Diğer';
      distribution[company] = (distribution[company] || 0) + 1;
    });
    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([company, count]) => ({
        company,
        count,
        percentage: (count / policies.length) * 100,
      }));
  };

  const policyTypeData = getPolicyTypeDistribution();
  const monthlyPremiumData = getMonthlyPremiumData();
  const monthlyClaimsData = getMonthlyClaimsData();
  const companyData = getCompanyDistribution();

  const typeColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];

  if (policies.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {visibilitySettings.show_premium_distribution && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Aylık Prim Dağılımı</h3>
          </div>
        <div className="space-y-3">
          {monthlyPremiumData.map((data, index) => (
            <div key={index}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">{data.month}</span>
                <span className="font-semibold text-gray-900">
                  ₺{data.amount.toLocaleString('tr-TR')}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {visibilitySettings.show_policy_types && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Poliçe Türleri</h3>
          </div>
        <div className="space-y-3">
          {policyTypeData.map((data, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded ${typeColors[index % typeColors.length]}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-900 font-medium capitalize">{data.type}</span>
                  <span className="text-gray-600">
                    {data.count} poliçe ({data.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${typeColors[index % typeColors.length]} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {visibilitySettings.show_claims_trend && claims.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Hasar Trend Analizi</h3>
          </div>
          <div className="space-y-3">
            {monthlyClaimsData.map((data, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{data.month}</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{data.count} hasar</span>
                    {data.amount > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        (₺{data.amount.toLocaleString('tr-TR')})
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {visibilitySettings.show_insurance_companies && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Sigorta Şirketleri</h3>
          </div>
        <div className="space-y-3">
          {companyData.map((data, index) => (
            <div key={index}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-900 font-medium">{data.company}</span>
                <span className="text-gray-600">
                  {data.count} poliçe ({data.percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
