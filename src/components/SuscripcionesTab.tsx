import React, { useState } from 'react';
import { 
  Repeat, 
  Tv, 
  Home, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  AlertCircle, 
  Zap, 
  Filter,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart2
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Debt, RecurringBill, RecurringBillType } from '../types';

interface SuscripcionesTabProps {
  recurringBills: RecurringBill[];
  debts: Debt[];
  onAddBill: (bill: Omit<RecurringBill, 'id'>) => void;
  onUpdateBill: (id: string, updated: Partial<RecurringBill>) => void;
  onDeleteBill: (id: string) => void;
  onTogglePayBill: (id: string) => void;
}

const PRESET_SUBSCRIPTIONS = [
  { name: 'Spotify', category: 'Entretenimiento', defaultAmount: 129, type: 'subscription' as const },
  { name: 'Netflix', category: 'Entretenimiento', defaultAmount: 219, type: 'subscription' as const },
  { name: 'Disney+', category: 'Entretenimiento', defaultAmount: 179, type: 'subscription' as const },
  { name: 'Amazon Prime', category: 'Entretenimiento', defaultAmount: 99, type: 'subscription' as const },
  { name: 'YouTube Premium', category: 'Entretenimiento', defaultAmount: 139, type: 'subscription' as const },
  { name: 'ChatGPT Plus', category: 'IA & Software', defaultAmount: 400, type: 'subscription' as const },
  { name: 'Uber One', category: 'Servicios', defaultAmount: 79, type: 'subscription' as const },
  { name: 'ViX Premium', category: 'Entretenimiento', defaultAmount: 119, type: 'subscription' as const },
  { name: 'Apple Music / iCloud', category: 'IA & Software', defaultAmount: 149, type: 'subscription' as const },
  { name: 'Canva Pro', category: 'IA & Software', defaultAmount: 150, type: 'subscription' as const },
];

const PRESET_SERVICES = [
  { name: 'Luz (CFE)', category: 'Hogar & Servicios', defaultAmount: 500, type: 'service' as const },
  { name: 'Agua Potable', category: 'Hogar & Servicios', defaultAmount: 250, type: 'service' as const },
  { name: 'Internet / Fibra', category: 'Telecomunicaciones', defaultAmount: 599, type: 'service' as const },
  { name: 'Plan Celular', category: 'Telecomunicaciones', defaultAmount: 399, type: 'service' as const },
  { name: 'Renta / Hipoteca', category: 'Hogar & Servicios', defaultAmount: 6000, type: 'service' as const },
  { name: 'Gas Doméstico', category: 'Hogar & Servicios', defaultAmount: 450, type: 'service' as const },
  { name: 'Mantenimiento / Condominio', category: 'Hogar & Servicios', defaultAmount: 800, type: 'service' as const },
  { name: 'Gimnasio / Deporte', category: 'Salud & Bienestar', defaultAmount: 600, type: 'service' as const },
  { name: 'Seguro de Auto / Vida', category: 'Seguros', defaultAmount: 900, type: 'service' as const },
];

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6', '#14B8A6'];

