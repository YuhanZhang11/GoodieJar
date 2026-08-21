export type WeightedRateObservation = {
  rate: number;
  weight: number;
};

export type DailyGoalBonusSnapshot = {
  focusBonusAmount: number;
  taskBonusAmount: number;
  comboBonusAmount: number;
};

function requirePositiveFinite(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be finite and greater than 0.`);
  }

  return value;
}

export function calculateWeightedMedianRate(
  observations: WeightedRateObservation[]
): number | null {
  const combinedWeights = new Map<number, number>();

  for (const observation of observations) {
    const rate = requirePositiveFinite(observation.rate, 'Hourly rate');
    const weight = requirePositiveFinite(observation.weight, 'Hourly-rate weight');
    combinedWeights.set(rate, (combinedWeights.get(rate) ?? 0) + weight);
  }

  if (combinedWeights.size === 0) {
    return null;
  }

  const ordered = [...combinedWeights.entries()].sort(([left], [right]) => left - right);
  const totalWeight = ordered.reduce((sum, [, weight]) => sum + weight, 0);
  const midpoint = totalWeight / 2;
  let cumulativeWeight = 0;

  for (const [rate, weight] of ordered) {
    cumulativeWeight += weight;

    if (cumulativeWeight >= midpoint) {
      return rate;
    }
  }

  return ordered[ordered.length - 1][0];
}

export function calculateMedianRate(rates: number[]): number | null {
  if (rates.length === 0) {
    return null;
  }

  const ordered = rates
    .map((rate) => requirePositiveFinite(rate, 'Hourly rate'))
    .sort((left, right) => left - right);
  const midpoint = Math.floor(ordered.length / 2);

  return ordered.length % 2 === 1
    ? ordered[midpoint]
    : (ordered[midpoint - 1] + ordered[midpoint]) / 2;
}

export function calculateDailyGoalBonuses(
  typicalHourlyRate: number,
  focusGoalMinutes: number,
  taskGoalCount: number
): DailyGoalBonusSnapshot {
  const validRate = requirePositiveFinite(typicalHourlyRate, 'Typical hourly rate');

  if (!Number.isInteger(focusGoalMinutes) || focusGoalMinutes < 1) {
    throw new Error('Focus goal minutes must be an integer greater than 0.');
  }

  if (!Number.isInteger(taskGoalCount) || taskGoalCount < 3) {
    throw new Error('Task goal count must be an integer of at least 3.');
  }

  return {
    focusBonusAmount: Math.round(validRate * (focusGoalMinutes / 60) * 0.1),
    taskBonusAmount: Math.round(validRate * 0.125 * Math.ceil(taskGoalCount / 3)),
    comboBonusAmount: Math.round(validRate * 0.25),
  };
}
