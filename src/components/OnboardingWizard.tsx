import React, { useState } from 'react';
import { OnboardingAnswers, TipoCompromiso } from '../types';
import { saveUserOnboardingData } from '../lib/firebase';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  CreditCard, 
  Building2, 
  Car, 
  Heart, 
  Tv, 
  Baby, 
  Briefcase, 
  Users, 
  PiggyBank, 
  Wallet, 
  Phone, 
  ShieldAlert,
  GraduationCap,
  Flame
} from 'lucide-react';

interface Props {
  uid: string;
  userEmail: string;
  onComplete: () => void;
}

export default function OnboardingWizard({ uid, userEmail, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Answers
  const [nombre, setNombre] = useState('');
  const [pais, setPais] = useState('México');
  const [moneda, setMoneda] = useState('MXN');
  const [tipoIngreso, setTipoIngreso] = useState<'fijo' | 'variable' | 'mixto'>('fijo');
  const [frecuenciaIngreso, setFrecuenciaIngreso] = useState<'semanal' | 'quincenal' | 'mensual'>('quincenal');
  const [ingresoPromedio, setIngresoPromedio] = useState<number>(25000);
  const [objetivoPrincipal, setObjetivoPrincipal] = useState<'salir_deudas' | 'ahorrar' | 'control_gastos' | 'inversión' | 'libertad_financiera'>('salir_deudas');

  // Modular questions for adaptive dashboard
  const [tieneHijos, setTieneHijos] = useState(false);
  const [tieneAuto, setTieneAuto] = useState(false);
  const [tieneMascotas, setTieneMascotas] = useState(false);

  // Commitments list selection
  const [compromisos, setCompromisos] = useState<TipoCompromiso[]>([
    'tarjeta',
    'servicio',
    'suscripcion'
  ]);

  const toggleCompromiso = (tipo: TipoCompromiso) => {
    if (compromisos.includes(tipo)) {
      setCompromisos(compromisos.filter(c => c !== tipo));
    } else {
      setCompromisos([...compromisos, tipo]);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const answers: OnboardingAnswers = {
        nombre: nombre || 'Usuario Zerum',
        pais,
        moneda,
        tipoIngreso,
        frecuenciaIngreso,
        ingresoPromedio: Number(ingresoPromedio) || 0,
        objetivoPrincipal,
        tieneHijos,
        tieneAuto,
        tieneMascotas,
        compromisosIniciales: compromisos
      };

      await saveUserOnboardingData(uid, answers);
      onComplete();
    } catch (e) {
      console.error('Error saving onboarding:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const listaOpcionesCompromisos: { id: TipoCompromiso; label: string; icon: any; category: string }[] = [
    { id: 'tarjeta', label: 'Tarjetas de Crédito', icon: CreditCard, category: 'Bancos' },
    { id: 'prestamo', label: 'Préstamos Bancarios / Personales', icon: Wallet, category: 'Bancos' },
    { id: 'hipoteca', label: 'Hipoteca / Casa', icon: Building2, category: 'Vivienda' },
    { id: 'auto', label: 'Crédito Automotriz', icon: Car, category: 'Transporte' },
    { id: 'infonavit', label: 'Infonavit', icon: Building2, category: 'Vivienda' },
    { id: 'fonacot', label: 'Fonacot / Nómina', icon: Briefcase, category: 'Trabajo' },
    { id: 'app_prestamo', label: 'Apps de Préstamos (Kueski, etc.)', icon: Phone, category: 'Digital' },
    { id: 'tanda', label: 'Tandas / Cajas de Ahorro', icon: PiggyBank, category: 'Comunidad' },
    { id: 'colegiatura', label: 'Colegiaturas / Educación', icon: GraduationCap, category: 'Familia' },
    { id: 'servicio', label: 'Servicios (Luz, Agua, Internet)', icon: Building2, category: 'Hogar' },
    { id: 'suscripcion', label: 'Suscripciones (Streaming, Apps)', icon: Tv, category: 'Digital' },
    { id: 'prestamo_familiar', label: 'Préstamos Familiares', icon: Users, category: 'Personal' },
    { id: 'negocio', label: 'Compromisos de Negocio', icon: Briefcase, category: 'Negocio' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background Lights */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm">
              {step}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Paso {step} de 3
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Personal Profile & Goals */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3">
                <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>RITUAL DE ALTA EN LA FRAGUA</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                ¡Bienvenido a la Fragua de Zerum! 👋
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Ajusta la fragua con tu información referencial para adaptar los algoritmos de liberación.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  ¿Cómo te gusta que te llamen?
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="ej. Francisco"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    País
                  </label>
                  <select
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="México">México 🇲🇽</option>
                    <option value="Colombia">Colombia 🇨🇴</option>
                    <option value="Argentina">Argentina 🇦🇷</option>
                    <option value="Chile">Chile 🇨🇱</option>
                    <option value="España">España 🇪🇸</option>
                    <option value="Estados Unidos">Estados Unidos 🇺🇸</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Moneda Principal
                  </label>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="MXN">MXN ($ Peso Mex)</option>
                    <option value="USD">USD ($ Dólar)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="COP">COP ($ Peso Col)</option>
                    <option value="CLP">CLP ($ Peso Chi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  ¿Cuál es tu Objetivo Principal con Zerum?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'salir_deudas', title: 'Salir de Deudas', desc: 'Saldar tarjetas y créditos rápido' },
                    { id: 'control_gastos', title: 'Controlar Gastos', desc: 'Saber a dónde se va cada centavo' },
                    { id: 'ahorrar', title: 'Aumentar Ahorros', desc: 'Crear un fondo de emergencia' },
                    { id: 'libertad_financiera', title: 'Libertad Financiera', desc: 'Optimizar flujo libre mensual' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setObjetivoPrincipal(item.id as any)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        objetivoPrincipal === item.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-black text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Siguiente: Ingresos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Income & Adaptive Features */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Flujo e Información Adaptativa
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Esto nos permite mostrarte únicamente los módulos relevantes para tu estilo de vida.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Tipo de Ingreso
                  </label>
                  <select
                    value={tipoIngreso}
                    onChange={(e) => setTipoIngreso(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="fijo">Fijo (Sueldo)</option>
                    <option value="variable">Variable (Comisiones/Honorarios)</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Frecuencia de Ingreso
                  </label>
                  <select
                    value={frecuenciaIngreso}
                    onChange={(e) => setFrecuenciaIngreso(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Ingreso Promedio Estimado Mensual ({moneda})
                </label>
                <input
                  type="number"
                  value={ingresoPromedio}
                  onChange={(e) => setIngresoPromedio(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Personalización del Dashboard Adaptativo
                </label>
                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Baby className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-xs font-bold text-white">¿Tienes Hijos o Dependientes?</div>
                        <div className="text-[11px] text-slate-400">Activa módulos de colegiaturas y gastos escolares</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={tieneHijos}
                      onChange={(e) => setTieneHijos(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-xs font-bold text-white">¿Tienes Automóvil o Vehículo?</div>
                        <div className="text-[11px] text-slate-400">Activa módulos de gasolina, seguro y crédito auto</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={tieneAuto}
                      onChange={(e) => setTieneAuto(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 text-rose-400" />
                      <div>
                        <div className="text-xs font-bold text-white">¿Tienes Mascotas?</div>
                        <div className="text-[11px] text-slate-400">Activa categorías de veterinaria y alimento</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={tieneMascotas}
                      onChange={(e) => setTieneMascotas(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-5 text-slate-400 hover:text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Siguiente: Compromisos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Financial Commitments Selection */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Compromisos Financieros Actuales
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Selecciona qué compromisos manejas actualmente para preparar tu tablero.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {listaOpcionesCompromisos.map((item) => {
                const isSelected = compromisos.includes(item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCompromiso(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="text-xs font-extrabold leading-tight">{item.label}</div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-5 text-slate-400 hover:text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="py-3.5 px-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Preparando tu Zerum...</span>
                ) : (
                  <>
                    <span>Comenzar en Zerum</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
