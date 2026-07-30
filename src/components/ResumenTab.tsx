import React, { useState, useRef } from 'react';
import { Debt, Expense, Income, Strategy, AppState, DebtPayment } from '../types';
import DeudaDetailModal from './DeudaDetailModal';
import { 
  formatMXN, 
  calcularGastosMensuales, 
  calcularIngresosMensuales, 
  simularLibertad,
  mesesParaPagar,
  getMontoElegido,
  getDueBadgeInfo
} from '../utils/finance';
import { 
  TrendingDown, 
  ShoppingBag, 
  DollarSign, 
  Compass, 
  ArrowRight, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CalendarDays,
  Coins,
  Check,
  Sparkles,
  Info,
  PieChart,
  ListOrdered,
  CheckCircle2,
  Zap,
  Flame,
  Shield
} from 'lucide-react';

interface ResumenTabProps {
  state: AppState;
  onUpdateStrategy: (strategy: Strategy) => void;
  onImportData: (data: Partial<AppState>) => void;
  onUpdateDebt: (id: string, updated: Partial<Debt>) => void;
  payments?: DebtPayment[];
  onAddPayment?: (payment: Omit<DebtPayment, 'id'>) => void;
  onDeletePayment?: (id: string) => void;
}

const CATEGORY_COLORS: { [cat: string]: { border: string; bg: string; text: string } } = {
  'Comida': { border: '#3B52F6', bg: 'bg-brand-primary/10', text: 'text-brand-primary' }, // Brand primary
  'Transporte': { border: '#06B6D4', bg: 'bg-accent-info/10', text: 'text-accent-info' }, // Info cyan
  'Vivienda': { border: '#F59E0B', bg: 'bg-accent-warning/10', text: 'text-accent-warning' }, // Warning amber
  'Servicios': { border: '#10B981', bg: 'bg-accent-success/10', text: 'text-accent-success' }, // Success green
  'Entretenimiento': { border: '#8B5CF6', bg: 'bg-pastel-purple/50', text: 'text-purple-600' }, // Purple
  'Salud': { border: '#EF4444', bg: 'bg-accent-danger/10', text: 'text-accent-danger' }, // Danger red
  'Pago de deuda': { border: '#EC4899', bg: 'bg-pink-50', text: 'text-pink-600' }, // Pink
  'Otro': { border: '#9CA3AF', bg: 'bg-gray-100', text: 'text-gray-600' } // Gray
};

const DEBT_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#ef4444', '#14b8a6', '#84cc16'];

