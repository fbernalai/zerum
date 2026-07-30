import React, { useState } from 'react';
import { Expense, Debt } from '../types';
import { formatMXN, getLocalTodayDateString } from '../utils/finance';
import { Plus, X, ShoppingBag, Car, Home, Zap, Smile, Heart, Landmark, HelpCircle, CreditCard } from 'lucide-react';

interface GastosTabProps {
  expenses: Expense[];
  debts?: Debt[];
  onAddExpense: (expense: Omit<Expense, 'id'>, opcional?: { deudaId?: string; esMSI?: boolean; mesesMSI?: number }) => void;
  onDeleteExpense: (id: string) => void;
}

const CATEGORY_META: { [cat: string]: { label: string; bg: string; text: string; icon: React.ReactNode } } = {
  'Comida': { label: 'Comida', bg: 'bg-blue-50 border-blue-100', text: 'text-brand-primary', icon: <ShoppingBag className="w-4 h-4" /> },
  'Transporte': { label: 'Transporte', bg: 'bg-cyan-50 border-cyan-100', text: 'text-accent-info', icon: <Car className="w-4 h-4" /> },
  'Vivienda': { label: 'Vivienda', bg: 'bg-amber-50 border-amber-100', text: 'text-accent-warning', icon: <Home className="w-4 h-4" /> },
  'Servicios': { label: 'Servicios', bg: 'bg-emerald-50 border-emerald-100', text: 'text-accent-success', icon: <Zap className="w-4 h-4" /> },
  'Entretenimiento': { label: 'Entretenimiento', bg: 'bg-purple-50 border-purple-100', text: 'text-purple-600', icon: <Smile className="w-4 h-4" /> },
  'Salud': { label: 'Salud', bg: 'bg-red-50 border-red-100', text: 'text-accent-danger', icon: <Heart className="w-4 h-4" /> },
  'Pago de deuda': { label: 'Pago de deuda', bg: 'bg-pink-50 border-pink-100', text: 'text-pink-600', icon: <Landmark className="w-4 h-4" /> },
  'Otro': { label: 'Otro', bg: 'bg-gray-50 border-gray-100', text: 'text-gray-500', icon: <HelpCircle className="w-4 h-4" /> }
};

