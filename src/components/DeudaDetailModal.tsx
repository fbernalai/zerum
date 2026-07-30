import React, { useState } from 'react';
import { Debt, DebtPayment } from '../types';
import { formatMXN, getMontoElegido, mesesParaPagar, getLocalTodayDateString } from '../utils/finance';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  TrendingDown, 
  Clock, 
  Sparkles, 
  Award, 
  CreditCard, 
  Car, 
  Smartphone, 
  Building2, 
  HelpCircle, 
  Plus, 
  Trash2, 
  PieChart, 
  Info, 
  Zap,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';

interface DeudaDetailModalProps {
  deuda: Debt;
  payments: DebtPayment[];
  onClose: () => void;
  onAddPayment?: (payment: Omit<DebtPayment, 'id'>) => void;
  onDeletePayment?: (id: string) => void;
}

export default function DeudaDetailModal({
  deuda,
  payments,
  onClose,
  onAddPayment,
  onDeletePayment
}: DeudaDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'estrategia' | 'abonos' | 'plazo'>('resumen');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    diagnostico: string;
    recomendacionPago: string;
    proyeccionCierre: string;
    alertaEspecial: string;
  } | null>(null);

  // Quick add payment form inside modal
  const [showPayForm, setShowPayForm] = useState(false);
  const [payMonto, setPayMonto] = useState(() => {
    const sug = getMontoElegido(deuda);
    return sug > 0 ? sug.toString() : '';
  });
  const [payFecha, setPayFecha] = useState(() => getLocalTodayDateString());
  const [payNota, setPayNota] = useState('');

  // Filter payments for this specific debt
  const misAbonos = payments.filter(p => p.deudaId === deuda.id || p.deudaNombre === deuda.nombre);
  const totalPagadoEnEstaDeuda = misAbonos.reduce((acc, p) => acc + p.monto, 0);

  // Calculations
  const originalSaldo = deuda.inicial || (deuda.actual + totalPagadoEnEstaDeuda);
  const avancePct = originalSaldo > 0 ? Math.min(100, Math.max(0, ((originalSaldo - deuda.actual) / originalSaldo) * 100)) : 0;
  
  const montoDesembolsoElegido = getMontoElegido(deuda);
  const mesesAprox = mesesParaPagar(deuda.actual, deuda.tasa || 0, montoDesembolsoElegido > 0 ? montoDesembolsoElegido : deuda.pago);
  
  // Calculate projected total to pay (principal + interest)
  const r = ((deuda.tasa || 0) / 100) / 12;
  let interesEstimado = 0;
  if (r > 0 && mesesAprox !== Infinity && mesesAprox > 0) {
    // Rough simulation of total interest over remaining months
    let saldoSim = deuda.actual;
    const pagoSim = montoDesembolsoElegido > 0 ? montoDesembolsoElegido : deuda.pago;
    let limit = 0;
    while (saldoSim > 0.5 && limit < 300) {
      limit++;
      const int = saldoSim * r;
      interesEstimado += int;
      saldoSim = saldoSim + int - Math.min(saldoSim + int, pagoSim);
    }
  }
  const totalProyectado = deuda.actual + interesEstimado;

  // Icon selector by debt type
  const getIcon = () => {
    switch (deuda.tipo) {
      case 'Tarjeta de crédito': return <CreditCard className="w-6 h-6 text-purple-600" />;
      case 'Crédito de auto': return <Car className="w-6 h-6 text-blue-600" />;
      case 'Préstamo de app': return <Smartphone className="w-6 h-6 text-teal-600" />;
      case 'Préstamo personal': return <Building2 className="w-6 h-6 text-amber-600" />;
      default: return <DollarSign className="w-6 h-6 text-emerald-600" />;
    }
  };

  const getBgColor = () => {
    switch (deuda.tipo) {
      case 'Tarjeta de crédito': return 'bg-purple-50 border-purple-100';
      case 'Crédito de auto': return 'bg-blue-50 border-blue-100';
      case 'Préstamo de app': return 'bg-teal-50 border-teal-100';
      case 'Préstamo personal': return 'bg-amber-50 border-amber-100';
      default: return 'bg-emerald-50 border-emerald-100';
    }
  };

  const generateHeuristicAnalysis = () => {
    const isMSI = deuda.tasa === 0;
    const esAltoCat = (deuda.tasa || 0) > 35;
    const mesesRest = mesesAprox === Infinity ? 'Más de 10 años (pago insuficiente)' : `${mesesAprox} meses`;
    
    let diag = `Has liquidado un ${avancePct.toFixed(1)}% de tu deuda inicial (${formatMXN(originalSaldo)}). Actualmente te restan ${formatMXN(deuda.actual)} por cubrir.`;
    if (misAbonos.length > 0) {
      diag += ` Llevas un excelente ritmo con ${misAbonos.length} abonos registrados por un total de ${formatMXN(totalPagadoEnEstaDeuda)}.`;
    } else {
      diag += ` Aún no tienes abonos registrados en el sistema para esta cuenta.`;
    }

    let rec = `Te recomendamos programar abonos quincenales por al menos la mitad del pago elegido (${formatMXN(montoDesembolsoElegido > 0 ? montoDesembolsoElegido / 2 : deuda.pago / 2)}) unos días antes de tu día límite (Día ${deuda.diaLimite || 15}).`;
    if (deuda.pagoNoInteres > deuda.pago && montoDesembolsoElegido < deuda.pagoNoInteres) {
      rec = `Para evitar intereses rotativos en tu tarjeta, tu meta prioritaria debe ser subir tu pago al monto de "No generar intereses" (${formatMXN(deuda.pagoNoInteres)}). Actualmente estás pagando menos, lo que capitaliza intereses.`;
    } else if (esAltoCat) {
      rec = `Esta cuenta tiene una tasa elevada (${deuda.tasa}%). Conviene destinar aquí cualquier ingreso extra (bonos o aguinaldo) para reducir el capital aceleradamente mediante la estrategia Avalancha.`;
    }

    let proy = `Manteniendo tu aportación seleccionada en el Planeador de Desembolsos (${formatMXN(montoDesembolsoElegido > 0 ? montoDesembolsoElegido : deuda.pago)} al mes), liquidarás tu saldo en aproximadamente ${mesesRest}.`;
    if (interesEstimado > 0) {
      proy += ` Se estima que pagarás alrededor de ${formatMXN(interesEstimado)} en intereses durante este tiempo.`;
    } else if (isMSI) {
      proy += ` Al ser 0% interés (MSI), todo tu pago va 100% directo a reducir tu capital adeudado.`;
    }

    let alert = `Día límite de pago fijado los días ${deuda.diaLimite || 15} de cada mes. ¡Configura una alarma en tu calendario 3 días antes para evitar comisiones por pago tardío!`;
    if (esAltoCat) {
      alert = `¡ALERTA CAT ALTO! Una tasa de ${deuda.tasa}% genera aprox. ${formatMXN((deuda.actual * ((deuda.tasa || 0) / 100)) / 12)} de interés en un solo mes si solo cubres el mínimo.`;
    } else if (deuda.limiteCredito && deuda.limiteCredito > 0) {
      const usoPct = ((deuda.actual / deuda.limiteCredito) * 100).toFixed(0);
      alert = `Estás utilizando el ${usoPct}% de tu límite de crédito (${formatMXN(deuda.limiteCredito)}). Mantener el uso debajo del 30% mejora tu calificación en Buró de Crédito.`;
    }

    return { diagnostico: diag, recomendacionPago: rec, proyeccionCierre: proy, alertaEspecial: alert };
  };

  const handleRunAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      const response = await fetch('/api/analyze-debt-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debt: deuda, payments: misAbonos })
      });
      const resData = await response.json();
      if (resData.success && resData.data && resData.data.diagnostico) {
        setAiAnalysis(resData.data);
      } else {
        setAiAnalysis(generateHeuristicAnalysis());
      }
    } catch (err) {
      console.warn("Falling back to heuristic debt analysis:", err);
      setAiAnalysis(generateHeuristicAnalysis());
    } finally {
      setLoadingAi(false);
    }
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(payMonto);
    if (!val || val <= 0 || !onAddPayment) return;
    
    onAddPayment({
      deudaId: deuda.id,
      deudaNombre: deuda.nombre,
      monto: val,
      fecha: payFecha,
      nota: payNota.trim() || `Abono a ${deuda.nombre}`
    });

    setPayMonto('');
    setPayNota('');
    setShowPayForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        
        {/* Header Drawer Banner */}
        <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${getBgColor()} flex items-center justify-center border shadow-md shrink-0`}>
              {getIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-brand-primary-light border border-white/10">
                  {deuda.tipo}
                </span>
                {deuda.tasa === 0 ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    0% Interés (MSI)
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Tasa: {deuda.tasa}%
                  </span>
                )}
                {deuda.mesesPlazo && deuda.mesesPlazo > 0 && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Plazo: {deuda.mesesPlazo} meses
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mt-1.5 tracking-tight text-white">
                {deuda.nombre}
              </h2>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigators */}
        <div className="flex border-b border-gray-100 bg-gray-50/80 px-6 pt-2 gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'resumen'
                ? 'border-brand-primary text-brand-primary bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-text-muted hover:text-text-body'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Resumen y Avance</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('estrategia');
              if (!aiAnalysis) handleRunAiAnalysis();
            }}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'estrategia'
                ? 'border-brand-primary text-brand-primary bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-text-muted hover:text-text-body'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Recomendación IA y Estrategia</span>
          </button>

          <button
            onClick={() => setActiveTab('abonos')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'abonos'
                ? 'border-brand-primary text-brand-primary bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-text-muted hover:text-text-body'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Historial de Abonos ({misAbonos.length})</span>
          </button>

          {(deuda.mesesPlazo || deuda.mensualidadesPersonalizadas || (deuda.listaMensualidades && deuda.listaMensualidades.length > 0) || (deuda.comprasMeses && deuda.comprasMeses.length > 0)) && (
            <button
              onClick={() => setActiveTab('plazo')}
              className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'plazo'
                  ? 'border-brand-primary text-brand-primary bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-text-muted hover:text-text-body'
              }`}
            >
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Plazos y MSI</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: RESUMEN Y AVANCE */}
          {activeTab === 'resumen' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Progress Tape Bar */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-card-default space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-text-muted">
                      Avance de Liquidación
                    </span>
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-600 mt-0.5">
                      {avancePct.toFixed(1)}% <span className="text-xs font-sans font-semibold text-text-muted">pagado</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs text-text-muted block">Por Cubrir / Saldo Actual</span>
                    <span className="text-xl font-bold text-accent-danger">{formatMXN(deuda.actual)}</span>
                  </div>
                </div>

                {/* Bar */}
                <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-0.5 border border-gray-200/80 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 via-teal-500 to-brand-primary h-full rounded-full transition-all duration-700"
                    style={{ width: `${avancePct}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs font-mono text-text-muted pt-1">
                  <span>Monto Inicial: {formatMXN(originalSaldo)}</span>
                  <span>Ya Pagado: {formatMXN(totalPagadoEnEstaDeuda)}</span>
                </div>
              </div>

              {/* Grid 4 Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Pago Mínimo</span>
                  <span className="text-base font-mono font-bold text-text-heading mt-1 block">
                    {formatMXN(deuda.pago)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Para No Intereses</span>
                  <span className="text-base font-mono font-bold text-emerald-600 mt-1 block">
                    {deuda.pagoNoInteres ? formatMXN(deuda.pagoNoInteres) : 'N/A'}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Día Límite Pago</span>
                  <span className="text-base font-mono font-bold text-brand-primary mt-1 block">
                    {deuda.diaLimite ? `Día ${deuda.diaLimite}` : 'No definido'}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Día de Corte</span>
                  <span className="text-base font-mono font-bold text-purple-600 mt-1 block">
                    {deuda.diaCorte ? `Día ${deuda.diaCorte}` : 'No aplica'}
                  </span>
                </div>
              </div>

              {/* Planeador & Proyección Box */}
              <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-indigo-950">
                      Proyección y Cierre con tu Planeador de Desembolsos
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white text-indigo-700 px-3 py-1 rounded-full border border-indigo-200 shadow-2xs">
                    Monto Elegido este mes: {formatMXN(montoDesembolsoElegido)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                    <span className="font-bold text-text-heading block mb-1">Tiempo Estimado para Liquidar:</span>
                    <span className="font-mono text-base font-bold text-indigo-600">
                      {mesesAprox === Infinity ? 'Pago insuficiente para cubrir intereses' : `${mesesAprox} meses aprox.`}
                    </span>
                    <p className="text-[11px] text-text-muted mt-1">
                      A este ritmo con el monto seleccionado en tu Planeador de Desembolsos.
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                    <span className="font-bold text-text-heading block mb-1">Total Proyectado (Capital + Interés):</span>
                    <span className="font-mono text-base font-bold text-accent-danger">
                      {formatMXN(totalProyectado)}
                    </span>
                    <p className="text-[11px] text-text-muted mt-1">
                      {interesEstimado > 0 
                        ? `Incluye aprox. ${formatMXN(interesEstimado)} de costo por intereses generados en el plazo.` 
                        : 'Deuda a 0% de interés o pago directo sin costo financiero adicional.'}
                    </p>
                  </div>
                </div>

                {deuda.limiteCredito && deuda.limiteCredito > 0 && (
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-text-heading">Límite de Crédito de la Tarjeta:</span>
                      <span className="text-text-muted ml-2 font-mono">{formatMXN(deuda.limiteCredito)}</span>
                    </div>
                    <span className={`font-bold font-mono px-2.5 py-0.5 rounded-full text-[11px] ${
                      deuda.actual / deuda.limiteCredito > 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      Uso: {((deuda.actual / deuda.limiteCredito) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Add Payment Button inside Modal */}
              {onAddPayment && (
                <div className="pt-2">
                  {!showPayForm ? (
                    <button
                      type="button"
                      onClick={() => setShowPayForm(true)}
                      className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-contrast rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Registrar Abono o Pago Ahora para "{deuda.nombre}"</span>
                    </button>
                  ) : (
                    <form onSubmit={handleRegisterPayment} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                        <span className="text-xs font-bold text-text-heading flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span>Nuevo Abono a esta Deuda</span>
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setShowPayForm(false)}
                          className="text-text-muted hover:text-text-body text-xs font-semibold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">Monto ($)</label>
                          <input
                            type="number"
                            value={payMonto}
                            onChange={(e) => setPayMonto(e.target.value)}
                            min="0.01"
                            step="0.01"
                            required
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold text-emerald-600 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">Fecha</label>
                          <input
                            type="date"
                            value={payFecha}
                            onChange={(e) => setPayFecha(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">Nota</label>
                          <input
                            type="text"
                            value={payNota}
                            onChange={(e) => setPayNota(e.target.value)}
                            placeholder="Ej. Abono quincenal"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Guardar Abono</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ESTRATEGIA IA */}
          {activeTab === 'estrategia' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-2xl p-6 border border-amber-500/20 shadow-card-default space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center border border-amber-500/30 shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-amber-950">
                        Análisis Inteligente de Liberación
                      </h3>
                      <p className="text-xs text-amber-800 font-medium">
                        Recomendaciones personalizadas para la deuda "{deuda.nombre}"
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={loadingAi}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
                    <span>{loadingAi ? 'Generando análisis...' : 'Regenerar con IA'}</span>
                  </button>
                </div>

                {loadingAi ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-amber-900 animate-pulse">
                      Consultando al motor de IA sobre tus condiciones crediticias y tasas...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {/* Diagnóstico */}
                    <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-2xs space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>Diagnóstico de tu Avance</span>
                      </span>
                      <p className="text-xs text-text-body leading-relaxed font-medium">
                        {aiAnalysis?.diagnostico || generateHeuristicAnalysis().diagnostico}
                      </p>
                    </div>

                    {/* Recomendación de Pago */}
                    <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-2xs space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Recomendación Estratégica de Pago</span>
                      </span>
                      <p className="text-xs text-text-body leading-relaxed font-semibold">
                        {aiAnalysis?.recomendacionPago || generateHeuristicAnalysis().recomendacionPago}
                      </p>
                    </div>

                    {/* Proyección Cierre */}
                    <div className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-2xs space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Proyección de Liquidación</span>
                      </span>
                      <p className="text-xs text-text-body leading-relaxed font-medium">
                        {aiAnalysis?.proyeccionCierre || generateHeuristicAnalysis().proyeccionCierre}
                      </p>
                    </div>

                    {/* Alerta Especial */}
                    <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                        <span>Punto Clave y Alerta de Tasas</span>
                      </span>
                      <p className="text-xs text-amber-950 leading-relaxed font-semibold">
                        {aiAnalysis?.alertaEspecial || generateHeuristicAnalysis().alertaEspecial}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ABONOS */}
          {activeTab === 'abonos' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-text-heading flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-primary" />
                  <span>Historial de Pagos y Abonos Registrados ({misAbonos.length})</span>
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  Total Pagado: {formatMXN(totalPagadoEnEstaDeuda)}
                </span>
              </div>

              {misAbonos.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 space-y-2">
                  <p>Aún no has registrado abonos para esta deuda.</p>
                  {onAddPayment && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('resumen');
                        setShowPayForm(true);
                      }}
                      className="text-brand-primary font-bold hover:underline inline-block mt-1 cursor-pointer"
                    >
                      + Registrar mi primer abono ahora
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {misAbonos
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map((p) => {
                      const dateObj = new Date(p.fecha + 'T00:00:00');
                      const formattedDate = dateObj.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      });

                      return (
                        <div
                          key={p.id}
                          className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs flex items-center justify-between gap-3 hover:border-gray-200 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-text-heading truncate">
                                {p.nota || 'Pago registrado'}
                              </p>
                              <p className="text-[11px] text-text-muted font-mono mt-0.5">
                                {formattedDate}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-bold text-emerald-600">
                              +{formatMXN(p.monto, 2)}
                            </span>
                            {onDeletePayment && (
                              <button
                                onClick={() => onDeletePayment(p.id)}
                                className="w-7 h-7 rounded-full bg-gray-50 hover:bg-red-50 text-text-muted hover:text-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                title="Eliminar abono"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PLAZO Y MSI */}
          {activeTab === 'plazo' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-text-heading flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>Desglose de Mensualidades y Compras a Plazos</span>
                </h3>
                {deuda.mesesPlazo && deuda.mesesPlazo > 0 && (
                  <span className="text-xs font-mono font-bold bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200">
                    Plazo fijado: {deuda.mesesPlazo} meses
                  </span>
                )}
              </div>

              {/* Compras a Meses Sin Intereses */}
              {deuda.comprasMeses && deuda.comprasMeses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Compras a Meses Sin Intereses (MSI) Activas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {deuda.comprasMeses.map((c) => (
                      <div key={c.id} className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-purple-950">{c.concepto}</span>
                          <span className="text-[10px] font-mono bg-white text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 font-bold">
                            {c.mesesPagados}/{c.mesesTotales} meses
                          </span>
                        </div>
                        <div className="flex justify-between items-end text-xs pt-1">
                          <div>
                            <span className="text-[10px] text-text-muted block">Monto Mensual</span>
                            <span className="font-mono font-bold text-purple-700">{formatMXN(c.montoMensual)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-text-muted block">Total Compra</span>
                            <span className="font-mono font-semibold text-text-body">{formatMXN(c.montoTotal)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Mensualidades */}
              {deuda.listaMensualidades && deuda.listaMensualidades.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Calendario de Mensualidades del Préstamo
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto">
                    {deuda.listaMensualidades.map((m) => (
                      <div
                        key={m.mes}
                        className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                          m.pagado ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-white border-gray-200 text-text-body'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Mes #{m.mes}</span>
                          {m.pagado && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <span className="font-mono font-bold mt-2">{formatMXN(m.monto)}</span>
                        <span className="text-[10px] text-text-muted mt-1">
                          {m.pagado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!deuda.comprasMeses || deuda.comprasMeses.length === 0) && (!deuda.listaMensualidades || deuda.listaMensualidades.length === 0) && (
                <div className="py-8 text-center text-text-muted text-xs bg-gray-50 rounded-xl border border-gray-100">
                  Este crédito no tiene registradas mensualidades específicas ni compras a Meses Sin Intereses.
                  <p className="mt-1">Puedes configurar meses o compras MSI al editar la deuda en la pestaña Deudas.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
}
