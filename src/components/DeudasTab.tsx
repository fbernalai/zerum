import React, { useState } from 'react';
import { Debt, MensualidadPlazo, DebtPayment } from '../types';
import { formatMXN, mesesParaPagar, getDueBadgeInfo } from '../utils/finance';
import { Plus, X, CreditCard, Landmark, Coins, HelpCircle, Pencil, Car, Sparkles, Check, Upload, Bot, Loader2, AlertCircle, Calendar, DollarSign, ListOrdered } from 'lucide-react';
import DeudaDetailModal from './DeudaDetailModal';

interface DeudasTabProps {
  debts: Debt[];
  payments?: DebtPayment[];
  onAddDebt: (debt: Omit<Debt, 'id'>) => void;
  onDeleteDebt: (id: string) => void;
  onUpdateDebt: (id: string, updated: Partial<Debt>) => void;
  onAddPayment?: (payment: Omit<DebtPayment, 'id'>) => void;
  onDeletePayment?: (id: string) => void;
  activeProfileId?: string;
}

export default function DeudasTab({ debts, payments = [], onAddDebt, onDeleteDebt, onUpdateDebt, onAddPayment, onDeletePayment, activeProfileId = 'principal' }: DeudasTabProps) {
  const [selectedDetailDebt, setSelectedDetailDebt] = useState<Debt | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Tarjeta de crédito');
  const [inicial, setInicial] = useState('');
  const [actual, setActual] = useState('');
  const [tasa, setTasa] = useState('');
  const [pago, setPago] = useState('');
  const [pagoNoInteres, setPagoNoInteres] = useState('');
  const [diaLimite, setDiaLimite] = useState('15');

  // New detailed fields
  const [limiteCredito, setLimiteCredito] = useState('');
  const [diaCorte, setDiaCorte] = useState('');
  const [mesesPlazo, setMesesPlazo] = useState('');
  const [mensualidadesPersonalizadas, setMensualidadesPersonalizadas] = useState(false);
  const [listaMensualidades, setListaMensualidades] = useState<MensualidadPlazo[]>([]);

  // AI Document Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiError, setAiError] = useState('');

  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editActual, setEditActual] = useState('');
  const [editTasa, setEditTasa] = useState('');
  const [editPago, setEditPago] = useState('');
  const [editPagoNoInteres, setEditPagoNoInteres] = useState('');
  const [editDiaLimite, setEditDiaLimite] = useState('');
  const [editLimiteCredito, setEditLimiteCredito] = useState('');
  const [editDiaCorte, setEditDiaCorte] = useState('');
  const [editMesesPlazo, setEditMesesPlazo] = useState('');

  const handleAnalyzeDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAiError('');
    setAiSummary('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Str = reader.result as string;
          let extracted: any = null;

          // Try server API first
          try {
            const res = await fetch('/api/analyze-credit-doc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileBase64: base64Str, mimeType: file.type })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.data) {
                extracted = data.data;
              }
            }
          } catch (serverErr) {
            console.log('Server endpoint offline or static host, trying client GenAI fallback');
          }

          // Client fallback if server API didn't return extracted data
          if (!extracted) {
            const clientKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
            if (clientKey) {
              const { GoogleGenAI } = await import('@google/genai');
              const ai = new GoogleGenAI({ apiKey: clientKey });
              const cleanBase64 = base64Str.replace(/^data:([a-zA-Z0-9\/+-]+);base64,/, "");
              const aiRes = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: [{
                  role: 'user',
                  parts: [
                    { inlineData: { data: cleanBase64, mimeType: file.type || 'application/pdf' } },
                    { text: `Analiza este documento financiero o contrato. Extrae en JSON: {"nombre": "string", "tipo": "string", "inicial": 0, "actual": 0, "tasa": 0, "pago": 0, "pagoNoInteres": 0, "diaLimite": 15, "limiteCredito": 0, "diaCorte": 0, "mesesPlazo": 0, "resumen": "string"}` }
                  ]
                }],
                config: { responseMimeType: "application/json" }
              });
              const textRes = aiRes.text || '{}';
              extracted = JSON.parse(textRes);
            }
          }

          if (extracted) {
            if (extracted.nombre) setNombre(extracted.nombre);
            if (extracted.tipo) {
              const validTypes = ['Tarjeta de crédito', 'Préstamo de app', 'Préstamo personal', 'Crédito de auto', 'Otro'];
              if (validTypes.includes(extracted.tipo)) setTipo(extracted.tipo);
            }
            if (extracted.inicial) setInicial(String(extracted.inicial));
            if (extracted.actual) setActual(String(extracted.actual));
            if (extracted.tasa !== undefined) setTasa(String(extracted.tasa));
            if (extracted.pago) setPago(String(extracted.pago));
            if (extracted.pagoNoInteres) setPagoNoInteres(String(extracted.pagoNoInteres));
            if (extracted.diaLimite) setDiaLimite(String(extracted.diaLimite));
            if (extracted.limiteCredito) setLimiteCredito(String(extracted.limiteCredito));
            if (extracted.diaCorte) setDiaCorte(String(extracted.diaCorte));
            if (extracted.mesesPlazo) setMesesPlazo(String(extracted.mesesPlazo));
            if (extracted.resumen) setAiSummary(extracted.resumen);

            setIsOpen(true);
          } else {
            setAiError('No se pudo extraer información del archivo. Asegúrate de que el archivo sea legible o la clave de API esté activa.');
          }
        } catch (err: any) {
          setAiError(err.message || 'Error al procesar el documento con IA.');
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setAiError('Error al leer el archivo.');
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !actual || !pago) return;

    const actualVal = parseFloat(actual) || 0;
    const inicialVal = parseFloat(inicial) || actualVal || 0;
    const tasaVal = parseFloat(tasa) || 0;
    const pagoVal = parseFloat(pago) || 0;
    const pagoNoInteresVal = parseFloat(pagoNoInteres) || pagoVal;
    const diaLimiteVal = parseInt(diaLimite) || 15;
    const limiteCreditoVal = parseFloat(limiteCredito) || 0;
    const diaCorteVal = parseInt(diaCorte) || 0;
    const mesesPlazoVal = (tipo === 'Tarjeta de crédito' || mensualidadesPersonalizadas) ? (parseInt(mesesPlazo) || 0) : undefined;

    onAddDebt({
      nombre: nombre.trim(),
      tipo,
      inicial: inicialVal,
      actual: actualVal,
      tasa: tasaVal,
      pago: pagoVal,
      pagoNoInteres: pagoNoInteresVal,
      diaLimite: diaLimiteVal,
      limiteCredito: limiteCreditoVal,
      diaCorte: diaCorteVal,
      mesesPlazo: mesesPlazoVal,
      mensualidadesPersonalizadas,
      listaMensualidades: mensualidadesPersonalizadas ? listaMensualidades : [],
      pagoElegidoTipo: 'minimo'
    });

    // Reset Form
    setNombre('');
    setTipo('Tarjeta de crédito');
    setInicial('');
    setActual('');
    setTasa('');
    setPago('');
    setPagoNoInteres('');
    setDiaLimite('15');
    setLimiteCredito('');
    setDiaCorte('');
    setMesesPlazo('');
    setMensualidadesPersonalizadas(false);
    setListaMensualidades([]);
    setAiSummary('');
    setIsOpen(false);
  };

  const handleStartEdit = (d: Debt) => {
    setEditingId(d.id);
    setEditNombre(d.nombre);
    setEditTipo(d.tipo);
    setEditActual(d.actual.toString());
    setEditTasa(d.tasa.toString());
    setEditPago(d.pago.toString());
    setEditPagoNoInteres((d.pagoNoInteres || d.pago).toString());
    setEditDiaLimite((d.diaLimite || 15).toString());
    setEditLimiteCredito((d.limiteCredito || 0).toString());
    setEditDiaCorte((d.diaCorte || 0).toString());
    setEditMesesPlazo((d.mesesPlazo || 0).toString());
  };

  const handleSaveEdit = (id: string) => {
    if (!editNombre || !editActual || !editPago) return;
    
    const actualVal = parseFloat(editActual) || 0;
    const tasaVal = parseFloat(editTasa) || 0;
    const pagoVal = parseFloat(editPago) || 0;
    const pagoNoInteresVal = parseFloat(editPagoNoInteres) || pagoVal;
    const diaLimiteVal = parseInt(editDiaLimite) || 15;
    const limiteCreditoVal = parseFloat(editLimiteCredito) || 0;
    const diaCorteVal = parseInt(editDiaCorte) || 0;
    const targetDebt = debts.find(d => d.id === id);
    const mesesPlazoVal = (editTipo === 'Tarjeta de crédito' || targetDebt?.mensualidadesPersonalizadas) ? (parseInt(editMesesPlazo) || 0) : undefined;

    onUpdateDebt(id, {
      nombre: editNombre.trim(),
      tipo: editTipo,
      actual: actualVal,
      tasa: tasaVal,
      pago: pagoVal,
      pagoNoInteres: pagoNoInteresVal,
      diaLimite: diaLimiteVal,
      limiteCredito: limiteCreditoVal,
      diaCorte: diaCorteVal,
      mesesPlazo: mesesPlazoVal
    });

    setEditingId(null);
  };


  const getDebtIcon = (type: string) => {
    switch (type) {
      case 'Tarjeta de crédito':
        return <CreditCard className="w-4 h-4 text-accent-danger" />;
      case 'Préstamo personal':
        return <Landmark className="w-4 h-4 text-brand-primary" />;
      case 'Préstamo de app':
        return <Coins className="w-4 h-4 text-accent-warning" />;
      case 'Crédito de auto':
        return <Car className="w-4 h-4 text-purple-600" />;
      default:
        return <HelpCircle className="w-4 h-4 text-text-muted" />;
    }
  };

  const getTagStyle = (type: string) => {
    switch (type) {
      case 'Tarjeta de crédito':
        return 'bg-pastel-red text-accent-danger border border-accent-danger/10';
      case 'Préstamo de app':
        return 'bg-pastel-yellow text-accent-warning border border-accent-warning/10';
      case 'Préstamo personal':
        return 'bg-pastel-blue text-brand-primary border border-brand-primary/10';
      case 'Crédito de auto':
        return 'bg-purple-50 text-purple-600 border border-purple-100';
      default:
        return 'bg-gray-100 text-text-muted border border-gray-200/50';
    }
  };

  const hasKavak = debts.some(
    (d) =>
      d.nombre.toLowerCase().includes('kavak') ||
      d.nombre.toLowerCase().includes('volkswagen') ||
      d.nombre.toLowerCase().includes('gol')
  );

  const handleImportKavak = () => {
    onAddDebt({
      nombre: 'Volkswagen Gol - Kavak',
      tipo: 'Crédito de auto',
      inicial: 121801,
      actual: 119682,
      tasa: 33.49,
      pago: 6253,
      pagoNoInteres: 6253,
      diaLimite: 1,
      pagoElegidoTipo: 'minimo',
      mesesPlazo: 60,
      esKavak: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-heading tracking-tight">
            Tus deudas
          </h2>
          <p className="text-xs text-text-muted font-medium mt-0.5">
            Tarjetas de crédito, préstamos de apps, de auto y préstamos personales.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando con IA...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 text-purple-200" />
                <span>Analizar PDF / Foto (AI)</span>
              </>
            )}
            <input 
              type="file" 
              accept=".pdf,image/*" 
              onChange={handleAnalyzeDocument} 
              disabled={isAnalyzing}
              className="hidden" 
            />
          </label>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-contrast rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {isOpen ? 'Cerrar Formulario' : 'Agregar Deuda'}
          </button>
        </div>
      </div>

      {/* AI Analysis feedback banners */}
      {aiError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between text-xs text-red-700 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{aiError}</span>
          </div>
          <button onClick={() => setAiError('')} className="text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
        </div>
      )}

      {aiSummary && (
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-start gap-3 text-xs text-purple-900 font-medium animate-fadeIn">
          <Bot className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold uppercase tracking-wider text-[10px] text-purple-600 mb-0.5">IA: Datos extraídos del documento</p>
            <p className="leading-relaxed">{aiSummary}</p>
            <p className="text-[11px] text-purple-700/80 mt-1 italic">
              Hemos precargado los campos en el formulario de abajo. Revisa los datos y haz clic en "Guardar Deuda".
            </p>
          </div>
          <button onClick={() => setAiSummary('')} className="text-purple-400 hover:text-purple-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Kavak Smart Callout Box - ONLY ON PRINCIPAL PROFILE */}
      {activeProfileId === 'principal' && !hasKavak && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border border-purple-200/70 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0 shadow-inner">
              <Car className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-text-heading flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                ¡Simulación Kavak de Auto Detectada!
              </h3>
              <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
                Hemos analizado la simulación de tu <strong>Volkswagen Gol</strong>. Podemos configurar automáticamente este crédito de auto con un saldo actual estimado de <strong>{formatMXN(119682)}</strong> (plazo fijo de <strong>60 meses</strong>, considerando tus pagos hechos desde abril 2026), mensualidades fijas de <strong>{formatMXN(6253)}</strong>, una tasa del <strong>33.49%</strong> y vencimientos los <strong>días 1</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleImportKavak}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-md shadow-purple-200 shrink-0 self-start md:self-auto"
          >
            <Check className="w-4 h-4" />
            Agregar este Crédito de Auto
          </button>
        </div>
      )}


      {/* Add Debt Form Container */}
      {isOpen && (
        <form 
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-pronounced border border-gray-100 space-y-4 animate-fadeIn"
        >
          <h3 className="text-sm font-bold text-text-heading uppercase tracking-wider border-b border-gray-50 pb-2">
            Nueva Deuda
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Nombre de la Cuenta
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. BBVA Azul"
                required
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-medium"
              />
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Tipo de Deuda
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-brand-primary font-medium"
              >
                <option>Tarjeta de crédito</option>
                <option>Préstamo de app</option>
                <option>Préstamo personal</option>
                <option>Crédito de auto</option>
                <option>Otro</option>
              </select>
            </div>

            {/* Saldo Inicial */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Saldo Inicial (Opcional)
              </label>
              <input
                type="number"
                value={inicial}
                onChange={(e) => setInicial(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Saldo original o inicial $"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
              />
            </div>

            {/* Saldo Actual */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Saldo Actual (Requerido)
              </label>
              <input
                type="number"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Monto a pagar hoy $"
                required
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
              />
            </div>

            {/* Tasa de interés */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Tasa de Interés Anual %
              </label>
              <input
                type="number"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Ej. 45"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
              />
            </div>

            {/* Pago Mínimo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Pago Mínimo Mensual ($)
              </label>
              <input
                type="number"
                value={pago}
                onChange={(e) => setPago(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Monto mínimo a pagar $"
                required
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
              />
            </div>

            {/* Pago para no generar intereses */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Pago para No Generar Intereses ($)
              </label>
              <input
                type="number"
                value={pagoNoInteres}
                onChange={(e) => setPagoNoInteres(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Monto total para evitar intereses $"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
              />
            </div>

            {/* Día Límite de Pago */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Día Límite de Pago (1 al 31)
              </label>
              <input
                type="number"
                value={diaLimite}
                onChange={(e) => setDiaLimite(e.target.value)}
                min="1"
                max="31"
                required
                placeholder="Ej. 16"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
              />
            </div>

            {/* Límite de Crédito */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Límite de Crédito $ (Opcional)
              </label>
              <input
                type="number"
                value={limiteCredito}
                onChange={(e) => setLimiteCredito(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Ej. 50000"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
              />
            </div>

            {/* Día de Corte */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Día de Corte (1 al 31, Opcional)
              </label>
              <input
                type="number"
                value={diaCorte}
                onChange={(e) => setDiaCorte(e.target.value)}
                min="1"
                max="31"
                placeholder="Ej. 5"
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
              />
            </div>

            {/* Plazo Total en Meses */}
            {(tipo === 'Tarjeta de crédito' || mensualidadesPersonalizadas) && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Plazo Total (Meses, ej. 12, 60)
                </label>
                <input
                  type="number"
                  value={mesesPlazo}
                  onChange={(e) => setMesesPlazo(e.target.value)}
                  min="0"
                  placeholder="Ej. 60 para auto o préstamo"
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-primary font-mono font-medium"
                />
              </div>
            )}
          </div>

          {/* Mensualidades personalizadas/variables */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="checkVar"
                checked={mensualidadesPersonalizadas}
                onChange={(e) => {
                  setMensualidadesPersonalizadas(e.target.checked);
                  if (e.target.checked && listaMensualidades.length === 0) {
                    const count = parseInt(mesesPlazo) || 12;
                    const baseAmount = parseFloat(pago) || 0;
                    const defaultList = Array.from({ length: Math.min(count, 36) }, (_, i) => ({
                      mes: i + 1,
                      monto: baseAmount,
                      pagado: false
                    }));
                    setListaMensualidades(defaultList);
                  }
                }}
                className="w-4 h-4 text-brand-primary rounded border-gray-300 focus:ring-brand-primary cursor-pointer"
              />
              <label htmlFor="checkVar" className="text-xs font-bold text-text-heading cursor-pointer select-none">
                ¿Este préstamo tiene mensualidades variables o quieres registrar el desglose mes a mes?
              </label>
            </div>

            {mensualidadesPersonalizadas && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 max-h-60 overflow-y-auto border border-gray-200/60">
                <p className="text-[11px] text-text-muted font-medium">
                  Ajusta el monto estimado para cada mes (puedes registrar hasta 36 meses aquí):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {listaMensualidades.map((item, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-gray-200 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Mes {item.mes}</span>
                      <input
                        type="number"
                        value={item.monto || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const newList = [...listaMensualidades];
                          newList[idx] = { ...newList[idx], monto: val };
                          setListaMensualidades(newList);
                        }}
                        placeholder="0.00"
                        className="w-full text-xs font-mono font-bold px-1.5 py-1 border border-gray-200 rounded focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setNombre('');
                setInicial('');
                setActual('');
                setTasa('');
                setPago('');
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text-muted bg-gray-100 hover:bg-gray-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-contrast rounded-xl text-xs font-semibold tracking-wide cursor-pointer shadow-sm"
            >
              Guardar Deuda
            </button>
          </div>
        </form>
      )}

      {/* Debts List */}
      <div className="space-y-4">
        {debts.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200 shadow-card-default">
            <p className="text-sm text-text-muted italic leading-relaxed">
              Aún no registras deudas. Agrega tu primera tarjeta o préstamo arriba para iniciar tu Camino a Cero.
            </p>
          </div>
        ) : (
          debts.map((d) => {
            const meses = mesesParaPagar(Number(d.actual), Number(d.tasa || 0), Number(d.pago));
            const ini = Number(d.inicial || d.actual || 0);
            const pct = ini > 0 ? Math.min(100, Math.max(0, (1 - Number(d.actual) / ini) * 100)) : 0;
            const isEditing = editingId === d.id;
            
            if (isEditing) {
              return (
                <div 
                  key={d.id}
                  className="bg-white rounded-2xl p-6 shadow-pronounced border border-brand-primary/40 space-y-4 animate-fadeIn"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h4 className="text-xs font-bold uppercase text-brand-primary tracking-wider">
                      Editar Deuda: {d.nombre}
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-text-muted hover:text-text-body cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Nombre */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">Nombre de la Cuenta</label>
                      <input 
                        type="text" 
                        value={editNombre} 
                        onChange={(e) => setEditNombre(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium"
                      />
                    </div>

                    {/* Tipo de deuda */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">Tipo de Deuda</label>
                      <select 
                        value={editTipo} 
                        onChange={(e) => setEditTipo(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white"
                      >
                        <option>Tarjeta de crédito</option>
                        <option>Préstamo de app</option>
                        <option>Préstamo personal</option>
                        <option>Crédito de auto</option>
                        <option>Otro</option>
                      </select>
                    </div>

                    {/* Saldo Actual */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">Saldo Actual ($)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={editActual} 
                        onChange={(e) => setEditActual(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-medium"
                      />
                    </div>

                    {/* Tasa de interés */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">Tasa Anual %</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={editTasa} 
                        onChange={(e) => setEditTasa(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-medium"
                      />
                    </div>

                    {/* Pago mínimo */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">Pago Mínimo ($)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={editPago} 
                        onChange={(e) => setEditPago(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-medium"
                      />
                    </div>

                    {/* Pago no intereses */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">Pago para evitar intereses ($)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={editPagoNoInteres} 
                        onChange={(e) => setEditPagoNoInteres(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-medium"
                      />
                    </div>

                    {/* Día límite de pago */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">Día Límite de Pago (1-31)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="31" 
                        value={editDiaLimite} 
                        onChange={(e) => setEditDiaLimite(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-medium"
                      />
                    </div>

                    {/* Límite de Crédito */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">Límite de Crédito ($)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={editLimiteCredito} 
                        onChange={(e) => setEditLimiteCredito(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-medium"
                      />
                    </div>

                    {/* Día de Corte */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase">Día de Corte (1-31)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="31" 
                        value={editDiaCorte} 
                        onChange={(e) => setEditDiaCorte(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-medium"
                      />
                    </div>

                    {/* Plazo meses */}
                    {(d.tipo === 'Tarjeta de crédito' || d.mensualidadesPersonalizadas) && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">Plazo Total (Meses)</label>
                        <input 
                          type="number" 
                          value={editMesesPlazo} 
                          onChange={(e) => setEditMesesPlazo(e.target.value)} 
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-medium"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button 
                      type="button"
                      onClick={() => setEditingId(null)} 
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-text-body rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSaveEdit(d.id)} 
                      className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-contrast rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={d.id}
                className="bg-white rounded-2xl p-5 shadow-card-default border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:translate-y-[-2px] transition-all duration-200"
              >
                {/* Left Side Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getTagStyle(d.tipo)}`}>
                    {getDebtIcon(d.tipo)}
                  </div>
                  
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-text-heading">
                        {d.nombre}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTagStyle(d.tipo)}`}>
                        {d.tipo}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono whitespace-nowrap ${getDueBadgeInfo(d.diaLimite || 15).badgeStyle}`}>
                        {getDueBadgeInfo(d.diaLimite || 15).badgeText}
                      </span>
                      {d.diaCorte && d.diaCorte > 0 && (
                        <span className="text-[10px] bg-pastel-yellow/60 text-amber-800 border border-amber-200/60 font-bold px-2 py-0.5 rounded-full font-mono">
                          Corte Día {d.diaCorte}
                        </span>
                      )}
                      {d.mesesPlazo && d.mesesPlazo > 0 && (d.tipo === 'Tarjeta de crédito' || d.mensualidadesPersonalizadas) && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200/60 font-bold px-2 py-0.5 rounded-full font-mono">
                          Plazo: {d.mesesPlazo} meses
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-text-muted font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>Tasa anual: <span className="font-semibold text-text-body font-mono">{d.tasa}%</span></span>
                      <span>·</span>
                      <span>Pago mínimo: <span className="font-semibold text-text-body font-mono">{formatMXN(d.pago)}</span></span>
                      <span>·</span>
                      <span>No genera intereses: <span className="font-semibold text-text-body font-mono">{formatMXN(d.pagoNoInteres || d.pago)}</span></span>
                      {d.limiteCredito && d.limiteCredito > 0 && (
                        <>
                          <span>·</span>
                          <span>Límite: <span className="font-semibold text-text-body font-mono">{formatMXN(d.limiteCredito)}</span> (Disp: <span className="font-semibold text-emerald-600 font-mono">{formatMXN(Math.max(0, d.limiteCredito - d.actual))}</span>)</span>
                        </>
                      )}
                      <span>·</span>
                      <span className={`font-semibold ${meses === Infinity ? 'text-accent-danger' : 'text-brand-primary'}`}>
                        {meses === Infinity ? ' Pago no cubre interés' : ` ${meses} meses restantes`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-md pt-1.5 space-y-1">
                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full bg-brand-primary rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-text-muted font-mono">
                        <span>Pagado: {pct.toFixed(0)}%</span>
                        <span>Faltan: {formatMXN(d.actual)} de {formatMXN(ini)}</span>
                      </div>
                    </div>

                    {/* Compras a Meses Sin Intereses (MSI) o mensualidades personalizadas */}
                    {d.comprasMeses && d.comprasMeses.length > 0 && (
                      <div className="mt-3 bg-pastel-blue/30 border border-brand-primary/20 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-primary uppercase tracking-wider">
                          <ListOrdered className="w-3.5 h-3.5" />
                          <span>Compras a Meses Sin Intereses (MSI) activas ({d.comprasMeses.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {d.comprasMeses.map((c) => (
                            <div key={c.id} className="bg-white px-3 py-2 rounded-lg border border-gray-100 flex items-center justify-between text-xs shadow-2xs">
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-text-heading truncate">{c.concepto}</p>
                                <p className="text-[10px] text-text-muted">{c.mesesTotales} meses (fechado: {c.fechaCompra})</p>
                              </div>
                              <div className="text-right font-mono shrink-0">
                                <p className="font-bold text-brand-primary">{formatMXN(c.montoMensual)}/m</p>
                                <p className="text-[10px] text-text-muted">Total: {formatMXN(c.montoTotal)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.mensualidadesPersonalizadas && d.listaMensualidades && d.listaMensualidades.length > 0 && (
                      <div className="mt-3 bg-gray-50 border border-gray-200/60 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-heading uppercase tracking-wider">
                          <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                          <span>Desglose de Mensualidades Registradas</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {d.listaMensualidades.map((m, idx) => (
                            <div key={idx} className="bg-white px-2.5 py-1 rounded border border-gray-200 text-[11px] font-mono flex items-center gap-1.5">
                              <span className="text-text-muted font-sans font-bold">M{m.mes}:</span>
                              <span className="font-bold text-text-heading">{formatMXN(m.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side Balances & Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-gray-50 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right mr-3">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block mb-0.5">
                      Saldo Pendiente
                    </span>
                    <span className="text-base font-bold text-text-heading font-mono">
                      {formatMXN(d.actual, 2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDetailDebt(d)}
                      className="px-3 py-1.5 rounded-xl border border-brand-primary/30 bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Ver expediente, avance y recomendaciones"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Detalle</span>
                    </button>

                    <button
                      onClick={() => handleStartEdit(d)}
                      className="w-8 h-8 rounded-full border border-gray-100 bg-white hover:bg-pastel-blue hover:border-brand-primary hover:text-brand-primary text-text-muted transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm"
                      title="Editar Deuda"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteDebt(d.id)}
                      className="w-8 h-8 rounded-full border border-gray-100 bg-white hover:bg-pastel-red/50 hover:border-accent-danger hover:text-accent-danger text-text-muted transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm"
                      title="Eliminar Deuda"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedDetailDebt && (
        <DeudaDetailModal
          deuda={selectedDetailDebt}
          payments={payments}
          onClose={() => setSelectedDetailDebt(null)}
          onAddPayment={onAddPayment}
          onDeletePayment={onDeletePayment}
        />
      )}
    </div>
  );
}
