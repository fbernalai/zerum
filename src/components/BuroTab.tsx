import React, { useState, useEffect } from 'react';
import { ShieldAlert, Award, FileText, Sparkles, AlertCircle, CheckCircle2, TrendingUp, HelpCircle, RefreshCw, Upload, Download, ArrowRight, Activity, Cpu, Target } from 'lucide-react';
import { AppState, BuroRecord, Debt, Expense, Income, UserProfileDoc } from '../types';

interface BuroTabProps {
  state: AppState;
  userProfile?: UserProfileDoc | null;
  onSaveBuroRecord?: (record: BuroRecord) => void;
  buroRecord?: BuroRecord | null;
  onOpenReportModal?: () => void;
  onImportDebts?: (debts: Omit<Debt, 'id'>[]) => void;
}

export default function BuroTab({
  state,
  userProfile,
  onSaveBuroRecord,
  buroRecord: existingBuroRecord,
  onOpenReportModal,
  onImportDebts
}: BuroTabProps) {
  const [score, setScore] = useState<number>(existingBuroRecord?.score || 640);
  const [cuentasEnBuro, setCuentasEnBuro] = useState<number>(existingBuroRecord?.cuentasEnBuro || state.debts.length || 3);
  const [cuentasPuntuales, setCuentasPuntuales] = useState<number>(existingBuroRecord?.cuentasPuntuales || Math.max(0, state.debts.length - 1));
  const [cuentasAtrasadas, setCuentasAtrasadas] = useState<number>(existingBuroRecord?.cuentasAtrasadas || 1);
  const [consultas6Meses, setConsultas6Meses] = useState<number>(existingBuroRecord?.consultasUltimos6Meses || 2);
  const [observacionesQuitas, setObservacionesQuitas] = useState<boolean>(existingBuroRecord?.observacionesQuitas || false);
  const [resumenBuroText, setResumenBuroText] = useState<string>(existingBuroRecord?.resumenBuroText || '');
  const [deudasEnfocar, setDeudasEnfocar] = useState<BuroRecord['deudasEnfocar']>(existingBuroRecord?.deudasEnfocar || []);

  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<BuroRecord['analisisIA'] | null>(existingBuroRecord?.analisisIA || null);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const [docSuccessMsg, setDocSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (existingBuroRecord) {
      if (existingBuroRecord.score) setScore(existingBuroRecord.score);
      if (existingBuroRecord.cuentasEnBuro) setCuentasEnBuro(existingBuroRecord.cuentasEnBuro);
      if (existingBuroRecord.cuentasPuntuales !== undefined) setCuentasPuntuales(existingBuroRecord.cuentasPuntuales);
      if (existingBuroRecord.cuentasAtrasadas !== undefined) setCuentasAtrasadas(existingBuroRecord.cuentasAtrasadas);
      if (existingBuroRecord.consultasUltimos6Meses !== undefined) setConsultas6Meses(existingBuroRecord.consultasUltimos6Meses);
      if (existingBuroRecord.observacionesQuitas !== undefined) setObservacionesQuitas(existingBuroRecord.observacionesQuitas);
      if (existingBuroRecord.resumenBuroText) setResumenBuroText(existingBuroRecord.resumenBuroText);
      if (existingBuroRecord.deudasEnfocar) setDeudasEnfocar(existingBuroRecord.deudasEnfocar);
      if (existingBuroRecord.analisisIA) setAiResult(existingBuroRecord.analisisIA);
    }
  }, [existingBuroRecord]);

  // Determine score category & color
  const getScoreInfo = (sc: number) => {
    if (sc >= 700) return { cat: 'Excelente', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500', desc: 'Acceso prioritario a mejores tasas' };
    if (sc >= 650) return { cat: 'Bueno', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', bar: 'bg-blue-500', desc: 'Historial sólido con bajo riesgo' };
    if (sc >= 580) return { cat: 'Regular', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', bar: 'bg-amber-500', desc: 'Atención a puntualidad y capacidad de pago' };
    return { cat: 'Riesgo / Atraso', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', bar: 'bg-rose-500', desc: 'Requiere estrategia de saneamiento inmediata' };
  };

  const scoreInfo = getScoreInfo(score);

  // Financial Context
  const totalIncomes = state.incomes.reduce((sum, i) => sum + Number(i.monto || 0), 0) + (state.recurring?.monto || 0);
  const totalExpenses = state.expenses.reduce((sum, e) => sum + Number(e.monto || 0), 0);

  // Call AI Analysis
  const handleGenerateAiAnalysis = async () => {
    setLoadingAi(true);
    setDocSuccessMsg('');
    try {
      const buroData = {
        score,
        cuentasEnBuro,
        cuentasPuntuales,
        cuentasAtrasadas,
        consultasUltimos6Meses: consultas6Meses,
        observacionesQuitas,
        resumenBuroText
      };

      const res = await fetch('/api/analyze-buro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buroData,
          debts: state.debts,
          incomes: totalIncomes,
          expenses: totalExpenses
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const resData = data.data;
        const mainAi = resData.analisisIA || resData;
        setAiResult(mainAi);
        
        if (resData.deudasEnfocar) {
          setDeudasEnfocar(resData.deudasEnfocar);
        }

        if (onSaveBuroRecord) {
          onSaveBuroRecord({
            score,
            categoriaScore: scoreInfo.cat as any,
            cuentasEnBuro,
            cuentasPuntuales,
            cuentasAtrasadas,
            consultasUltimos6Meses: consultas6Meses,
            observacionesQuitas,
            resumenBuroText,
            deudasEnfocar: resData.deudasEnfocar,
            fechaUltimoReporte: new Date().toISOString(),
            analisisIA: mainAi
          });
        }
      }
    } catch (err) {
      console.error("Error call analyze buro:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Upload or read Buró file/document
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setDocSuccessMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch('/api/analyze-credit-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            mimeType: file.type || 'application/pdf',
            debts: state.debts,
            incomes: totalIncomes,
            expenses: totalExpenses
          })
        });
        const data = await res.json();
        if (data.success && data.data) {
          const docData = data.data;
          
          if (docData.score) setScore(docData.score);
          if (docData.cuentasEnBuro !== undefined) setCuentasEnBuro(docData.cuentasEnBuro);
          if (docData.cuentasPuntuales !== undefined) setCuentasPuntuales(docData.cuentasPuntuales);
          if (docData.cuentasAtrasadas !== undefined) setCuentasAtrasadas(docData.cuentasAtrasadas);
          if (docData.consultasUltimos6Meses !== undefined) setConsultas6Meses(docData.consultasUltimos6Meses);
          if (docData.observacionesQuitas !== undefined) setObservacionesQuitas(docData.observacionesQuitas);
          if (docData.resumenBuroText) setResumenBuroText(docData.resumenBuroText);

          if (docData.deudasEnfocar) setDeudasEnfocar(docData.deudasEnfocar);
          if (docData.analisisIA) setAiResult(docData.analisisIA);

          if (onSaveBuroRecord) {
            onSaveBuroRecord({
              score: docData.score || score,
              categoriaScore: getScoreInfo(docData.score || score).cat as any,
              cuentasEnBuro: docData.cuentasEnBuro ?? cuentasEnBuro,
              cuentasPuntuales: docData.cuentasPuntuales ?? cuentasPuntuales,
              cuentasAtrasadas: docData.cuentasAtrasadas ?? cuentasAtrasadas,
              consultasUltimos6Meses: docData.consultasUltimos6Meses ?? consultas6Meses,
              observacionesQuitas: docData.observacionesQuitas ?? observacionesQuitas,
              resumenBuroText: docData.resumenBuroText || resumenBuroText,
              deudasEnfocar: docData.deudasEnfocar,
              fechaUltimoReporte: new Date().toISOString(),
              analisisIA: docData.analisisIA
            });
          }

          setDocSuccessMsg('¡Documento analizado exitosamente por la IA! Se extrajeron tus métricas y plan de acción.');
        } else {
          setDocSuccessMsg('No se pudo procesar el archivo. Por favor verifica que sea un documento o imagen legible.');
        }
        setUploadingDoc(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error reading buro file:", err);
      setUploadingDoc(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl md:rounded-3xl p-6 shadow-xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            Módulo Buró de Crédito & IA
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
            Diagnóstico Integral de Historial y Score Crediticio
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            Alinea tus deudas en ZERUM con las reglas de Buró de Crédito en México. Genera un plan de rescate con la IA para elevar tu Score y negociar cuentas.
          </p>
        </div>

        {onOpenReportModal && (
          <button
            type="button"
            onClick={onOpenReportModal}
            className="z-10 flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Reporte PDF</span>
          </button>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Meter & Inputs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Score Meter Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col items-center text-center relative overflow-hidden">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 font-sans">
              Score de Buró de Crédito Registrado
            </span>

            {/* Score Number Display */}
            <div className="relative my-2">
              <span className={`text-5xl font-black font-sans tracking-tight ${scoreInfo.color}`}>
                {score}
              </span>
              <span className="text-xs text-slate-400 font-bold block mt-0.5">
                de 850 Puntos BC
              </span>
            </div>

            {/* Score Bar Meter */}
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden my-3 p-0.5 border border-slate-200 relative">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${scoreInfo.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, ((score - 300) / 550) * 100))}%` }}
              />
            </div>

            {/* Badge & Category */}
            <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${scoreInfo.bg} ${scoreInfo.color}`}>
              <Award className="w-3.5 h-3.5" />
              <span>Nivel: {scoreInfo.cat}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              {scoreInfo.desc}
            </p>
          </div>

          {/* Form: Edit Buró Details */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-600" />
              Ingresar / Actualizar Datos de Buró
            </h3>

            {/* Input Score */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Score BC Actual (300 a 850):
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="300" 
                  max="850" 
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="flex-1 accent-amber-600 cursor-pointer"
                />
                <input 
                  type="number" 
                  min="300" 
                  max="850" 
                  value={score}
                  onChange={(e) => setScore(Math.min(850, Math.max(300, Number(e.target.value))))}
                  className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900 text-center font-mono"
                />
              </div>
            </div>

            {/* Accounts Counts */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Cuentas Puntuales (MOP-01)</label>
                <input 
                  type="number"
                  min="0"
                  value={cuentasPuntuales}
                  onChange={(e) => setCuentasPuntuales(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Cuentas con Atraso / Morosas</label>
                <input 
                  type="number"
                  min="0"
                  value={cuentasAtrasadas}
                  onChange={(e) => setCuentasAtrasadas(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Consultas Últimos 6 Meses</label>
                <input 
                  type="number"
                  min="0"
                  value={consultas6Meses}
                  onChange={(e) => setConsultas6Meses(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 font-mono"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={observacionesQuitas}
                    onChange={(e) => setObservacionesQuitas(e.target.checked)}
                    className="accent-amber-600 rounded cursor-pointer"
                  />
                  <span className="text-[10px] font-extrabold text-slate-700 leading-tight">
                    Tiene Quita / Clave Observación
                  </span>
                </label>
              </div>
            </div>

            {/* Optional Extract Text or Upload Document */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Extracto o Texto del Reporte de Crédito (Opcional)
              </label>
              <textarea
                rows={2}
                value={resumenBuroText}
                onChange={(e) => setResumenBuroText(e.target.value)}
                placeholder="Pega texto de tu reporte de Buró de Crédito o la lista de claves..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Upload File PDF/Image Option */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200/80 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>{uploadingDoc ? 'Procesando Documento...' : 'Subir Estado de Cuenta / PDF de Buró'}</span>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
              {docSuccessMsg && (
                <p className="text-[11px] text-emerald-700 font-bold mt-1.5 text-center flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {docSuccessMsg}
                </p>
              )}
            </div>

            {/* Trigger Button */}
            <button
              type="button"
              onClick={handleGenerateAiAnalysis}
              disabled={loadingAi}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {loadingAi ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analizando con IA de ZERUM...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Plan de Rescate e Impacto en Buró</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: AI Strategy Results */}
        <div className="lg:col-span-7 space-y-6">
          
          {!aiResult ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-4 shadow-sm min-h-[380px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">
                  Aún no has generado el Análisis de Buró
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Haz clic en <strong className="text-slate-800">"Generar Plan de Rescate e Impacto en Buró"</strong> para procesar tus deudas registradas junto a tu Score e historial con la Inteligencia Artificial.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateAiAnalysis}
                disabled={loadingAi}
                className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black rounded-xl cursor-pointer transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Generar Análisis Ahora</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Executive Diagnosis Header */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/90 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Diagnóstico de Inteligencia Financiera
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full border border-amber-200">
                    Nivel: {aiResult.nivelRiesgo || 'Evaluado'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {aiResult.diagnosticoGeneral}
                </p>

                {aiResult.proyeccionPuntos && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-emerald-800 block">Proyección Estimada de Puntos:</span>
                      <span className="text-xs font-black text-emerald-950">{aiResult.proyeccionPuntos}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Deudas Prioritarias a Enfocar */}
              {deudasEnfocar && deudasEnfocar.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-300/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-amber-600" />
                      Deudas Prioritarias en las que Debes Enfocarte
                    </h4>
                    <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                      Estrategia Buró & ZERUM
                    </span>
                  </div>

                  <div className="space-y-3">
                    {deudasEnfocar.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-gradient-to-r from-amber-50/70 via-slate-50 to-white border border-amber-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900 font-sans">
                            {idx + 1}. {item.deudaNombre}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            item.prioridad?.toLowerCase().includes('urgente')
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : item.prioridad?.toLowerCase().includes('alta') 
                              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}>
                            Prioridad {item.prioridad}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {item.motivo}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Factors */}
              {aiResult.factoresClave && aiResult.factoresClave.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/90 space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-600" />
                    Factores que más están Impactando tu Score
                  </h4>
                  <ul className="space-y-2">
                    {aiResult.factoresClave.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Plan Roadmap */}
              {aiResult.planRescateScore && aiResult.planRescateScore.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/90 space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Hoja de Ruta: Plan de Rescate de Score
                  </h4>
                  <div className="space-y-2.5">
                    {aiResult.planRescateScore.map((paso, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-xs font-bold text-slate-800 leading-snug">{paso}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Negotiating Quitas & Advice */}
              {aiResult.quitasYNegociaciones && (
                <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200/90 space-y-2">
                  <h4 className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    Guía de Negociación y Claves MOP de Cobranza
                  </h4>
                  <p className="text-xs text-amber-950 leading-relaxed font-medium">
                    {aiResult.quitasYNegociaciones}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
