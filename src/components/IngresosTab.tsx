import React, { useState } from 'react';
import { Income, RecurringIncome } from '../types';
import { formatMXN, getLocalTodayDateString } from '../utils/finance';
import { Plus, X, Calendar, Wallet, Award, TrendingUp, CheckCircle2, DollarSign, Clock } from 'lucide-react';

interface IngresosTabProps {
  recurring: RecurringIncome | null;
  onSaveRecurring: (rec: RecurringIncome) => void;
  incomes: Income[];
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onDeleteIncome: (id: string) => void;
}

export default function IngresosTab({ 
  recurring, 
  onSaveRecurring, 
  incomes, 
  onAddIncome, 
  onDeleteIncome 
}: IngresosTabProps) {
  // Selector de tipo principal: 'sueldo' o 'otro'
  const [tipoIngreso, setTipoIngreso] = useState<'sueldo' | 'otro'>('sueldo');

  // Recurring salary inputs
  const [frecuenciaSueldo, setFrecuenciaSueldo] = useState<'quincenal' | 'mensual'>(
    recurring && recurring.dia2 === null ? 'mensual' : 'quincenal'
  );
  const [fuenteRec, setFuenteRec] = useState(recurring?.fuente || 'Sueldo');
  const [montoRec, setMontoRec] = useState(recurring?.monto?.toString() || '4800');
  const [dia1Rec, setDia1Rec] = useState(recurring?.dia1?.toString() || '14');
  const [dia2Rec, setDia2Rec] = useState(recurring?.dia2?.toString() || '28');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Manual extra income inputs
  const [fuenteMan, setFuenteMan] = useState('');
  const [tipoMan, setTipoMan] = useState<'Fijo' | 'Variable'>('Fijo');
  const [montoMan, setMontoMan] = useState('');
  const [fechaMan, setFechaMan] = useState(() => getLocalTodayDateString());

  const handleSaveRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    const montoVal = parseFloat(montoRec) || 0;
    const dia1Val = parseInt(dia1Rec) || null;
    const dia2Val = frecuenciaSueldo === 'quincenal' ? (parseInt(dia2Rec) || null) : null;

    onSaveRecurring({
      fuente: fuenteRec.trim() || 'Sueldo',
      monto: montoVal,
      dia1: dia1Val,
      dia2: dia2Val
    });

    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2500);
  };

  const handleAddManualIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuenteMan || !montoMan || !fechaMan) return;

    onAddIncome({
      fuente: fuenteMan.trim(),
      tipo: tipoMan,
      monto: parseFloat(montoMan) || 0,
      fecha: fechaMan
    });

    setFuenteMan('');
    setMontoMan('');
    setFechaMan(getLocalTodayDateString());
    setTipoMan('Fijo');
  };

  // Next paycheck display text
  const renderNextPaycheckText = () => {
    if (!recurring || !recurring.monto || (!recurring.dia1 && !recurring.dia2)) {
      return 'Configura tu sueldo arriba para que el sistema calcule tu flujo automáticamente.';
    }
    const hoy = new Date();
    const isMensual = recurring.dia2 === null;
    
    if (isMensual) {
      const dia = recurring.dia1 || 1;
      return `Próximo pago automático mensual: día ${dia} · ${formatMXN(recurring.monto)} al mes.`;
    } else {
      const dias = [recurring.dia1, recurring.dia2].filter((d): d is number => d !== null).sort((a, b) => a - b);
      if (dias.length === 0) return 'Configura tus días de sueldo quincenal.';
      const proximoDia = dias.find(d => d > hoy.getDate()) || dias[0];
      const totalMes = recurring.monto * 2;
      return `Próximo pago automático quincenal: día ${proximoDia} · ${formatMXN(recurring.monto)} por quincena (${formatMXN(totalMes)} al mes).`;
    }
  };

  const sortedIncomes = [...incomes].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-heading tracking-tight flex items-center gap-2">
          <Wallet className="w-6 h-6 text-brand-primary" />
          <span>Gestión de Ingresos</span>
        </h2>
        <p className="text-xs text-text-muted font-medium mt-0.5">
          Configura tu sueldo recurrente (quincenal o mensual) y registra otros ingresos o extras en el mes.
        </p>
      </div>

      {/* Selector Principal: Sueldo vs Otro Ingreso */}
      <div className="bg-white rounded-2xl p-6 shadow-card-default border border-gray-100 space-y-6">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-2.5">
            1. Selecciona el Tipo de Ingreso que Deseas Registrar o Configurar
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipoIngreso('sueldo')}
              className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all border cursor-pointer ${
                tipoIngreso === 'sueldo'
                  ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                  : 'bg-gray-50 text-text-body border-gray-200/80 hover:bg-gray-100'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Sueldo Fijo (Quincenal / Mensual)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTipoIngreso('otro');
                setFechaMan(getLocalTodayDateString());
              }}
              className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all border cursor-pointer ${
                tipoIngreso === 'otro'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-gray-50 text-text-body border-gray-200/80 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Otro Ingreso (Freelance, Bono, Venta)</span>
            </button>
          </div>
        </div>

        {/* TAB 1: FORMULARIO SUELDO RECURRENTE */}
        {tipoIngreso === 'sueldo' && (
          <div className="pt-4 border-t border-gray-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-text-heading">Configuración de Sueldo Regular</h3>
              <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200 text-xs font-bold">
                <span className="pl-2 text-text-muted">Frecuencia de Pago:</span>
                <button
                  type="button"
                  onClick={() => setFrecuenciaSueldo('quincenal')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    frecuenciaSueldo === 'quincenal' ? 'bg-brand-primary text-white shadow-2xs' : 'text-text-body hover:bg-gray-200/60'
                  }`}
                >
                  Quincenal (2 pagos)
                </button>
                <button
                  type="button"
                  onClick={() => setFrecuenciaSueldo('mensual')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    frecuenciaSueldo === 'mensual' ? 'bg-brand-primary text-white shadow-2xs' : 'text-text-body hover:bg-gray-200/60'
                  }`}
                >
                  Mensual (1 pago)
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveRecurring} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Nombre o Fuente
                </label>
                <input
                  type="text"
                  value={fuenteRec}
                  onChange={(e) => setFuenteRec(e.target.value)}
                  placeholder="Ej. Nómina Principal"
                  required
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  {frecuenciaSueldo === 'quincenal' ? 'Monto por Quincena ($)' : 'Monto Mensual ($)'}
                </label>
                <input
                  type="number"
                  value={montoRec}
                  onChange={(e) => setMontoRec(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  placeholder="Ej. 6500"
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-bold text-emerald-600"
                />
              </div>

              {frecuenciaSueldo === 'quincenal' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Día de Pago 1 (1 al 31)
                    </label>
                    <input
                      type="number"
                      value={dia1Rec}
                      onChange={(e) => setDia1Rec(e.target.value)}
                      min="1"
                      max="31"
                      required
                      placeholder="Ej. 15"
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Día de Pago 2 (1 al 31)
                    </label>
                    <input
                      type="number"
                      value={dia2Rec}
                      onChange={(e) => setDia2Rec(e.target.value)}
                      min="1"
                      max="31"
                      required
                      placeholder="Ej. 30"
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Día de Pago del Mes (1 al 31)
                  </label>
                  <input
                    type="number"
                    value={dia1Rec}
                    onChange={(e) => setDia1Rec(e.target.value)}
                    min="1"
                    max="31"
                    required
                    placeholder="Ej. 1 o 15"
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
                  />
                </div>
              )}

              <div className="lg:col-span-4 flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-contrast rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer shadow-sm flex items-center gap-2"
                >
                  {showSaveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>¡Sueldo Guardado!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar Configuración de Sueldo</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-xs text-text-muted font-medium flex items-center gap-2 bg-pastel-blue/30 px-4 py-3 rounded-xl border border-pastel-blue/30 mt-4">
              <Calendar className="w-4 h-4 text-brand-primary shrink-0" />
              <span>{renderNextPaycheckText()}</span>
            </div>
          </div>
        )}

        {/* TAB 2: FORMULARIO OTRO INGRESO MANUAL */}
        {tipoIngreso === 'otro' && (
          <form onSubmit={handleAddManualIncome} className="pt-4 border-t border-gray-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-heading flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Registrar Ingreso Adicional, Freelance o Bono</span>
              </h3>
              <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/60 font-mono">
                Fecha hoy por defecto
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Nombre Específico / Fuente
                </label>
                <input
                  type="text"
                  value={fuenteMan}
                  onChange={(e) => setFuenteMan(e.target.value)}
                  placeholder="Ej. Freelance diseño, Venta auto"
                  required
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Tipo de Ingreso
                </label>
                <select
                  value={tipoMan}
                  onChange={(e) => setTipoMan(e.target.value as 'Fijo' | 'Variable')}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-primary font-medium"
                >
                  <option value="Variable">Variable</option>
                  <option value="Fijo">Fijo</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Monto ($)
                </label>
                <input
                  type="number"
                  value={montoMan}
                  onChange={(e) => setMontoMan(e.target.value)}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-bold text-emerald-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={fechaMan}
                  onChange={(e) => setFechaMan(e.target.value)}
                  required
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Registrar Ingreso en el Mes</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Historial de Ingresos Registrados */}
      <div className="bg-white rounded-2xl p-6 shadow-card-default border border-gray-100 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-text-heading uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            <span>Historial de Ingresos Registrados en el Mes ({sortedIncomes.length})</span>
          </h3>
          <span className="text-xs font-mono font-bold text-emerald-600">
            Total: {formatMXN(sortedIncomes.reduce((acc, i) => acc + i.monto, 0))}
          </span>
        </div>

        <div className="space-y-3">
          {sortedIncomes.length === 0 ? (
            <div className="py-10 text-center text-text-muted text-xs bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              Aún no hay ingresos registrados este mes. Si configuraste tu sueldo, se acreditará automáticamente en las fechas fijadas, o agrega ingresos manuales arriba.
            </div>
          ) : (
            sortedIncomes.map((i) => {
              const isFijo = i.tipo === 'Fijo';
              const dateObj = new Date(i.fecha + 'T00:00:00');
              const formattedDate = dateObj.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div 
                  key={i.id}
                  className="bg-white rounded-xl p-4 shadow-2xs border border-gray-100 flex items-center justify-between gap-4 hover:border-gray-200 transition-all duration-150"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                      isFijo 
                        ? 'bg-emerald-50 border-emerald-100 text-accent-success' 
                        : 'bg-amber-50 border-amber-100 text-accent-warning'
                    }`}>
                      {isFijo ? <Award className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    </div>
                    
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-text-heading truncate">
                        {i.fuente}
                      </h4>
                      <p className="text-[11px] text-text-muted font-medium mt-0.5 flex items-center gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${isFijo ? 'bg-accent-success' : 'bg-accent-warning'}`}></span>
                        <span>Ingreso {i.tipo}</span>
                        <span>·</span>
                        <span className="font-mono">{formattedDate}</span>
                        {i.auto && (
                          <span className="text-[9px] bg-emerald-50 text-accent-success font-semibold border border-accent-success/20 px-1.5 py-0.5 rounded font-mono">
                            Automático
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold font-mono text-emerald-600">
                      +{formatMXN(i.monto, 2)}
                    </span>
                    
                    <button
                      onClick={() => onDeleteIncome(i.id)}
                      className="w-7 h-7 rounded-full border border-gray-100 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-text-muted transition-all duration-150 flex items-center justify-center cursor-pointer shadow-2xs"
                      title="Eliminar Ingreso"
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
    </div>
  );
}
