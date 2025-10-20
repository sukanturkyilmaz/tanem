export function calculateEarnedPremium(
  premiumAmount: number,
  startDate: string | Date,
  endDate: string | Date,
  asOfDate: Date = new Date()
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  const daysElapsed = Math.min(
    totalDays,
    Math.max(0, Math.ceil((asOfDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  );

  const earnedRatio = daysElapsed / totalDays;
  return premiumAmount * earnedRatio;
}

export function calculateLossRatio(
  earnedPremium: number,
  claimAmount: number
): number {
  if (earnedPremium === 0) return 0;
  return (claimAmount / earnedPremium) * 100;
}

export function getOneYearAgoDate(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `%${value.toFixed(2)}`;
}