export default function GastosTab({ expenses, debts = [], onAddExpense, onDeleteExpense }: GastosTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categoria, setCategoria] = useState('Comida');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(() => getLocalTodayDateString());
  const [nota, setNota] = useState('');
  
  // New debt linking states
  const [deudaVinculada, setDeudaVinculada] = useState('');
  const [esMSI, setEsMSI] = useState(false);
  const [mesesMSI, setMesesMSI] = useState('6');

  const tarjetasCredito = debts.filter(d => d.tipo === 'Tarjeta de crédito');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || !fecha) return;

    onAddExpense(
      {
        categoria,
        monto: parseFloat(monto) || 0,
        fecha,
        nota: nota.trim()
      },
      {
        deudaId: deudaVinculada || undefined,
        esMSI: deudaVinculada ? esMSI : false,
        mesesMSI: (deudaVinculada && esMSI) ? parseInt(mesesMSI) || 6 : undefined
      }
    );

    setCategoria('Comida');
    setMonto('');
    setNota('');
    setFecha(getLocalTodayDateString());
    setDeudaVinculada('');
    setEsMSI(false);
    setMesesMSI('6');
    setIsOpen(false);
  };


  const getCatMeta = (cat: string) => {
    return CATEGORY_META[cat] || CATEGORY_META['Otro'];
  };

  // Sort expenses newest first
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-heading tracking-tight">
            Tus gastos
          </h2>
          <p className="text-xs text-text-muted font-medium mt-0.5">
            Mantén registro de en qué se va tu dinero quincena a quincena.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-contrast rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {isOpen ? 'Cerrar Formulario' : 'Agregar Gasto'}
        </button>
      </div>

      {/* Add Expense Form Container */}
      {isOpen && (
        <form 
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-pronounced border border-gray-100 space-y-4 animate-fadeIn"
        >
          <h3 className="text-sm font-bold text-text-heading uppercase tracking-wider border-b border-gray-50 pb-2">
            Nuevo Gasto
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Categoría */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-primary font-medium"
              >
                <option>Comida</option>
                <option>Transporte</option>
                <option>Vivienda</option>
                <option>Servicios</option>
                <option>Entretenimiento</option>
                <option>Salud</option>
                <option>Pago de deuda</option>
                <option>Otro</option>
              </select>
            </div>

            {/* Monto */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Monto
              </label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Monto gastado $"
                required
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
              />
            </div>

            {/* Fecha */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Fecha de Compra
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-medium"
              />
            </div>

            {/* Nota */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Nota / Descripción (Opcional)
              </label>
              <input
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej. Súper de la quincena"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-medium"
              />
            </div>
          </div>

          {/* Opcional: Vincular a Tarjeta de Crédito y Meses Sin Intereses */}
          {tarjetasCredito.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="bg-pastel-blue/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-bold text-text-heading">
                    Vincular a una Tarjeta de Crédito (Opcional)
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Si este gasto fue hecho con alguna de tus tarjetas de crédito registradas, el monto se sumará en automático a la deuda adeudada.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Seleccionar Tarjeta de Crédito
                    </label>
                    <select
                      value={deudaVinculada}
                      onChange={(e) => {
                        setDeudaVinculada(e.target.value);
                        if (!e.target.value) setEsMSI(false);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-brand-primary font-medium"
                    >
                      <option value="">-- Ninguna (Pago al contado/débito) --</option>
                      {tarjetasCredito.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre} ({d.tipo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {deudaVinculada && (
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="checkMSI"
                        checked={esMSI}
                        onChange={(e) => setEsMSI(e.target.checked)}
                        className="w-4 h-4 text-brand-primary rounded border-gray-300 focus:ring-brand-primary cursor-pointer"
                      />
                      <label htmlFor="checkMSI" className="text-xs font-bold text-text-heading cursor-pointer select-none">
                        ¿Compra a Meses Sin Intereses (MSI)?
                      </label>
                    </div>
                  )}

                  {deudaVinculada && esMSI && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        ¿A cuántos meses?
                      </label>
                      <select
                        value={mesesMSI}
                        onChange={(e) => setMesesMSI(e.target.value)}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-brand-primary font-medium"
                      >
                        <option value="3">3 meses</option>
                        <option value="6">6 meses</option>
                        <option value="9">9 meses</option>
                        <option value="12">12 meses</option>
                        <option value="18">18 meses</option>
                        <option value="24">24 meses</option>
                        <option value="36">36 meses</option>
                        <option value="48">48 meses</option>
                        <option value="60">60 meses</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setMonto('');
                setNota('');
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text-muted bg-gray-100 hover:bg-gray-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-contrast rounded-xl text-xs font-semibold tracking-wide cursor-pointer shadow-sm"
            >
              Guardar Gasto
            </button>
          </div>
        </form>
      )}

      {/* Expense Ledger Rows */}
      <div className="space-y-3">
        {sortedExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200 shadow-card-default">
            <p className="text-sm text-text-muted italic leading-relaxed">
              Aún no registras gastos este mes. Agrega tus gastos diarios para ver la distribución en tu resumen.
            </p>
          </div>
        ) : (
          sortedExpenses.map((g) => {
            const meta = getCatMeta(g.categoria);
            
            // Format nice date
            const dateObj = new Date(g.fecha + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div 
                key={g.id}
                className="bg-white rounded-xl p-4 shadow-card-default border border-gray-50 flex items-center justify-between gap-4 hover:translate-y-[-1px] transition-all duration-150"
              >
                {/* Left side details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.text} border`}>
                    {meta.icon}
                  </div>
                  
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-text-heading truncate">
                      {g.nota || meta.label}
                    </h4>
                    <p className="text-[11px] text-text-muted font-medium mt-0.5 flex items-center gap-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${meta.text}`} style={{ backgroundColor: 'currentColor' }}></span>
                      {meta.label} · {formattedDate}
                    </p>
                  </div>
                </div>

                {/* Right side amount & delete */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold font-mono text-text-heading">
                    {formatMXN(g.monto, 2)}
                  </span>
                  
                  <button
                    onClick={() => onDeleteExpense(g.id)}
                    className="w-7 h-7 rounded-full border border-gray-100 bg-white hover:bg-pastel-red/50 hover:border-accent-danger hover:text-accent-danger text-text-muted transition-all duration-150 flex items-center justify-center cursor-pointer shadow-sm"
                    title="Eliminar Gasto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