export default function SuscripcionesTab({
  recurringBills,
  debts,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onTogglePayBill
}: SuscripcionesTabProps) {
  const [activeModule, setActiveModule] = useState<'all' | 'subscription' | 'service'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<RecurringBillType>('subscription');
  const [amount, setAmount] = useState('');
  const [dueDateDay, setDueDateDay] = useState('15');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'bimonthly' | 'annual'>('monthly');
  const [category, setCategory] = useState('Entretenimiento');
  const [paymentMethodId, setPaymentMethodId] = useState('debit');
  const [notes, setNotes] = useState('');

  // Show auto-dismissing notification toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleOpenAddModal = (presetType: RecurringBillType = 'subscription') => {
    setEditingBillId(null);
    setName('');
    setType(presetType);
    setAmount('');
    setDueDateDay('15');
    setBillingCycle('monthly');
    setCategory(presetType === 'subscription' ? 'Entretenimiento' : 'Hogar & Servicios');
    setPaymentMethodId('debit');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bill: RecurringBill) => {
    setEditingBillId(bill.id);
    setName(bill.name);
    setType(bill.type);
    setAmount(bill.amount.toString());
    setDueDateDay(bill.dueDateDay.toString());
    setBillingCycle(bill.billingCycle || 'monthly');
    setCategory(bill.category || 'Otros');
    setPaymentMethodId(bill.paymentMethodId);
    setNotes(bill.notes || '');
    setIsModalOpen(true);
  };

  const handleSelectPreset = (preset: { name: string; category: string; defaultAmount: number; type: RecurringBillType }) => {
    setName(preset.name);
    setCategory(preset.category);
    setAmount(preset.defaultAmount.toString());
    setType(preset.type);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('Por favor ingresa un nombre y monto válido.');
      return;
    }

    const billData = {
      name: name.trim(),
      type,
      amount: Number(amount),
      dueDateDay: Math.min(31, Math.max(1, Number(dueDateDay) || 15)),
      billingCycle,
      category,
      paymentMethodId,
      status: 'pending' as const,
      notes: notes.trim() || undefined
    };

    if (editingBillId) {
      onUpdateBill(editingBillId, billData);
      showToast(`✅ Se actualizó correctamente el registro de "${billData.name}".`);
    } else {
      onAddBill(billData);
      showToast(`⚡ Se agregó "${billData.name}" a tu control de recurrentes.`);
    }

    setIsModalOpen(false);
  };

  const handleTogglePayWithNotify = (bill: RecurringBill) => {
    onTogglePayBill(bill.id);
    const linkedDebt = debts.find(d => d.id === bill.paymentMethodId);
    if (bill.status === 'pending') {
      if (linkedDebt) {
        showToast(`✅ "${bill.name}" marcado como pagado. Se agregaron $${bill.amount.toLocaleString('es-MX')} al saldo de tu tarjeta "${linkedDebt.nombre}".`);
      } else {
        showToast(`✅ "${bill.name}" marcado como pagado este mes.`);
      }
    } else {
      if (linkedDebt) {
        showToast(`⏳ Se regresó a pendiente. Se restaron $${bill.amount.toLocaleString('es-MX')} del saldo de "${linkedDebt.nombre}".`);
      } else {
        showToast(`⏳ Estado regresado a pendiente.`);
      }
    }
  };

  // Filtrado de registros según pestaña activa y estatus
  const filteredBills = recurringBills.filter(bill => {
    if (activeModule !== 'all' && bill.type !== activeModule) return false;
    if (statusFilter !== 'all' && bill.status !== statusFilter) return false;
    return true;
  });

  // Cálculos financieros / KPIs
  const totalSubscriptionsMonthly = recurringBills
    .filter(b => b.type === 'subscription')
    .reduce((sum, b) => sum + (b.billingCycle === 'annual' ? b.amount / 12 : b.amount), 0);

  const totalServicesMonthly = recurringBills
    .filter(b => b.type === 'service')
    .reduce((sum, b) => sum + (b.billingCycle === 'annual' ? b.amount / 12 : b.amount), 0);

  const totalMonthlyCombined = totalSubscriptionsMonthly + totalServicesMonthly;

  const totalPaidThisMonth = recurringBills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalPendingThisMonth = recurringBills
    .filter(b => b.status === 'pending')
    .reduce((sum, b) => sum + b.amount, 0);

  // Datos para Gráfico de Pastel: Distribución por Tipo y Categoría
  const pieData = [
    { name: '📱 Suscripciones Digitales', value: totalSubscriptionsMonthly },
    { name: '🏠 Servicios & Hogar', value: totalServicesMonthly }
  ].filter(d => d.value > 0);

  // Datos para Gráfico de Barras: Gasto por Tarjeta / Método de pago
  const paymentMethodMap: Record<string, number> = {};
  recurringBills.forEach(b => {
    let label = '💵 Débito / Efectivo';
    if (b.paymentMethodId !== 'cash' && b.paymentMethodId !== 'debit') {
      const debt = debts.find(d => d.id === b.paymentMethodId);
      if (debt) {
        label = `💳 ${debt.nombre}`;
      }
    }
    const monthlyVal = b.billingCycle === 'annual' ? b.amount / 12 : b.amount;
    paymentMethodMap[label] = (paymentMethodMap[label] || 0) + monthlyVal;
  });

  const barData = Object.entries(paymentMethodMap).map(([name, value]) => ({
    name,
    gasto: Math.round(value)
  }));

  const getPaymentMethodLabel = (methodId: string) => {
    if (methodId === 'cash') return '💵 Efectivo';
    if (methodId === 'debit') return '💳 Tarjeta Débito / Cuenta';
    const debt = debts.find(d => d.id === methodId);
    return debt ? `💳 ${debt.nombre}` : '💳 Tarjeta Crédito';
  };

  const getPaymentMethodBadgeColor = (methodId: string) => {
    if (methodId === 'cash' || methodId === 'debit') return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/80 font-semibold';
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-gray-800 flex items-center gap-3 text-xs sm:text-sm font-medium animate-slideUp">
          <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-heading flex items-center gap-2.5">
            <Repeat className="w-6 h-6 text-brand-primary" />
            <span>Suscripciones y Servicios Recurrentes</span>
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Lleva control exacto de tus plataformas de pago (Spotify, ChatGPT, Netflix) y servicios fijos (Luz, Internet, Renta).
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleOpenAddModal(activeModule === 'service' ? 'service' : 'subscription')}
            className="px-4 py-2.5 bg-brand-primary hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Recurrente</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo de Vinculación con Tarjetas de Crédito */}
      <div className="bg-gradient-to-r from-indigo-50 via-emerald-50/50 to-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            ⚡
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-1.5">
              <span>Sincronización Inteligente con tus Tarjetas de Crédito</span>
              <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Automático</span>
            </h4>
            <p className="text-xs text-text-body mt-0.5 leading-relaxed">
              Si asocias un servicio o suscripción a una de tus <strong className="text-indigo-700">Tarjetas de Crédito registradas en Deudas</strong>, al marcar el pago como <strong className="text-emerald-700">"✅ Pagado"</strong> el monto se sumará automáticamente al saldo de esa tarjeta en tu resumen de deudas.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">📱 Suscripciones (Mes)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-text-heading">
              ${Math.round(totalSubscriptionsMonthly).toLocaleString('es-MX')}
            </span>
            <span className="text-[11px] text-text-muted block mt-0.5">
              {recurringBills.filter(b => b.type === 'subscription').length} plataformas activas
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">🏠 Servicios Fijos (Mes)</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-text-heading">
              ${Math.round(totalServicesMonthly).toLocaleString('es-MX')}
            </span>
            <span className="text-[11px] text-text-muted block mt-0.5">
              {recurringBills.filter(b => b.type === 'service').length} servicios del hogar/fijos
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">⏳ Pendientes (Este mes)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-600">
              ${totalPendingThisMonth.toLocaleString('es-MX')}
            </span>
            <span className="text-[11px] text-text-muted block mt-0.5">
              {recurringBills.filter(b => b.status === 'pending').length} cobros por pagar
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">✅ Pagados (Este mes)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-600">
              ${totalPaidThisMonth.toLocaleString('es-MX')}
            </span>
            <span className="text-[11px] text-text-muted block mt-0.5">
              De ${totalMonthlyCombined.toLocaleString('es-MX')} mensual total
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos Recharts */}
      {recurringBills.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfica 1: Distribución por Tarjeta o Método de Pago */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-2xs">
            <h3 className="text-sm font-bold text-text-heading flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-brand-primary" />
              <span>Gasto Mensual por Tarjeta / Método de Pago</span>
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} angle={-15} textAnchor="end" />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString('es-MX')}`, 'Gasto Mensual Estimado']}
                    contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="gasto" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica 2: Suscripciones vs Servicios */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
            <h3 className="text-sm font-bold text-text-heading flex items-center gap-2 mb-4">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              <span>Suscripciones vs Servicios Fijos</span>
            </h3>
            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={6}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => [`$${Math.round(val).toLocaleString('es-MX')} / mes`, 'Monto Mensual']}
                    contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              {pieData.map((d, idx) => (
                <div key={d.name} className="flex items-center gap-1.5 font-semibold text-text-body">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span>{d.name}: ${Math.round(d.value).toLocaleString('es-MX')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Control de Módulos (2 módulos en 1) y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Pestañas de los 2 módulos solicitados por el usuario */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveModule('all')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeModule === 'all'
                ? 'bg-white text-text-heading shadow-xs'
                : 'text-text-muted hover:text-text-body'
            }`}
          >
            📋 Todos ({recurringBills.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('subscription')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeModule === 'subscription'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-text-muted hover:text-text-body'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>📱 Suscripciones ({recurringBills.filter(b => b.type === 'subscription').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('service')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeModule === 'service'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-text-muted hover:text-text-body'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>🏠 Servicios Fijos ({recurringBills.filter(b => b.type === 'service').length})</span>
          </button>
        </div>

        {/* Filtro por Estado (Pendiente vs Pagado) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="w-4 h-4 text-text-muted" />
          <span className="text-xs font-semibold text-text-muted">Estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-text-heading cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">Ver Todos</option>
            <option value="pending">⏳ Solo Pendientes</option>
            <option value="paid">✅ Solo Pagados</option>
          </select>
        </div>
      </div>

      {/* Lista de Registros */}
      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-brand-primary mx-auto flex items-center justify-center">
            <Repeat className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-text-heading">No hay registros en esta sección</h4>
          <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
            Agrega tus suscripciones como Spotify, ChatGPT, ViX, Disney+ o tus pagos de luz, agua e internet para verlos reflejados aquí.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleOpenAddModal(activeModule === 'service' ? 'service' : 'subscription')}
              className="px-5 py-2.5 bg-brand-primary hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Primer Registro</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.map((bill) => {
            const isPaid = bill.status === 'paid';
            const linkedDebt = debts.find(d => d.id === bill.paymentMethodId);

            return (
              <div 
                key={bill.id}
                className={`bg-white rounded-2xl p-5 border transition-all duration-200 shadow-2xs flex flex-col justify-between ${
                  isPaid ? 'border-emerald-200/80 bg-emerald-50/10' : 'border-gray-200/80 hover:border-brand-primary/40'
                }`}
              >
                <div>
                  {/* Categoría y Tipo */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                      bill.type === 'subscription' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                    }`}>
                      {bill.type === 'subscription' ? '📱 Suscripción' : '🏠 Servicio Fijo'}
                    </span>

                    <span className="text-[11px] font-bold text-text-muted bg-gray-100 px-2.5 py-0.5 rounded-full">
                      Día {bill.dueDateDay} del mes
                    </span>
                  </div>

                  {/* Título y Monto */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-extrabold text-text-heading leading-tight">
                        {bill.name}
                      </h4>
                      <span className="text-xs font-semibold text-text-muted mt-0.5 block">
                        {bill.category || 'Varios'} • {bill.billingCycle === 'annual' ? 'Cobro Anual' : bill.billingCycle === 'bimonthly' ? 'Bimestral' : 'Mensual'}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-lg font-extrabold text-text-heading block">
                        ${bill.amount.toLocaleString('es-MX')}
                      </span>
                      <span className="text-[10px] text-text-muted uppercase font-bold block">
                        MXN
                      </span>
                    </div>
                  </div>

                  {/* Método de Pago Asociado */}
                  <div className="mt-4 pt-3 border-t border-gray-100/80 flex items-center justify-between">
                    <span className="text-[11px] text-text-muted font-semibold">Método de cobro:</span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1 ${getPaymentMethodBadgeColor(bill.paymentMethodId)}`}>
                      {getPaymentMethodLabel(bill.paymentMethodId)}
                    </span>
                  </div>

                  {linkedDebt && (
                    <div className="mt-2 bg-indigo-50/70 border border-indigo-100 p-2 rounded-lg text-[10px] text-indigo-900 font-medium flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Al pagar, el monto se suma a tu tarjeta <strong>{linkedDebt.nombre}</strong></span>
                    </div>
                  )}

                  {bill.notes && (
                    <p className="mt-2 text-[11px] text-text-muted bg-gray-50 p-2 rounded-lg italic">
                      "{bill.notes}"
                    </p>
                  )}
                </div>

                {/* Acciones de Estatus y Edición */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePayWithNotify(bill)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-brand-primary text-white hover:bg-emerald-600'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isPaid ? 'text-emerald-700' : 'text-white'}`} />
                    <span>{isPaid ? '✅ Pagado (Clic para pendiente)' : '⏳ Marcar como Pagado'}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(bill)}
                      className="p-2 rounded-lg text-gray-400 hover:text-brand-primary hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Editar registro"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Estás seguro de eliminar el registro de "${bill.name}"?`)) {
                          onDeleteBill(bill.id);
                        }
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Formulario para Agregar o Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg sm:text-xl font-extrabold text-text-heading flex items-center gap-2">
                {editingBillId ? <Edit3 className="w-5 h-5 text-brand-primary" /> : <Plus className="w-5 h-5 text-brand-primary" />}
                <span>{editingBillId ? 'Editar Recurrente' : 'Nuevo Pago / Suscripción'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Sugerencias rápidas solo si es nuevo registro */}
            {!editingBillId && (
              <div className="mb-6 space-y-2 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/60">
                <span className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider block">
                  ⚡ Plantillas Rápidas con 1 Clic:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {(type === 'subscription' ? PRESET_SUBSCRIPTIONS : PRESET_SERVICES).map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-gray-200 rounded-lg text-xs font-semibold text-text-body transition-all cursor-pointer shadow-2xs"
                    >
                      + {p.name} (${p.defaultAmount})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo: Suscripción o Servicio */}
              <div>
                <label className="block text-xs font-bold text-text-heading mb-1.5">Tipo de Registro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('subscription')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      type === 'subscription'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-text-muted border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Tv className="w-4 h-4" />
                    <span>📱 Suscripción Digital</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('service')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      type === 'service'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-text-muted border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span>🏠 Servicio Fijo / Hogar</span>
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-text-heading mb-1">
                  Nombre del Servicio o Suscripción *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Spotify, Luz CFE, ChatGPT, Internet Infinitum..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Monto y Día de Vencimiento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-heading mb-1">
                    Monto Aprox. (MXN) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      required
                      step="any"
                      min="1"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-heading mb-1">
                    Día de Cobro (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDateDay}
                    onChange={(e) => setDueDateDay(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Periodicidad y Categoría */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-heading mb-1">
                    Periodicidad
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                  >
                    <option value="monthly">📅 Mensual (Cada mes)</option>
                    <option value="bimonthly">📅 Bimestral (Luz, Agua)</option>
                    <option value="annual">📆 Anual (Seguros, Amazon)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-heading mb-1">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                  >
                    <option value="Entretenimiento">🎬 Entretenimiento</option>
                    <option value="IA & Software">🤖 IA & Software</option>
                    <option value="Hogar & Servicios">🏠 Hogar & Servicios</option>
                    <option value="Telecomunicaciones">📡 Telecomunicaciones</option>
                    <option value="Salud & Bienestar">💪 Salud & Bienestar</option>
                    <option value="Seguros">🛡️ Seguros & Auto</option>
                    <option value="Otros">💡 Otros</option>
                  </select>
                </div>
              </div>

              {/* MÉTODO DE PAGO CON TARJETAS DE CRÉDITO DEL USUARIO */}
              <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-200/80">
                <label className="block text-xs font-bold text-indigo-950 mb-1 flex items-center justify-between">
                  <span>💳 ¿Con qué Tarjeta o Método se paga?</span>
                  <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-full font-extrabold border border-indigo-200">Clave</span>
                </label>
                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-extrabold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                >
                  <option value="debit">💵 Tarjeta de Débito / Transferencia / Efectivo</option>
                  {debts.length > 0 && (
                    <optgroup label="✨ Tus Tarjetas de Crédito Registradas en Deudas:">
                      {debts.map((d) => (
                        <option key={d.id} value={d.id}>
                          💳 {d.nombre} (Saldo actual: ${d.actual.toLocaleString('es-MX')})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-indigo-900 mt-1.5 font-medium">
                  💡 Si seleccionas una de tus tarjetas de crédito, cuando marques este servicio como pagado se sumará automáticamente al saldo de esa deuda.
                </p>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="block text-xs font-bold text-text-heading mb-1">
                  Notas o Comentarios (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. Plan familiar de 4 pantallas, incluye HBO..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-heading font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-primary hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {editingBillId ? 'Guardar Cambios' : 'Añadir Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
