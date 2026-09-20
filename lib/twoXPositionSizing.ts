export const TWO_X_LOT_SIZE = 65;

export type PositionSizingInput = {
  capital: number;
  optionPrice: number;
  riskPct: number;
  dailyLossLimitPct: number;
  consecutiveLossLimit: number;
  stopPoints: number;
};

export type PositionSizingRow = {
  stopPoints: number;
  stopPrice: number;
  riskPerLot: number;
  riskLimitedLots: number;
  affordableLots: number;
  maxLots: number;
  quantity: number;
  capitalRequired: number;
  maxLoss: number;
  consecutiveLossExposure: number;
  withinDailyHardStop: boolean;
  validStop: boolean;
};

export function calculatePositionSize({
  capital,
  optionPrice,
  riskPct,
  dailyLossLimitPct,
  consecutiveLossLimit,
  stopPoints
}: PositionSizingInput): PositionSizingRow {
  const safeCapital = Math.max(0, capital);
  const safeOptionPrice = Math.max(0, optionPrice);
  const safeStopPoints = Math.max(0, stopPoints);
  const riskBudget = safeCapital * (Math.max(0, riskPct) / 100);
  const dailyHardStop = safeCapital * (Math.max(0, dailyLossLimitPct) / 100);
  const riskPerLot = safeStopPoints * TWO_X_LOT_SIZE;
  const premiumPerLot = safeOptionPrice * TWO_X_LOT_SIZE;
  const validStop = safeStopPoints > 0 && safeOptionPrice > 0 && safeStopPoints <= safeOptionPrice;
  const riskLimitedLots = validStop && riskPerLot > 0 ? Math.floor(riskBudget / riskPerLot) : 0;
  const affordableLots = premiumPerLot > 0 ? Math.floor(safeCapital / premiumPerLot) : 0;
  const maxLots = validStop ? Math.max(0, Math.min(riskLimitedLots, affordableLots)) : 0;
  const maxLoss = maxLots * riskPerLot;
  const consecutiveLossExposure = maxLoss * Math.max(1, consecutiveLossLimit);

  return {
    stopPoints: safeStopPoints,
    stopPrice: Math.max(0, safeOptionPrice - safeStopPoints),
    riskPerLot,
    riskLimitedLots,
    affordableLots,
    maxLots,
    quantity: maxLots * TWO_X_LOT_SIZE,
    capitalRequired: maxLots * premiumPerLot,
    maxLoss,
    consecutiveLossExposure,
    withinDailyHardStop: consecutiveLossExposure <= dailyHardStop,
    validStop
  };
}