export default function ResumenTab({ state, onUpdateStrategy, onImportData, onUpdateDebt, payments = [], onAddPayment, onDeletePayment }: ResumenTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);
  const [selectedDetailDebt, setSelectedDetailDebt] = useState<Debt | null>(null);

  // Calendar state
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());

  // Calendar calculations
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
    setSelectedDay(1);
  };

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  
  const daysGrid: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    daysGrid.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push(i);
  }

  const totalDeuda = state.debts.reduce((sum, d) => sum + Number(d.actual || 0), 0);
  const totalDesembolsoElegido = state.debts.reduce((sum, d) => sum + getMontoElegido(d), 0);
  const ingresos = calcularIngresosMensuales(state.incomes);
  const gastos = calcularGastosMensuales(state.expenses);
  const flujoLibre = ingresos - gastos - totalDesembolsoElegido;
  const deudasUrgentes = state.debts.filter(d => Number(d.actual || 0) > 0 && getDueBadgeInfo(d.diaLimite || 15).daysRemaining <= 3);

  const simResult = simularLibertad(state.debts, state.strategy, ingresos, gastos);

  const MESES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  
  const [loadingAiStrategy, setLoadingAiStrategy] = useState(false);
  const [showAiStrategy, setShowAiStrategy] = useState(false);
  const [aiStrategyData, setAiStrategyData] = useState<{
    resumenEjecutivo: string;
    distribucionIngresos: Array<{ categoria: string; monto: number; porcentaje: number; consejo: string; }>;
    analisisEstrategia: string;
    pasosAccion: string[];
    tipClave: string;
  } | null>(null);

  const generateHeuristicStrategy = () => {
    const totMinimo = state.debts.reduce((sum, d) => sum + (d.pago || 0), 0);
    const extraParaDeudas = Math.max(0, totalDesembolsoElegido - totMinimo);
    const gastosFijos = gastos;
    const ahorroSugerido = Math.max(0, ingresos * 0.10);
    const sobrante = Math.max(0, ingresos - gastosFijos - totalDesembolsoElegido - ahorroSugerido);
    
    const prioDebt = [...state.debts].sort((a, b) => state.strategy === 'avalancha' ? (b.tasa || 0) - (a.tasa || 0) : a.actual - b.actual)[0];
    const nombrePrio = prioDebt ? prioDebt.nombre : 'tu deuda principal';

    return {
      resumenEjecutivo: `Tus ingresos del mes son ${formatMXN(ingresos)} y tus gastos fijos registrados representan ${formatMXN(gastosFijos)}. Cuentas con un flujo libre de ${formatMXN(flujoLibre)} tras cubrir tu Planeador de Desembolsos.`,
      distribucionIngresos: [
        { categoria: 'Gastos de Vida Fijos', monto: gastosFijos, porcentaje: ingresos > 0 ? Math.min(100, Math.round((gastosFijos / ingresos) * 100)) : 0, consejo: 'Procura mantener estos gastos básicos acotados al presupuesto del mes.' },
        { categoria: 'Pagos Mínimos / Obligatorios', monto: totMinimo, porcentaje: ingresos > 0 ? Math.min(100, Math.round((totMinimo / ingresos) * 100)) : 0, consejo: 'Pago intocable para proteger tu historial en Buró de Crédito.' },
        { categoria: `Acelerador a Deuda Prioritaria (${nombrePrio})`, monto: extraParaDeudas + (sobrante > 0 ? sobrante * 0.7 : 0), porcentaje: ingresos > 0 ? Math.min(100, Math.round(((extraParaDeudas + (sobrante > 0 ? sobrante * 0.7 : 0)) / ingresos) * 100)) : 0, consejo: `Concentrar todo abono extra a "${nombrePrio}" bajo estrategia ${state.strategy === 'avalancha' ? 'Avalancha' : 'Bola de Nieve'}.` },
        { categoria: 'Fondo de Emergencia / Ahorro', monto: ahorroSugerido + (sobrante > 0 ? sobrante * 0.3 : 0), porcentaje: ingresos > 0 ? Math.min(100, Math.round(((ahorroSugerido + (sobrante > 0 ? sobrante * 0.3 : 0)) / ingresos) * 100)) : 0, consejo: 'Reserva líquida para imprevistos sin recurrir a nuevas tarjetas.' }
      ],
      analisisEstrategia: `La estrategia ${state.strategy === 'avalancha' ? 'Avalancha (mayor tasa primero)' : 'Bola de Nieve (menor saldo primero)'} es excelente en tu caso. ${state.strategy === 'avalancha' ? 'Ahorrarás la mayor cantidad posible en intereses al atacar el CAT más alto.' : 'Verás victorias rápidas cerrando cuentas pequeñas, generando motivación psicológica.'}`,
      pasosAccion: [
        `Paso 1: Antes del día 15, programa el pago de tus mínimos por ${formatMXN(totMinimo)}.`,
        `Paso 2: Dirige tu aportación extra del Planeador (${formatMXN(extraParaDeudas)}) directamente a ${nombrePrio}.`,
        `Paso 3: Si recibes ingresos adicionales (bonos, comisiones), destina el 70% a amortizar capital y 30% a tu ahorro.`
      ],
      tipClave: `¡Regla de oro! No uses tus tarjetas de crédito como extensión de tu sueldo. Cada peso abonado a capital en tasas del 30%+ es como obtener un rendimiento garantizado del mismo porcentaje en inversión.`
    };
  };

  const handleGenerateAiStrategy = async () => {
    setLoadingAiStrategy(true);
    setShowAiStrategy(true);
    try {
      const res = await fetch('/api/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debts: state.debts,
          incomes: ingresos,
          expenses: gastos,
          strategy: state.strategy,
          totalDesembolsoElegido
        })
      });
      const data = await res.json();
      if (data.success && data.data && data.data.resumenEjecutivo) {
        setAiStrategyData(data.data);
      } else {
        setAiStrategyData(generateHeuristicStrategy());
      }
    } catch (err) {
      console.warn("Falling back to heuristic strategy:", err);
      setAiStrategyData(generateHeuristicStrategy());
    } finally {
      setLoadingAiStrategy(false);
    }
  };

  let freedomText = '';
  if (state.debts.length === 0) {
    freedomText = 'Sin deudas registradas';
  } else if (simResult.meses === null) {
    freedomText = 'No alcanzable con el pago actual';
  } else if (simResult.meses === 0) {
    freedomText = 'Ya casi — este mes';
  } else {
    const fDate = simResult.fecha;
    freedomText = `${simResult.meses} meses · ${MESES_ABR[fDate.getMonth()]} ${fDate.getFullYear()}`;
  }

  // Calculate overall path progress
  const inicialTotal = state.debts.reduce((sum, d) => sum + Number(d.inicial || d.actual || 0), 0);
  const pathProgressPercentage = inicialTotal > 0 
    ? Math.min(100, Math.max(0, (1 - totalDeuda / inicialTotal) * 100)) 
    : 0;

  // Render donut calculations
  const ahora = new Date();
  const delMes = state.expenses.filter((g) => {
    const f = new Date(g.fecha);
    return f.getFullYear() === ahora.getFullYear() && f.getMonth() === ahora.getMonth();
  });

  const expensesByCat: { [cat: string]: number } = {};
  delMes.forEach((g) => {
    expensesByCat[g.categoria] = (expensesByCat[g.categoria] || 0) + Number(g.monto || 0);
  });

  const totalGastosCategoria = Object.values(expensesByCat).reduce((a, b) => a + b, 0);

  // Donut SVG Setup
  const R = 52;
  const C = 2 * Math.PI * R; // ~326.72
  let accOffset = 0;

  const donutSlices = Object.entries(expensesByCat).map(([cat, val], i) => {
    const percentage = val / totalGastosCategoria;
    const dash = percentage * C;
    const colorProps = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Otro'];
    const sliceOffset = accOffset;
    accOffset += dash;
    return {
      cat,
      val,
      color: colorProps.border,
      percentage,
      dash,
      offset: sliceOffset
    };
  });

  let accOffsetDebt = 0;
  const debtDonutSlices = state.debts
    .filter(d => Number(d.actual || 0) > 0)
    .map((d, i) => {
      const val = Number(d.actual || 0);
      const percentage = totalDeuda > 0 ? val / totalDeuda : 0;
      const dash = percentage * C;
      const color = DEBT_COLORS[i % DEBT_COLORS.length];
      const sliceOffset = accOffsetDebt;
      accOffsetDebt += dash;
      return {
        id: d.id,
        nombre: d.nombre,
        tipo: d.tipo,
        val,
        color,
        percentage,
        dash,
        offset: sliceOffset,
        debt: d
      };
    });

  // Handle data export
  const exportarJSON = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fecha = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `camino-a-cero-${fecha}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupMsg('Archivo descargado con éxito.');
      setIsSuccess(true);
    } catch (e) {
      setBackupMsg('No se pudo exportar el archivo.');
      setIsSuccess(false);
    }
  };

  // Handle data import
  const importarJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) return;
        const parsed = JSON.parse(event.target.result as string);
        onImportData(parsed);
        setBackupMsg('Datos importados correctamente.');
        setIsSuccess(true);
      } catch (err) {
        setBackupMsg('Ese archivo no es un JSON válido de Camino a Cero.');
        setIsSuccess(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Deuda Total */}
        <div className="bg-white rounded-2xl p-6 border-t-4 border-amber-500 border-x border-b border-amber-100/80 shadow-sm hover:translate-y-[-2px] transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-sans">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              Deuda Total
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200/60">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono break-words">
            {formatMXN(totalDeuda)}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            {state.debts.length} cuenta{state.debts.length === 1 ? '' : 's'} activa{state.debts.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Gasto del Mes */}
        <div className="bg-white rounded-2xl p-6 border-t-4 border-blue-500 border-x border-b border-blue-100/80 shadow-sm hover:translate-y-[-2px] transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-sans">
              <Flame className="w-3.5 h-3.5 text-blue-600" />
              Gasto del Mes
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 border border-blue-200/60">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono break-words">
            {formatMXN(gastos)}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Ingreso mensual registrado: <span className="font-semibold text-slate-700">{formatMXN(ingresos)}</span>
          </p>
        </div>

        {/* Flujo Libre Mensual */}
        <div className={`bg-white rounded-2xl p-6 border-t-4 ${flujoLibre >= 0 ? 'border-emerald-500 border-emerald-100/80' : 'border-rose-500 border-rose-100/80'} border-x border-b shadow-sm hover:translate-y-[-2px] transition-all duration-200`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${flujoLibre >= 0 ? 'text-slate-700' : 'text-rose-800'} flex items-center gap-1.5 font-sans`}>
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              Flujo Libre Mensual
            </span>
            <div className={`w-8 h-8 rounded-lg ${flujoLibre >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'} flex items-center justify-center`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono break-words ${flujoLibre >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatMXN(flujoLibre)}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Libre tras gastos del mes y pagos programados
          </p>
        </div>
      </div>

      {/* SECCIÓN DEUDAS A PAGAR EN 3 DÍAS O MENOS (URGENTES) */}
      {deudasUrgentes.length > 0 ? (
        <div className="bg-rose-50/80 border border-rose-200/90 rounded-2xl md:rounded-[24px] p-5 shadow-card-default space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-rose-200/60 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center border border-rose-500/30">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                  <span>Deudas a Pagar en 3 Días o Menos</span>
                  <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {deudasUrgentes.length} {deudasUrgentes.length === 1 ? 'cuenta urgente' : 'cuentas urgentes'}
                  </span>
                </h3>
                <p className="text-[11px] text-rose-800/90 font-medium">
                  Atiende estas cuentas prioritariamente para evitar recargos o afectaciones en tu Buró de Crédito
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {deudasUrgentes.map((d) => {
              const badgeInfo = getDueBadgeInfo(d.diaLimite || 15);
              return (
                <div key={d.id} className="bg-white rounded-xl p-4 border border-rose-200/80 shadow-2xs flex flex-col justify-between space-y-3 hover:border-rose-400 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text-heading truncate">{d.nombre}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${badgeInfo.badgeStyle}`}>
                        {badgeInfo.badgeText}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Saldo actual:</span>
                      <span className="font-bold text-text-heading font-mono">{formatMXN(d.actual)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                      <span className="text-rose-900 font-semibold text-[11px]">Mínimo a Pagar:</span>
                      <span className="font-bold text-rose-700 font-mono">{formatMXN(d.pago)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100/80 px-2 py-1 rounded-md border border-rose-200">
                      ⏰ {badgeInfo.daysLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDetailDebt(d)}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Ver / Pagar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-950">
                Deudas Próximas al Corriente
              </h3>
              <p className="text-[11px] text-emerald-800/90 font-medium">
                ¡Excelente! No tienes deudas con fecha límite de pago en los próximos 3 días.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 font-mono">
            0 Cuentas Urgentes
          </span>
        </div>
      )}

      {/* SECCIÓN PLANIFICACIÓN DE DESEMBOLSOS Y CALENDARIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA CALENDARIO */}
        <div className="lg:col-span-6 xl:col-span-5 bg-white rounded-2xl md:rounded-[24px] p-4 sm:p-5 shadow-sm border border-amber-200/80 border-t-4 border-t-amber-500 flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 flex items-center gap-1 font-sans">
                <CalendarDays className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Efemérides & Calendario
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 truncate font-sans">
                Vencimientos e Ingresos
              </h3>
            </div>
            
            {/* Controles del Mes */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shrink-0 self-start sm:self-center">
              <button 
                type="button"
                onClick={handlePrevMonth} 
                className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                title="Mes Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-slate-800 px-2 min-w-[105px] text-center capitalize select-none whitespace-nowrap font-sans">
                {new Date(calYear, calMonth).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                type="button"
                onClick={handleNextMonth} 
                className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                title="Siguiente Mes"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Grid de Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-gray-100 pb-1.5">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
              <span key={index} className="text-[10px] font-bold text-text-muted uppercase font-mono py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Grid de Días del Mes */}
          <div className="grid grid-cols-7 gap-1.5">
            {daysGrid.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square"></div>;
              }

              const isSelected = selectedDay === day;
              const isToday = new Date().getDate() === day && new Date().getMonth() === calMonth && new Date().getFullYear() === calYear;
              const dayDebts = state.debts.filter(d => d.diaLimite === day);
              const dayIncomes = state.recurring && (state.recurring.dia1 === day || state.recurring.dia2 === day);

              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-between p-1.5 relative transition-all duration-200 border cursor-pointer ${
                    isSelected 
                      ? 'bg-brand-primary border-brand-primary text-white shadow-md' 
                      : isToday
                      ? 'bg-pastel-blue border-brand-primary/40 text-brand-primary font-bold'
                      : 'bg-white hover:bg-gray-50 border-gray-150/70 text-text-body'
                  }`}
                >
                  <span className="text-xs font-semibold leading-none">{day}</span>
                  
                  {/* Indicators */}
                  <div className="flex gap-0.5 justify-center w-full mt-0.5">
                    {dayIncomes && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-accent-success'} animate-pulse`} title="Ingreso de Quincena"></span>
                    )}
                    {dayDebts.length > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white font-bold' : 'bg-accent-danger'}`} title={`${dayDebts.length} Pago(s)`}></span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detalles del Día Seleccionado */}
          {selectedDay !== null && (
            <div className="bg-canvas-outer rounded-2xl p-4 border border-gray-150/80 space-y-2.5 flex-1 min-h-[140px] flex flex-col justify-start">
              <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                <h4 className="text-xs font-bold text-text-heading flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-brand-primary" />
                  Día {selectedDay} de {new Date(calYear, calMonth).toLocaleDateString('es-MX', { month: 'long' })}
                </h4>
                {selectedDay === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear() && (
                  <span className="text-[9px] bg-brand-primary text-white font-bold px-1.5 py-0.5 rounded-full">
                    Hoy
                  </span>
                )}
              </div>

              {/* Eventos */}
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[120px] pr-1">
                {/* Income */}
                {state.recurring && (state.recurring.dia1 === selectedDay || state.recurring.dia2 === selectedDay) && (
                  <div className="flex items-center justify-between text-xs bg-pastel-green/55 border border-accent-success/15 p-2 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-success"></span>
                      <span className="font-semibold text-text-body">Ingreso: {state.recurring.fuente}</span>
                    </div>
                    <span className="font-bold text-accent-success font-mono">+{formatMXN(state.recurring.monto)}</span>
                  </div>
                )}

                {/* Debts */}
                {state.debts.filter(d => d.diaLimite === selectedDay).length > 0 ? (
                  state.debts.filter(d => d.diaLimite === selectedDay).map(d => (
                    <div key={d.id} className="flex flex-col gap-1 bg-pastel-red/50 border border-accent-danger/10 p-2 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-danger"></span>
                          <span className="font-bold text-text-heading">{d.nombre}</span>
                        </div>
                        <span className="text-[10px] font-bold text-accent-danger uppercase">Límite de Pago</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-text-muted mt-0.5 font-mono">
                        <span>Min: {formatMXN(d.pago)}</span>
                        <span>No Int: {formatMXN(d.pagoNoInteres || d.pago)}</span>
                        <span className="font-semibold text-text-body bg-white px-1.5 rounded border border-gray-200">Elegido: {formatMXN(getMontoElegido(d))}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  !(state.recurring && (state.recurring.dia1 === selectedDay || state.recurring.dia2 === selectedDay)) && (
                    <p className="text-xs text-text-muted italic text-center py-4">
                      No hay vencimientos de deudas ni ingresos programados para este día.
                    </p>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA PLANIFICADOR DE DESEMBOLSOS */}
        <div className="lg:col-span-7 bg-white rounded-2xl md:rounded-[24px] p-4 sm:p-6 shadow-sm border border-amber-200/80 border-t-4 border-t-amber-500 flex flex-col space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-800 flex items-center gap-1 font-serif">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              Estrategia de Tributos y Desembolsos
            </span>
            <h3 className="text-base font-black text-slate-900 mt-0.5 flex items-center gap-2 font-serif">
              ¿Cómo forjarás la liberación de tu deuda este mes?
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">
              Elige para cada armadura financiera el tributo mínimo o la liberación completa para evitar intereses sagrados.
            </p>
          </div>

          {state.debts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-8 border border-dashed border-gray-200 text-center min-h-[260px]">
              <p className="text-sm text-text-muted italic leading-relaxed">
                Agrega cuentas activas en la pestaña "Deudas" para poder elegir tus estrategias de desembolso mensual aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {/* List of debts with option selectors */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {state.debts.map((d) => {
                  return (
                    <div 
                      key={d.id} 
                      className="border border-gray-150/70 rounded-2xl p-4 hover:border-brand-primary/20 transition-all duration-200 bg-white"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-heading">{d.nombre}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${getDueBadgeInfo(d.diaLimite || 15).badgeStyle}`}>
                            {getDueBadgeInfo(d.diaLimite || 15).badgeText}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="text-xs text-text-muted font-medium">
                            Saldo actual: <span className="font-bold text-text-body font-mono">{formatMXN(d.actual)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedDetailDebt(d)}
                            className="px-2.5 py-1 rounded-lg bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow-2xs shrink-0"
                            title="Ver expediente y análisis IA"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Detalle</span>
                          </button>
                        </div>
                      </div>

                      {/* Selector choices */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* No pagar */}
                        <button
                          type="button"
                          onClick={() => onUpdateDebt(d.id, { pagoElegidoTipo: 'ninguno' })}
                          className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold tracking-wide border transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                            d.pagoElegidoTipo === 'ninguno'
                              ? 'bg-gray-100 border-gray-300 text-text-heading shadow-sm'
                              : 'bg-white border-gray-150 text-text-muted hover:bg-gray-50'
                          }`}
                        >
                          <span>No Pagar</span>
                          <span className="font-mono text-[10px] font-bold">$0</span>
                        </button>

                        {/* Pago mínimo */}
                        <button
                          type="button"
                          onClick={() => onUpdateDebt(d.id, { pagoElegidoTipo: 'minimo' })}
                          className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold tracking-wide border transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                            d.pagoElegidoTipo === 'minimo'
                              ? 'bg-pastel-blue border-brand-primary/30 text-brand-primary shadow-sm'
                              : 'bg-white border-gray-150 text-text-muted hover:bg-gray-50'
                          }`}
                        >
                          <span>Pago Mínimo</span>
                          <span className="font-mono text-[10px] font-bold">{formatMXN(d.pago)}</span>
                        </button>

                        {/* Pago no intereses */}
                        <button
                          type="button"
                          onClick={() => onUpdateDebt(d.id, { pagoElegidoTipo: 'no_interes' })}
                          className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold tracking-wide border transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                            d.pagoElegidoTipo === 'no_interes'
                              ? 'bg-pastel-yellow border-accent-warning/30 text-accent-warning shadow-sm'
                              : 'bg-white border-gray-150 text-text-muted hover:bg-gray-50'
                          }`}
                        >
                          <span>No Intereses</span>
                          <span className="font-mono text-[10px] font-bold">{formatMXN(d.pagoNoInteres || d.pago)}</span>
                        </button>

                        {/* Otro monto */}
                        <button
                          type="button"
                          onClick={() => onUpdateDebt(d.id, { pagoElegidoTipo: 'otro', pagoElegidoMonto: d.pagoElegidoMonto || d.pago })}
                          className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold tracking-wide border transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                            d.pagoElegidoTipo === 'otro'
                              ? 'bg-purple-50 border-purple-200 text-purple-600 shadow-sm'
                              : 'bg-white border-gray-150 text-text-muted hover:bg-gray-50'
                          }`}
                        >
                          <span>Otro Monto</span>
                          <span className="font-mono text-[10px] font-bold">
                            {formatMXN(d.pagoElegidoMonto || d.pago)}
                          </span>
                        </button>
                      </div>

                      {/* Custom amount inputs */}
                      {d.pagoElegidoTipo === 'otro' && (
                        <div className="mt-2.5 flex items-center gap-2 animate-fadeIn bg-purple-50/40 p-2.5 rounded-xl border border-purple-100">
                          <label className="text-[10px] uppercase font-bold text-purple-600">Monto personalizado ($):</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={d.pagoElegidoMonto || ''}
                            onChange={(e) => onUpdateDebt(d.id, { pagoElegidoMonto: parseFloat(e.target.value) || 0 })}
                            placeholder="Monto a pagar $"
                            className="px-2.5 py-1 text-xs font-mono font-bold rounded border border-purple-200 focus:outline-none focus:border-purple-400 w-28 bg-white text-text-heading"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resumen de Flujo */}
              <div className="bg-canvas-outer rounded-2xl p-4 border border-gray-150/80 space-y-3">
                <h4 className="text-xs font-bold text-text-heading border-b border-gray-200 pb-1.5 uppercase tracking-wider select-none">
                  Balance Estimado del Mes
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-text-muted block">Ingresos</span>
                    <span className="text-sm font-bold text-accent-success font-mono">{formatMXN(ingresos)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-text-muted block">Gastos Fijos</span>
                    <span className="text-sm font-bold text-text-body font-mono">-{formatMXN(gastos)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-text-muted block">Pago Deudas</span>
                    <span className="text-sm font-bold text-accent-danger font-mono">-{formatMXN(totalDesembolsoElegido)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-text-heading block">Remanente Final</span>
                    <span className={`text-sm font-black font-mono ${flujoLibre >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                      {formatMXN(flujoLibre)}
                    </span>
                  </div>
                </div>

                {/* Alarm Warning conditional Card */}
                {flujoLibre < 0 ? (
                  <div className="bg-pastel-red border border-accent-danger/25 rounded-xl p-3 flex items-start gap-3 mt-1 text-xs text-accent-danger font-medium leading-relaxed">
                    <AlertCircle className="w-5 h-5 text-accent-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">⚠️ Alerta: Riesgo de quedarte en ceros</span>
                      Tu flujo de dinero estimado es negativo. Te faltan {formatMXN(Math.abs(flujoLibre))} para cubrir este plan. Considera ajustar algunas tarjetas a "Pago Mínimo" o reduce gastos de entretenimiento para evitar quedarte en ceros.
                    </div>
                  </div>
                ) : (
                  <div className="bg-pastel-green border border-accent-success/20 rounded-xl p-3 flex items-start gap-3 mt-1 text-xs text-accent-success font-medium leading-relaxed">
                    <Check className="w-5 h-5 text-accent-success flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">✓ Saldo Sostenible</span>
                      ¡Excelente! Tienes un colchón positivo de {formatMXN(flujoLibre)} tras saldar tus compromisos planificados. No estás en riesgo de quedarte en ceros este mes.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camino a cero (Signature Progress Tape) */}
      <div className="bg-white rounded-[24px] p-6 shadow-pronounced border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-brand-primary">
              Proyección de Libertad Financiera
            </span>
            <h3 className="text-lg font-bold text-text-heading mt-0.5">
              Tu Camino a Cero
            </h3>
          </div>
          <div className="flex items-center gap-3 bg-pastel-blue/50 px-4 py-2.5 rounded-xl border border-pastel-blue">
            <Compass className="w-4 h-4 text-brand-primary animate-spin-slow" />
            <span className="text-sm font-bold text-brand-primary font-mono whitespace-nowrap">
              {freedomText}
            </span>
          </div>
        </div>

        {state.debts.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
            <p className="text-sm text-text-muted italic">
              Agrega tus deudas en la pestaña "Deudas" para trazar tu proyección en la línea del tiempo.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Elegant visual timeline progress track */}
            <div className="relative pt-3 pb-4">
              {/* Line track */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-3 bg-gray-100 rounded-full border border-gray-200/50"></div>
              
              {/* Highlight active progress fill */}
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-3 bg-gradient-to-r from-brand-primary to-[#5066F9] rounded-full shadow-inner transition-all duration-500 ease-out"
                style={{ width: `${pathProgressPercentage}%` }}
              ></div>

              {/* Glowing circular slider thumb indicator */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-[3.5px] border-brand-primary shadow-md flex items-center justify-center transition-all duration-500 ease-out cursor-default"
                style={{ left: `calc(${pathProgressPercentage}% - 12px)` }}
              >
                <div className="w-1 h-1 bg-brand-primary rounded-full"></div>
              </div>
            </div>

            {/* Path Labels */}
            <div className="flex justify-between items-center text-xs font-mono text-text-muted px-1">
              <span className="font-semibold text-text-body">Hoy</span>
              <span className="hidden sm:inline bg-gray-50 px-3 py-1 rounded-full border border-gray-200 text-[11px]">
                Reducción acumulada: {pathProgressPercentage.toFixed(0)}%
              </span>
              <span className="font-semibold text-brand-primary">¡Libre de Deudas!</span>
            </div>

            {/* Strategy Switcher Toggle with design tokens */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2.5">
                Estrategia elegida: <span className="normal-case text-xs font-semibold text-text-body">{state.strategy === 'avalancha' ? 'Avalancha (mayor interés primero)' : 'Bola de nieve (menor saldo primero)'}</span>
              </p>
              
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => onUpdateStrategy('avalancha')}
                  className={`px-4 py-3 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    state.strategy === 'avalancha'
                      ? 'bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/15'
                      : 'bg-white border-gray-200 text-text-body hover:bg-gray-50'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Estrategia Avalancha
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStrategy('bolanieve')}
                  className={`px-4 py-3 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    state.strategy === 'bolanieve'
                      ? 'bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/15'
                      : 'bg-white border-gray-200 text-text-body hover:bg-gray-50'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Bola de Nieve
                </button>
              </div>
            </div>

            {/* AI Strategy Advisor Button & Panel */}
            <div className="pt-4 border-t border-gray-100 mt-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center border border-amber-500/30 shrink-0">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-heading flex items-center gap-1.5">
                      <span>Asesor IA y División Estratégica de Ingresos</span>
                    </h4>
                    <p className="text-[11px] text-text-muted">Cómo repartir tu sueldo inteligentemente para liquidar tus deudas</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!showAiStrategy || !aiStrategyData) {
                      handleGenerateAiStrategy();
                    } else {
                      setShowAiStrategy(!showAiStrategy);
                    }
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${loadingAiStrategy ? 'animate-spin' : ''}`} />
                  <span>{loadingAiStrategy ? 'Analizando tus finanzas...' : showAiStrategy ? 'Ocultar Estrategia IA' : 'Generar Estrategia IA'}</span>
                </button>
              </div>

              {showAiStrategy && (
                <div className="mt-4 bg-gradient-to-br from-amber-50/60 via-white to-gray-50 rounded-2xl p-5 border border-amber-500/20 shadow-card-default space-y-5 animate-fadeIn">
                  {loadingAiStrategy ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs font-bold text-amber-950 animate-pulse">
                        El motor de inteligencia financiera está calculando la mejor división de tus ingresos...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Resumen Ejecutivo */}
                      <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-2xs space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-amber-600" />
                          <span>Diagnóstico de tu Flujo y Capacidad</span>
                        </span>
                        <p className="text-xs text-text-body leading-relaxed font-medium">
                          {aiStrategyData?.resumenEjecutivo || generateHeuristicStrategy().resumenEjecutivo}
                        </p>
                      </div>

                      {/* División Recomendada de Ingresos */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-text-heading flex items-center gap-1.5">
                          <PieChart className="w-4 h-4 text-brand-primary" />
                          <span>División Recomendada de tus Ingresos Mensuales ({formatMXN(ingresos)})</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(aiStrategyData?.distribucionIngresos || generateHeuristicStrategy().distribucionIngresos).map((item, idx) => (
                            <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs space-y-1.5 hover:border-amber-200 transition-all">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-xs font-bold text-text-heading leading-tight">{item.categoria}</span>
                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0">
                                  {item.porcentaje}%
                                </span>
                              </div>
                              <div className="text-sm font-mono font-bold text-emerald-600">
                                {formatMXN(item.monto)}
                              </div>
                              <p className="text-[11px] text-text-muted leading-normal">
                                {item.consejo}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Análisis y Pasos de Acción */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Por qué la Estrategia {state.strategy === 'avalancha' ? 'Avalancha' : 'Bola de Nieve'} te Conviene</span>
                          </span>
                          <p className="text-xs text-text-body leading-relaxed font-medium">
                            {aiStrategyData?.analisisEstrategia || generateHeuristicStrategy().analisisEstrategia}
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                            <ListOrdered className="w-3.5 h-3.5" />
                            <span>Plan de Acción en 3 Pasos</span>
                          </span>
                          <ul className="space-y-1.5 text-xs text-text-body">
                            {(aiStrategyData?.pasosAccion || generateHeuristicStrategy().pasosAccion).map((paso, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0"></span>
                                <span>{paso}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Tip Clave */}
                      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 p-4 rounded-xl border border-amber-500/30 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 font-bold text-base shadow-2xs">
                          💡
                        </div>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950 block">Tip Clave del Asesor</span>
                          <p className="text-xs text-amber-950 font-semibold mt-0.5 leading-relaxed">
                            {aiStrategyData?.tipClave || generateHeuristicStrategy().tipClave}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart Card */}
        <div className="bg-white rounded-2xl p-6 shadow-card-default border border-gray-100 flex flex-col">
          <span className="text-[10px] uppercase tracking-widest font-bold text-accent-info mb-1">
            Distribución Mensual
          </span>
          <h4 className="text-base font-bold text-text-heading mb-4">
            Gastos por Categoría
          </h4>

          {donutSlices.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl p-10 border border-dashed border-gray-200 text-center min-h-[220px]">
              <p className="text-sm text-text-muted italic">
                No hay gastos registrados en este mes todavía.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2 flex-1">
              {/* Donut SVG Illustration */}
              <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
                <svg width="144" height="144" viewBox="0 0 144 144" className="transform -rotate-90 select-none">
                  {donutSlices.map((slice, idx) => (
                    <circle
                      key={idx}
                      cx="72"
                      cy="72"
                      r={R}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="16"
                      strokeDasharray={`${slice.dash} ${C - slice.dash}`}
                      strokeDashoffset={-slice.offset}
                      className="transition-all duration-500 ease-out hover:stroke-[18px] cursor-pointer"
                    />
                  ))}
                </svg>
                {/* Center cutout showing total text */}
                <div className="absolute inset-0 m-auto w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                    Total
                  </span>
                  <span className="text-xs font-bold text-text-heading font-mono">
                    {formatMXN(totalGastosCategoria)}
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <ul className="flex-1 w-full space-y-2">
                {donutSlices
                  .sort((a, b) => b.val - a.val)
                  .map((slice, idx) => {
                    const pct = (slice.percentage * 100).toFixed(0);
                    return (
                      <li key={idx} className="flex items-center justify-between text-xs py-1 border-b border-dashed border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: slice.color }}></span>
                          <span className="font-medium text-text-body">{slice.cat}</span>
                          <span className="text-[10px] text-text-muted">({pct}%)</span>
                        </div>
                        <span className="font-bold font-mono text-text-heading">{formatMXN(slice.val)}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </div>

        {/* Debt Distribution & Progress list */}
        <div className="bg-white rounded-2xl p-6 shadow-card-default border border-gray-100 flex flex-col">
          <span className="text-[10px] uppercase tracking-widest font-bold text-accent-warning mb-1">
            Resumen y Distribución de Cuentas
          </span>
          <h4 className="text-base font-bold text-text-heading mb-4">
            Deudas y Gráfico Circular
          </h4>

          {state.debts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl p-10 border border-dashed border-gray-200 text-center min-h-[220px]">
              <p className="text-sm text-text-muted italic">
                Sin deudas registradas.
              </p>
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              {/* Donut SVG Illustration for Debts */}
              {debtDonutSlices.length > 0 && (
                <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center mx-auto my-3">
                  <svg width="144" height="144" viewBox="0 0 144 144" className="transform -rotate-90 select-none">
                    {debtDonutSlices.map((slice, idx) => (
                      <circle
                        key={idx}
                        cx="72"
                        cy="72"
                        r={R}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="16"
                        strokeDasharray={`${slice.dash} ${C - slice.dash}`}
                        strokeDashoffset={-slice.offset}
                        className="transition-all duration-500 ease-out hover:stroke-[18px] cursor-pointer"
                        onClick={() => setSelectedDetailDebt(slice.debt)}
                      >
                        <title>{slice.nombre}: {formatMXN(slice.val)} ({(slice.percentage * 100).toFixed(0)}%)</title>
                      </circle>
                    ))}
                  </svg>
                  <div className="absolute inset-0 m-auto w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center shadow-inner text-center p-1">
                    <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider leading-tight">
                      Total Deuda
                    </span>
                    <span className="text-[11px] font-bold text-text-heading font-mono leading-tight mt-0.5">
                      {formatMXN(totalDeuda)}
                    </span>
                  </div>
                </div>
              )}

              {/* List of debts with color, percentage, progress and detail button */}
              <div className="space-y-3.5 flex-1 mt-2 max-h-[340px] overflow-y-auto pr-1">
                {state.debts.map((d, idx) => {
                  const ini = Number(d.inicial || d.actual || 0);
                  const act = Number(d.actual || 0);
                  const pct = ini > 0 ? Math.min(100, Math.max(0, (1 - act / ini) * 100)) : 0;
                  const slice = debtDonutSlices.find(s => s.id === d.id);
                  const slicePct = slice ? (slice.percentage * 100).toFixed(0) : '0';
                  const color = slice ? slice.color : DEBT_COLORS[idx % DEBT_COLORS.length];
                  
                  return (
                    <div key={d.id} className="space-y-1.5 pb-3 border-b border-gray-100 last:border-0 last:pb-0 hover:bg-gray-50/60 p-2 rounded-xl transition-all">
                      <div className="flex justify-between items-center text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0 shadow-2xs" style={{ backgroundColor: color }}></span>
                          <span className="font-bold text-text-heading">{d.nombre}</span>
                          <span className="text-[10px] bg-gray-100 text-text-muted px-1.5 py-0.5 rounded-full font-mono">
                            {slicePct}% de deuda total
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-primary font-mono text-xs">{pct.toFixed(0)}% pago</span>
                          <button
                            type="button"
                            onClick={() => setSelectedDetailDebt(d)}
                            className="px-2 py-1 rounded-lg bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-2xs shrink-0"
                            title="Ver detalle de deuda"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Detalle</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[10px] text-text-muted font-mono">
                        <span>Restante: <strong className="text-text-heading">{formatMXN(act)}</strong></span>
                        <span>Inicial: {formatMXN(ini)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JSON Backup Card */}
      <div className="bg-white rounded-2xl p-6 shadow-card-default border border-gray-100">
        <span className="text-[10px] uppercase tracking-widest font-bold text-brand-primary mb-1 block">
          Seguridad & Datos
        </span>
        <h4 className="text-base font-bold text-text-heading mb-1.5">
          Respaldo de tus datos
        </h4>
        <p className="text-xs text-text-muted leading-relaxed mb-5">
          Descarga un archivo JSON con todo lo que has capturado (deudas, gastos, ingresos y tu sueldo recurrente), o restaura uno que ya tengas guardado en tu computadora. Al importar, se reemplazarán de forma permanente los datos actuales de esta aplicación.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportarJSON}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide border border-gray-200 bg-white hover:bg-gray-50 text-text-body transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar JSON
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide border border-gray-200 bg-white hover:bg-gray-50 text-text-body transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar JSON
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={importarJSON}
            accept="application/json"
            className="hidden"
          />
        </div>

        {backupMsg && (
          <div className={`mt-4 p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
            isSuccess 
              ? 'bg-pastel-green/55 border-accent-success/20 text-accent-success' 
              : 'bg-pastel-red/55 border-accent-danger/20 text-accent-danger'
          }`}>
            {isSuccess ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{backupMsg}</span>
          </div>
        )}
      </div>

      {selectedDetailDebt && (
        <DeudaDetailModal
          deuda={selectedDetailDebt}
          payments={payments || []}
          onClose={() => setSelectedDetailDebt(null)}
          onAddPayment={onAddPayment}
          onDeletePayment={onDeletePayment}
        />
      )}
    </div>
  );
}
