import { Debt, Expense, Income, Strategy } from '../types';

export function mesesParaPagar(saldo: number, tasaAnual: number, pagoMensual: number): number {
  const r = (tasaAnual / 100) / 12;
  if (pagoMensual <= 0) return Infinity;
  if (r === 0) return Math.ceil(saldo / pagoMensual);
  const interesMensual = saldo * r;
  if (pagoMensual <= interesMensual) return Infinity;
  const n = -Math.log(1 - (r * saldo) / pagoMensual) / Math.log(1 + r);
  return Math.max(1, Math.ceil(n));
}

export interface SimResult {
  meses: number | null;
  fecha: Date;
  interesTotal: number;
}

export function simularLibertad(
  debts: Debt[],
  strategy: Strategy,
  ingresosMensuales: number,
  gastosMensuales: number
): SimResult {
  if (debts.length === 0) {
    return { meses: 0, fecha: new Date(), interesTotal: 0 };
  }

  const totalMinimos = debts.reduce((s, d) => s + Number(d.pago || 0), 0);
  const extra = Math.max(0, ingresosMensuales - gastosMensuales - totalMinimos);

  // Deep copy the debts so we can modify the balances during simulation
  const cuentas = debts
    .map((d) => ({
      id: d.id,
      saldo: Number(d.actual || 0),
      r: (Number(d.tasa || 0) / 100) / 12,
      pago: Number(d.pago || 0),
    }))
    .filter((d) => d.saldo > 0);

  // Sort according to strategy
  const orden = strategy === 'avalancha'
    ? [...cuentas].sort((a, b) => b.r - a.r) // Highest interest rate first
    : [...cuentas].sort((a, b) => a.saldo - b.saldo); // Smallest balance first

  let meses = 0;
  let interesTotal = 0;
  const LIMITE = 600; // 50 years limit

  while (orden.some((c) => c.saldo > 0.5) && meses < LIMITE) {
    meses++;
    let disponibleExtra = extra;

    // Apply monthly interest and minimum payment to each active debt
    orden.forEach((c) => {
      if (c.saldo <= 0) return;
      const interes = c.saldo * c.r;
      interesTotal += interes;
      c.saldo += interes;

      const pago = Math.min(c.saldo, c.pago);
      c.saldo -= pago;
    });

    // Apply extra cash flow to the highest priority debt that has balance
    for (const c of orden) {
      if (c.saldo <= 0) continue;
      const pagoExtra = Math.min(c.saldo, disponibleExtra);
      c.saldo -= pagoExtra;
      disponibleExtra -= pagoExtra;
      if (disponibleExtra <= 0) break;
    }
  }

  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() + meses);

  return {
    meses: meses >= LIMITE ? null : meses,
    fecha,
    interesTotal,
  };
}

export function getMontoElegido(d: Debt): number {
  if (d.pagoElegidoTipo === 'minimo') return d.pago;
  if (d.pagoElegidoTipo === 'no_interes') return d.pagoNoInteres;
  if (d.pagoElegidoTipo === 'ninguno') return 0;
  if (d.pagoElegidoTipo === 'otro') return d.pagoElegidoMonto ?? 0;
  return d.pago;
}

export function formatMXN(val: number, decimals: number = 0): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function calcularGastosMensuales(expenses: Expense[]): number {
  const ahora = new Date();
  const delMes = expenses.filter((g) => {
    const f = new Date(g.fecha);
    return f.getFullYear() === ahora.getFullYear() && f.getMonth() === ahora.getMonth();
  });
  return delMes.reduce((s, g) => s + Number(g.monto || 0), 0);
}

export function calcularIngresosMensuales(incomes: Income[]): number {
  if (incomes.length === 0) return 0;
  // Let's filter to current month's incomes to keep it consistent and realistic
  const ahora = new Date();
  const delMes = incomes.filter((i) => {
    const f = new Date(i.fecha);
    return f.getFullYear() === ahora.getFullYear() && f.getMonth() === ahora.getMonth();
  });
  // If there are no incomes this month, fallback to sum of all incomes as fallback
  if (delMes.length === 0) {
    return incomes.reduce((s, i) => s + Number(i.monto || 0), 0);
  }
  return delMes.reduce((s, i) => s + Number(i.monto || 0), 0);
}

/**
 * Returns today's date in YYYY-MM-DD format using the local timezone.
 * Prevents UTC bugs where evenings in Americas roll over to tomorrow.
 */
export function getLocalTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDueBadgeInfo(dueDay: number = 15) {
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  let daysRemaining = dueDay - currentDay;
  if (daysRemaining < 0) {
    daysRemaining += daysInMonth;
  }

  // Verde: más de 10 días
  // Amarillo: entre 3 y 10 días (menos de 9/10 días)
  // Rojo: menos de 3 días (0, 1, 2 días)
  if (daysRemaining > 10) {
    return {
      daysRemaining,
      badgeText: `Vence: Día ${dueDay}`,
      daysLabel: `Faltan ${daysRemaining} días`,
      badgeStyle: 'bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold',
      pillStyle: 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 font-bold',
      status: 'green' as const
    };
  } else if (daysRemaining >= 3) {
    return {
      daysRemaining,
      badgeText: `Vence: Día ${dueDay}`,
      daysLabel: `Faltan ${daysRemaining} días`,
      badgeStyle: 'bg-amber-100 text-amber-800 border border-amber-200/80 font-bold',
      pillStyle: 'bg-amber-500/15 text-amber-800 border border-amber-500/30 font-bold',
      status: 'yellow' as const
    };
  } else {
    return {
      daysRemaining,
      badgeText: daysRemaining === 0 ? `¡VENCE HOY! (Día ${dueDay})` : `Vence: Día ${dueDay}`,
      daysLabel: daysRemaining === 0 ? '¡VENCE HOY!' : `Faltan ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}`,
      badgeStyle: 'bg-rose-100 text-rose-700 border border-rose-200/80 font-bold',
      pillStyle: 'bg-rose-500/15 text-rose-700 border border-rose-500/30 font-bold',
      status: 'red' as const
    };
  }
}

