import React, { useState } from 'react';
import { Debt, DebtPayment } from '../types';
import { formatMXN, getLocalTodayDateString, getMontoElegido } from '../utils/finance';
import { CheckCircle2, Plus, Trash2, TrendingUp, Calendar, DollarSign, Award, AlertCircle, ArrowUpRight, Sparkles, Info, Zap, BarChart2, PieChart as PieChartIcon, Clock, CreditCard } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import DeudaDetailModal from './DeudaDetailModal';

interface PagosTabProps {
  debts: Debt[];
  payments: DebtPayment[];
  onAddPayment: (payment: Omit<DebtPayment, 'id'>) => void;
  onDeletePayment: (id: string) => void;
}

export default function PagosTab({
  debts,
  payments,
  onAddPayment,
  onDeletePayment
}: PagosTabProps) {
  const [selectedDeudaId, setSelectedDeudaId] = useState<string>(debts[0]?.id || '');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(() => getLocalTodayDateString());
  const [nota, setNota] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null);
  const [chartView, setChartView] = useState<'bar_horizontal' | 'donut' | 'timeline'>('bar_horizontal');

  const selectedDebtObj = debts.find(d => d.id === selectedDeudaId);
  const montoSugerido = selectedDebtObj ? getMontoElegido(selectedDebtObj) : 0;
  const tipoSugeridoTexto = selectedDebtObj?.pagoElegidoTipo === 'no_interes' ? 'Pago para no generar intereses' :
    selectedDebtObj?.pagoElegidoTipo === 'minimo' ? 'Pago mínimo requerido' :
    selectedDebtObj?.pagoElegidoTipo === 'otro' ? 'Pago personalizado' : 'Pago estándar';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(monto);
    if (!selectedDeudaId || !val || val <= 0) return;

    const deuda = debts.find(d => d.id === selectedDeudaId);
    if (!deuda) return;

    onAddPayment({
      deudaId: selectedDeudaId,
      deudaNombre: deuda.nombre,
      monto: val,
      fecha,
      nota: nota.trim() || 'Pago registrado'
    });

    setMonto('');
    setNota('');
    setFecha(getLocalTodayDateString());
    setIsFormOpen(false);
  };

  // Calculate totals
  const totalPagadoHistorico = payments.reduce((acc, p) => acc + p.monto, 0);
  
  const hoyStr = getLocalTodayDateString().slice(0, 7); // YYYY-MM
  const totalPagadoMes = payments
    .filter(p => p.fecha.startsWith(hoyStr))
    .reduce((acc, p) => acc + p.monto, 0);

  const totalDeudaInicial = debts.reduce((acc, d) => acc + (d.inicial || d.actual), 0);
  const totalDeudaActual = debts.reduce((acc, d) => acc + d.actual, 0);
  const avanceTotalPct = totalDeudaInicial > 0 
    ? Math.min(100, Math.max(0, ((totalDeudaInicial - totalDeudaActual) / totalDeudaInicial) * 100))
    : 0;

  // Prepare chart data (group by date)
  const chartDataMap: { [key: string]: number } = {};
  payments.forEach(p => {
    chartDataMap[p.fecha] = (chartDataMap[p.fecha] || 0) + p.monto;
  });

  const chartData = Object.keys(chartDataMap)
    .sort()
    .map(date => ({
      fecha: date,
      monto: chartDataMap[date]
    }));

  const sortedPayments = [...payments].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const paymentsByDebtMap: { [key: string]: { monto: number; color: string } } = {};
  const DEBT_COLORS_PAGOS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#ef4444', '#14b8a6', '#84cc16'];
  
  payments.forEach((p) => {
    const name = p.deudaNombre || 'Otra cuenta';
    if (!paymentsByDebtMap[name]) {
      const colorIdx = Object.keys(paymentsByDebtMap).length;
      paymentsByDebtMap[name] = { monto: 0, color: DEBT_COLORS_PAGOS[colorIdx % DEBT_COLORS_PAGOS.length] };
    }
    paymentsByDebtMap[name].monto += p.monto;
  });

  const chartDataByDebt = Object.keys(paymentsByDebtMap)
    .map(name => ({
      name,
      monto: paymentsByDebtMap[name].monto,
      color: paymentsByDebtMap[name].color
    }))
    .sort((a, b) => b.monto - a.monto);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-heading tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <span>Control de Pagos y Avance</span>
          </h2>
          <p className="text-xs text-text-muted font-medium mt-0.5">
            Registra tus abonos y visualiza el gráfico en tiempo real de la reducción de tus deudas.
          </p>
        </div>

        <button
          onClick={() => {
            if (!isFormOpen) {
              const targetId = selectedDeudaId || (debts[0]?.id || '');
              if (targetId) {
                if (!selectedDeudaId) setSelectedDeudaId(targetId);
                const d = debts.find(item => item.id === targetId);
                if (d && !monto) {
                  const sug = getMontoElegido(d);
                  if (sug > 0) setMonto(sug.toString());
                }
              }
            }
            setIsFormOpen(!isFormOpen);
          }}
          disabled={debts.length === 0}
          className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-contrast rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Cerrar Formulario' : 'Registrar Nuevo Pago'}
        </button>
      </div>

      {debts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-xs text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <span>No tienes deudas registradas aún. Ve a la pestaña de <strong>Deudas</strong> para agregar tu primera tarjeta o crédito antes de registrar pagos.</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card-default flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Pagado Este Mes</p>
            <p className="text-2xl font-mono font-bold text-emerald-600 mt-1">{formatMXN(totalPagadoMes)}</p>
            <p className="text-[10px] text-text-muted mt-1">Acumulado en mes actual</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card-default flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Histórico Pagado</p>
            <p className="text-2xl font-mono font-bold text-brand-primary mt-1">{formatMXN(totalPagadoHistorico)}</p>
            <p className="text-[10px] text-text-muted mt-1">{payments.length} pagos registrados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card-default flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Avance Global del Deuda</p>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{avanceTotalPct.toFixed(1)}%</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5 border border-gray-200/60">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${avanceTotalPct}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-text-muted mt-1.5 flex justify-between font-mono">
              <span>Restante: {formatMXN(totalDeudaActual)}</span>
              <span>Inicial: {formatMXN(totalDeudaInicial)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de Registro */}
      {isFormOpen && debts.length > 0 && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-pronounced border border-gray-100 space-y-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-text-heading uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>Registrar Nuevo Abono / Pago</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Seleccionar Deuda a Pagar
              </label>
              <select
                value={selectedDeudaId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedDeudaId(newId);
                  const d = debts.find(item => item.id === newId);
                  if (d) {
                    const sug = getMontoElegido(d);
                    if (sug > 0) setMonto(sug.toString());
                  }
                }}
                required
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-primary font-medium"
              >
                {debts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({formatMXN(d.actual)} restantes)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Monto del Pago ($)
                </label>
                {selectedDebtObj && (
                  <button
                    type="button"
                    onClick={() => setDetailDebt(selectedDebtObj)}
                    className="text-[10px] text-brand-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Ver expediente e IA</span>
                  </button>
                )}
              </div>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-bold text-emerald-600"
              />
              {selectedDebtObj && montoSugerido > 0 && (
                <div className="text-[11px] bg-indigo-50/80 border border-indigo-100 text-indigo-900 px-3 py-2 rounded-xl flex items-center justify-between gap-2 mt-1">
                  <div className="min-w-0 pr-1">
                    <span className="font-semibold text-indigo-950">Desembolso del Mes:</span>{' '}
                    <span className="font-mono font-bold text-indigo-700">{formatMXN(montoSugerido)}</span>
                    <span className="text-[10px] text-indigo-600 block truncate">({tipoSugeridoTexto})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMonto(montoSugerido.toString())}
                    className="bg-white text-indigo-700 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all text-[10px] shadow-2xs cursor-pointer shrink-0"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Fecha de Pago
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Nota / Concepto (Opcional)
              </label>
              <input
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej. Abono quincenal, pago mínimo"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-body rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aplicar Pago a la Deuda</span>
            </button>
          </div>
        </form>
      )}

      {/* Avance Individual por Deuda */}
      {debts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-card-default border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-text-heading uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-primary" />
            <span>Avance Individual de Reducción por Deuda</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {debts.map(d => {
              const ini = d.inicial || d.actual;
              const pagado = Math.max(0, ini - d.actual);
              const pct = ini > 0 ? Math.min(100, (pagado / ini) * 100) : 0;
              const totalPagosDeuda = payments.filter(p => p.deudaId === d.id).reduce((acc, p) => acc + p.monto, 0);

              return (
                <div key={d.id} className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-text-heading text-sm">{d.nombre}</p>
                      <p className="text-[11px] text-text-muted">{d.tipo}</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        {pct.toFixed(0)}% pagado
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full bg-gray-200/80 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                      <span>Restante: <strong className="text-text-heading">{formatMXN(d.actual)}</strong></span>
                      <span>Inicial: {formatMXN(ini)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200/50 flex items-center justify-between text-[11px] text-text-muted">
                    <span>Total abonado aquí: <strong className="text-emerald-600 font-mono">{formatMXN(totalPagosDeuda)}</strong></span>
                    <button
                      onClick={() => {
                        setSelectedDeudaId(d.id);
                        setIsFormOpen(true);
                      }}
                      className="text-brand-primary hover:text-brand-primary-hover font-bold flex items-center gap-0.5"
                    >
                      <span>Abonar</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráfico de Pagos Realizados */}
      <div className="bg-white rounded-2xl p-6 shadow-card-default border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-text-heading uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Análisis Gráfico de Pagos Realizados</span>
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">Compara cuánto has abonado a cada cuenta o revisa la cronología</p>
          </div>
          
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60 self-start sm:self-auto shrink-0 flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setChartView('bar_horizontal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === 'bar_horizontal'
                  ? 'bg-white text-brand-primary shadow-2xs'
                  : 'text-text-muted hover:text-text-heading'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 transform rotate-90" />
              <span>Barras (Por Cuenta)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('donut')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === 'donut'
                  ? 'bg-white text-brand-primary shadow-2xs'
                  : 'text-text-muted hover:text-text-heading'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Circular (Por Cuenta)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === 'timeline'
                  ? 'bg-white text-brand-primary shadow-2xs'
                  : 'text-text-muted hover:text-text-heading'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Por Fecha</span>
            </button>
          </div>
        </div>

        {payments.length > 0 ? (
          <div className="pt-2">
            {chartView === 'bar_horizontal' && (
              <div className="space-y-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataByDebt} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }} width={130} axisLine={false} tickLine={false} />
                      <Tooltip 
                        formatter={(value: any) => [formatMXN(Number(value)), 'Total Pagado']}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="monto" radius={[0, 8, 8, 0]} name="Abono ($)">
                        {chartDataByDebt.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-gray-50">
                  {chartDataByDebt.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/60">
                      <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }}></span>
                      <span className="font-semibold text-text-heading">{item.name}:</span>
                      <span className="font-mono font-bold text-emerald-600">{formatMXN(item.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartView === 'donut' && (
              <div className="space-y-4">
                <div className="h-64 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataByDebt}
                        dataKey="monto"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {chartDataByDebt.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [formatMXN(Number(value)), 'Total Pagado']}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 m-auto w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner pointer-events-none text-center p-1">
                    <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider leading-tight">Total Pagado</span>
                    <span className="text-xs font-bold text-emerald-600 font-mono leading-tight mt-0.5">{formatMXN(totalPagadoHistorico)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-gray-50">
                  {chartDataByDebt.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/60">
                      <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }}></span>
                      <span className="font-semibold text-text-heading">{item.name}:</span>
                      <span className="font-mono font-bold text-emerald-600">{formatMXN(item.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartView === 'timeline' && (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis 
                      dataKey="fecha" 
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(val) => `$${val}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatMXN(Number(value)), 'Monto Pagado']}
                      labelFormatter={(label) => `Fecha: ${label}`}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="monto" fill="#10b981" radius={[6, 6, 0, 0]} name="Abono ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-text-muted text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No hay datos suficientes para graficar. Registra tu primer pago arriba para ver la gráfica de avance.
          </div>
        )}
      </div>

      {/* Lista de Historial de Pagos */}
      <div className="bg-white rounded-2xl p-6 shadow-card-default border border-gray-100 space-y-4">
        <h3 className="text-sm font-bold text-text-heading uppercase tracking-wider border-b border-gray-100 pb-3">
          Registro Detallado de Abonos ({sortedPayments.length})
        </h3>

        {sortedPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Deuda / Cuenta Pagada</th>
                  <th className="py-3 px-3">Nota / Concepto</th>
                  <th className="py-3 px-3 text-right">Monto Pagado</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {sortedPayments.map(p => {
                  const debtColorObj = paymentsByDebtMap[p.deudaNombre || 'Otra cuenta'] || { color: '#10b981' };
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-text-body font-semibold">{p.fecha}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 font-bold text-xs text-text-heading shadow-2xs">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: debtColorObj.color }}></span>
                          <CreditCard className="w-3.5 h-3.5 text-text-muted" />
                          <span>{p.deudaNombre || 'Cuenta eliminada'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text-muted font-medium">{p.nota || '—'}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 text-sm">{formatMXN(p.monto)}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onDeletePayment(p.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 cursor-pointer"
                          title="Eliminar este pago y revertir saldo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-text-muted text-xs">
            Aún no has registrado ningún pago.
          </div>
        )}
      </div>

      {detailDebt && (
        <DeudaDetailModal
          deuda={detailDebt}
          payments={payments}
          onClose={() => setDetailDebt(null)}
          onAddPayment={onAddPayment}
          onDeletePayment={onDeletePayment}
        />
      )}
    </div>
  );
}
