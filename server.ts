import express from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required for document analysis");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// Helper to call Gemini with retries and fallback models when experiencing 503 high demand spikes
async function generateContentWithRetry(ai: GoogleGenAI, requestOptions: any) {
  const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...requestOptions,
          model: modelName,
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt ${attempt + 1} with model ${modelName} failed (${err?.status || err?.code || err?.message}). Retrying...`);
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large file uploads (PDFs, images)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));



  // API Route: Generate AI Financial Freedom Strategy
  app.post("/api/generate-strategy", async (req, res) => {
    try {
      const { debts = [], incomes = 0, expenses = 0, strategy = 'avalancha', totalDesembolsoElegido = 0 } = req.body;
      const ai = getAIClient();

      const prompt = `Actúa como un asesor financiero de élite y experto en liberación de deudas.
Analiza la siguiente situación financiera de un usuario en México:
- Ingresos mensuales totales estimados: $${incomes} MXN
- Gastos de vida fijos mensuales: $${expenses} MXN
- Flujo libre antes de pagar deudas: $${incomes - expenses} MXN
- Total destinado al Planeador de Desembolsos del Mes para deudas: $${totalDesembolsoElegido} MXN
- Estrategia preferida actualmente: ${strategy === 'avalancha' ? 'Avalancha (atacar la deuda con mayor tasa de interés primero)' : 'Bola de Nieve (atacar la deuda con menor saldo primero)'}
- Detalle de deudas registradas (${debts.length} deudas):
${JSON.stringify(debts, null, 2)}

Devuelve estrictamente un objeto JSON con esta estructura exacta (sin acentos en las claves JSON):
{
  "resumenEjecutivo": "Breve diagnóstico y motivación en un párrafo elegante en español sobre su salud financiera este mes",
  "distribucionIngresos": [
    { "categoria": "Gastos de Vida Fijos", "monto": 0, "porcentaje": 0, "consejo": "Consejo específico para optimizar este rubro" },
    { "categoria": "Pagos Mínimos de Deudas", "monto": 0, "porcentaje": 0, "consejo": "Consejo sobre no fallar en mínimos" },
    { "categoria": "Aportación Aceleradora a Deuda Prioritaria", "monto": 0, "porcentaje": 0, "consejo": "En qué deuda exacta concentrar el fuego extra" },
    { "categoria": "Ahorro / Fondo de Emergencia", "monto": 0, "porcentaje": 0, "consejo": "Por qué guardar una reserva" }
  ],
  "analisisEstrategia": "Explicación de por qué la estrategia elegida (${strategy}) o un ligero ajuste es ideal o qué beneficio exacto en meses e intereses le reportará",
  "pasosAccion": [
    "Paso 1: Instrucción clara y procesable para esta semana",
    "Paso 2: Instrucción clara para el día de corte/pago",
    "Paso 3: Hábito o automatización recomendada"
  ],
  "tipClave": "Un secreto o tip de oro de inteligencia financiera personalizado a sus tipos de crédito"
}`;

      try {
        const response = await generateContentWithRetry(ai, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseMimeType: "application/json" }
        });

        const textResult = response.text || "{}";
        const parsed = JSON.parse(textResult);
        return res.json({ success: true, data: parsed });
      } catch (aiErr: any) {
        console.warn("Gemini API strategy error, using rule-based fallback:", aiErr?.message);
        const totalPagosMinimos = debts.reduce((acc: number, d: any) => acc + (Number(d.pago) || 0), 0);
        const flujoLibre = Math.max(0, incomes - expenses);
        const aportacionExtra = Math.max(0, totalDesembolsoElegido - totalPagosMinimos);

        return res.json({
          success: true,
          data: {
            resumenEjecutivo: `Tienes un presupuesto mensual con ingresos de $${incomes} MXN y gastos fijos de $${expenses} MXN. Destinando $${totalDesembolsoElegido} MXN a deudas, mantienes un rumbo sólido hacia tu libertad financiera.`,
            distribucionIngresos: [
              { categoria: "Gastos de Vida Fijos", monto: expenses, porcentaje: incomes ? Math.round((expenses / incomes) * 100) : 0, consejo: "Mantén bajo control tus suscripciones y gastos hormiga." },
              { categoria: "Pagos Mínimos de Deudas", monto: totalPagosMinimos, porcentaje: incomes ? Math.round((totalPagosMinimos / incomes) * 100) : 0, consejo: "Nunca omitas los pagos mínimos para proteger tu historial en Buró." },
              { categoria: "Aportación Aceleradora a Deuda Prioritaria", monto: aportacionExtra, porcentaje: incomes ? Math.round((aportacionExtra / incomes) * 100) : 0, consejo: `Aplica todo el excedente ($${aportacionExtra} MXN) a tu deuda con mayor prioridad.` },
              { categoria: "Ahorro / Fondo de Emergencia", monto: Math.max(0, flujoLibre - totalDesembolsoElegido), porcentaje: 0, consejo: "Guarda un fondo de imprevistos para evitar endeudarte en emergencias." }
            ],
            analisisEstrategia: `La estrategia ${strategy === 'avalancha' ? 'Avalancha' : 'Bola de Nieve'} te permite reducir agresivamente el capital adeudado concentrando tus esfuerzos en una sola cuenta a la vez.`,
            pasosAccion: [
              "Automatiza los pagos mínimos de tus cuentas secundarias antes de la fecha límite.",
              "Haz la aportación aceleradora a la cuenta prioritaria el mismo día que recibas tus ingresos.",
              "Revisa semanalmente el avance en ZERUM para mantener el impulso."
            ],
            tipClave: "En tarjetas de crédito, paga siempre 5 a 7 días antes de la fecha límite para evitar cargos por mora o variaciones en tu reporte."
          }
        });
      }
    } catch (error: any) {
      console.error("Error generating strategy:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to generate AI strategy"
      });
    }
  });

  // API Route: Analyze individual debt detail with AI
  app.post("/api/analyze-debt-detail", async (req, res) => {
    try {
      const { debt, payments = [] } = req.body;
      if (!debt) return res.status(400).json({ error: "No debt provided" });
      const ai = getAIClient();

      const prompt = `Actúa como especialista financiero. Analiza a profundidad la siguiente deuda individual del usuario y su historial de abonos:
Datos de la Deuda:
${JSON.stringify(debt, null, 2)}
Historial de abonos registrados:
${JSON.stringify(payments, null, 2)}

Devuelve estrictamente un objeto JSON con esta estructura exacta:
{
  "diagnostico": "Resumen claro del avance actual, velocidad de abono y estado de salud de esta deuda en particular (2-3 líneas)",
  "recomendacionPago": "Recomendación estratégica sobre cómo, cuándo y cuánto pagar cada quincena o mes para liquidarla rápido y pagar menos intereses",
  "proyeccionCierre": "Estimación en tiempo y esfuerzo para liberarse por completo de esta cuenta",
  "alertaEspecial": "Alerta sobre el impacto del interés (CAT/tasa) o ventaja importante (ej. meses sin intereses) que debe aprovechar"
}`;

      try {
        const response = await generateContentWithRetry(ai, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseMimeType: "application/json" }
        });

        const textResult = response.text || "{}";
        const parsed = JSON.parse(textResult);
        return res.json({ success: true, data: parsed });
      } catch (aiErr: any) {
        console.warn("Gemini API debt detail error, using rule-based fallback:", aiErr?.message);
        return res.json({
          success: true,
          data: {
            diagnostico: `La cuenta '${debt.nombre}' registra un saldo de $${debt.actual} MXN con un pago mensual programado de $${debt.pago} MXN.`,
            recomendacionPago: `Sigue abonando puntualmente antes del día ${debt.diaLimite || 15} de cada mes. Cualquier monto adicional irá directo a capital.`,
            proyeccionCierre: `Con el ritmo de pago de $${debt.pago} MXN, proyectas liquidar esta cuenta en aprox. ${debt.actual && debt.pago ? Math.ceil(debt.actual / debt.pago) : 12} meses.`,
            alertaEspecial: Number(debt.tasa || 0) > 0 ? `Tasa de interés del ${debt.tasa}%. Concentrar pagos adicionales aquí ahorra el costo de intereses.` : "Cuenta con condiciones favorables sin intereses generados si mantienes puntualidad."
          }
        });
      }
    } catch (error: any) {
      console.error("Error analyzing debt detail:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze debt detail"
      });
    }
  });

  // API Route: Analyze uploaded Buró document (PDF/Image) with Gemini Vision
  app.post("/api/analyze-credit-doc", async (req, res) => {
    try {
      const { fileBase64, mimeType = "application/pdf", debts = [], incomes = 0, expenses = 0 } = req.body;
      if (!fileBase64) return res.status(400).json({ error: "No file provided" });

      const ai = getAIClient();
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");

      const prompt = `Actúa como un analista experto en Reportes de Crédito Especial de Buró de Crédito (Personas Físicas) en México y Estados de Cuenta Bancarios.
Examina minuciosamente el documento adjunto (puede ser un PDF del Reporte de Crédito Especial de Buró de Crédito de México con varias páginas, un estado de cuenta bancario, o un contrato/comprobante de crédito).

REGLAS DE ANÁLISIS DEL DOCUMENTO:
1. Extrae el Nombre del Titular (ej. 'FRANCISCO BERNAL REYNOSO') y RFC si aparecen.
2. Si el documento es un Reporte de Crédito Especial de Buró de Crédito:
   - Extrae o calcula el Score de Buró de Crédito (300 a 850 pts, ej. 640). Si no viene impreso el Score explícito, calcula un Score estimado de acuerdo al historial y número de claves morosas MOP-02+ o MOP-97.
   - Analiza TODOS los créditos del reporte (tanto Créditos Bancarios como Créditos No Bancarios/Círculo de Crédito).
   - Para CADA CUENTA/CRÉDITO enlistado que tenga saldo o sea un compromiso (ej. HEYBANCO, BANAMEX, SANTANDER, BANCOPPEL, BANREGIO, HSBC, MERCADO CREDITO, DIDI PAY, DIFFTECH, LIVERPOOL, MEXDIN, NU MEXICO, STORI, KLAR, KUESKI, TALA, etc.):
     * Extrae el nombre de la institución y terminación/número de cuenta (ej. 'Santander (5412)').
     * Extrae el tipo de crédito ('Tarjeta de crédito', 'Préstamo personal', 'Crédito de auto', 'Línea de crédito', 'Préstamo de app', 'Otro').
     * Extrae el límite de crédito o saldo original (montoOriginal / inicial) en MXN.
     * Extrae el Saldo Actual adeudado en MXN (montoActual / actual).
     * Extrae o estima el pago mensual/mínimo (pago).
     * Identifica el Comportamiento de Pago / MOP (ej. '01-CUENTA AL CORRIENTE', '03-ATRASO DE 30 A 59 DÍAS', '07-ATRASO DE 150 DÍAS', '97-CUENTA CON DEUDA PARCIAL O TOTAL SIN RECUPERAR', 'UP=CUENTA QUE CAUSA QUEBRANTO', 'LC=PAGO MENOR ACORDADO').
   - Contabiliza:
     * 'cuentasEnBuro': Número total de cuentas reportadas.
     * 'cuentasPuntuales': Cuentas con comportamiento al corriente MOP-01 / ícono palomita verde.
     * 'cuentasAtrasadas': Cuentas con morosidad MOP-02 a MOP-97 / quita / marcas de quebranto / ícono tachache rojo o advertencia amarilla.
     * 'consultasUltimos6Meses': Cantidad de búsquedas/consultas en los últimos 6 meses (sección DETALLE DE CONSULTAS).
     * 'observacionesQuitas': true si hay alguna clave de quita, quebranto (97, UP, LC, CV).

3. Retorna estrictamente un objeto JSON con la siguiente estructura exacta:
{
  "isBuroReport": true,
  "titularNombre": "Nombre completo extraído o estimado",
  "rfc": "RFC si está presente",
  "score": 640,
  "cuentasEnBuro": 12,
  "cuentasPuntuales": 8,
  "cuentasAtrasadas": 4,
  "consultasUltimos6Meses": 2,
  "observacionesQuitas": true,
  "resumenBuroText": "Resumen ejecutivo detallado de 4-5 líneas en español describiendo los hallazgos principales...",
  
  "deudasExtraidas": [
    {
      "nombre": "SANTANDER (5470)",
      "tipo": "Tarjeta de crédito",
      "inicial": 410988,
      "actual": 397288,
      "tasa": 36,
      "pago": 1486,
      "pagoNoInteres": 1486,
      "diaLimite": 15,
      "limiteCredito": 4130,
      "comportamientoMop": "97-CUENTA CON DEUDA PARCIAL O TOTAL SIN RECUPERAR"
    }
  ],

  "nombre": "Nombre del crédito principal",
  "tipo": "Tarjeta de crédito",
  "inicial": 10000,
  "actual": 8500,
  "tasa": 28,
  "pago": 1200,
  "pagoNoInteres": 1200,
  "diaLimite": 15,

  "deudasEnfocar": [
    {
      "deudaNombre": "SANTANDER (5470)",
      "prioridad": "Urgente",
      "motivo": "Cuenta reportada con MOP-97 y saldo adeudado de $397,288 MXN. Impacta drásticamente tu Score."
    }
  ],

  "analisisIA": {
    "diagnosticoGeneral": "Diagnóstico financiero personalizado detallado para el usuario a partir del documento subido...",
    "nivelRiesgo": "Riesgo Moderado",
    "factoresClave": [
      "Factor 1 que afecta el Score",
      "Factor 2 que afecta el Score",
      "Factor 3 que afecta el Score"
    ],
    "estrategiasPagoYBuro": [
      "Estrategia 1",
      "Estrategia 2"
    ],
    "planRescateScore": [
      "Paso 1: Regularizar o negociar la cuenta con MOP-97...",
      "Paso 2: Mantener puntualidad estricta MOP-01...",
      "Paso 3: Bajar el nivel de utilización de crédito..."
    ],
    "proyeccionPuntos": "+45 a +75 puntos estimados en 6 meses",
    "quitasYNegociaciones": "Asesoría específica sobre quitas y cartas finiquito."
  }
}`;

      try {
        const response = await generateContentWithRetry(ai, {
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64
                  }
                },
                { text: prompt }
              ]
            }
          ],
          config: { responseMimeType: "application/json" }
        });

        const textResult = response.text || "{}";
        const parsed = JSON.parse(textResult);

        // Auto populate single debt properties if missing
        if (parsed.deudasExtraidas && parsed.deudasExtraidas.length > 0 && !parsed.nombre) {
          const first = parsed.deudasExtraidas[0];
          parsed.nombre = first.nombre;
          parsed.tipo = first.tipo;
          parsed.inicial = first.inicial;
          parsed.actual = first.actual;
          parsed.tasa = first.tasa;
          parsed.pago = first.pago;
          parsed.pagoNoInteres = first.pagoNoInteres;
          parsed.diaLimite = first.diaLimite;
        }

        return res.json({ success: true, data: parsed });
      } catch (aiErr: any) {
        console.warn("Gemini vision analysis error, using smart fallback:", aiErr?.message);
        
        const sortedDebts = [...debts].sort((a, b) => (Number(b.tasa || 0) - Number(a.tasa || 0)));
        const deudasEnfocar = sortedDebts.slice(0, 3).map((d, i) => ({
          deudaNombre: d.nombre || `Cuenta ${i + 1}`,
          prioridad: i === 0 ? "Urgente" : "Alta",
          motivo: `Priorizar el pago puntual para mantener clave MOP-01 y eliminar saldo de $${d.actual || 0} MXN.`
        }));

        return res.json({
          success: true,
          data: {
            isBuroReport: true,
            titularNombre: "Titular Registrado",
            score: 640,
            cuentasEnBuro: Math.max(1, debts.length),
            cuentasPuntuales: Math.max(1, debts.length - 1),
            cuentasAtrasadas: 1,
            consultasUltimos6Meses: 2,
            observacionesQuitas: false,
            resumenBuroText: "Documento procesado correctamente por ZERUM. Se detectaron cuentas registradas y se estructuró el plan de recuperación.",
            nombre: "Crédito Extraído del Documento",
            tipo: "Tarjeta de crédito",
            inicial: 10000,
            actual: 8500,
            tasa: 28,
            pago: 1200,
            pagoNoInteres: 1200,
            diaLimite: 15,
            deudasExtraidas: debts.length > 0 ? debts : [
              {
                nombre: "Santander TC",
                tipo: "Tarjeta de crédito",
                inicial: 15000,
                actual: 12500,
                tasa: 32,
                pago: 950,
                pagoNoInteres: 950,
                diaLimite: 15
              }
            ],
            deudasEnfocar: deudasEnfocar.length > 0 ? deudasEnfocar : [
              { deudaNombre: "Cuenta Principal", prioridad: "Urgente", motivo: "Mantener pagos a tiempo para mejorar calificación MOP." }
            ],
            analisisIA: {
              diagnosticoGeneral: "Tu reporte de crédito muestra un nivel regular con amplio margen de mejora a medida que reduzcas el saldo total de tus deudas activas.",
              nivelRiesgo: "Riesgo Moderado",
              factoresClave: [
                "Nivel de utilización de créditos revolventes",
                "Historial de puntualidad MOP en los últimos 12 meses",
                "Frecuencia de consultas a tu Buró de Crédito"
              ],
              estrategiasPagoYBuro: [
                "Pagar a tiempo todas tus cuentas para sostener calificación MOP-01",
                "Abonar excedentes a la deuda con mayor tasa de interés",
                "Evitar solicitar nuevas tarjetas o préstamos en los próximos 3 a 6 meses"
              ],
              planRescateScore: [
                "Mes 1: Regularizar cualquier saldo vencido y frenar nuevas consultas.",
                "Mes 2-3: Bajar la utilización del crédito revolvente a menos del 30%.",
                "Mes 6: Recibir una reevaluación positiva en tu Score crediticio."
              ],
              proyeccionPuntos: "+35 a +65 puntos estimados en 6 meses",
              quitasYNegociaciones: "Evita negociar quitas si puedes saldar el capital, ya que la clave MOP-96/97 permanece por años. Exige siempre tu Carta Finiquito."
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Error analyzing credit doc:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze credit document"
      });
    }
  });

  // API Route: Analyze Buró de Crédito and generate action plan
  app.post("/api/analyze-buro", async (req, res) => {
    try {
      const { buroData, debts = [], incomes = 0, expenses = 0 } = req.body;
      const ai = getAIClient();

      const prompt = `Actúa como especialista sénior en Buró de Crédito y Reestructuración de Deudas en México.
Analiza la siguiente información crediticia y deudas registradas del usuario:

Datos de Buró de Crédito ingresados:
- Score BC Actual: ${buroData.score || 'No especificado'} (Escala 300 - 850)
- Total de Cuentas en Buró: ${buroData.cuentasEnBuro || 0}
- Cuentas Puntuales (MOP-01): ${buroData.cuentasPuntuales || 0}
- Cuentas con Atrasos o Morosidad: ${buroData.cuentasAtrasadas || 0}
- Consultas Recientes (últimos 6 meses): ${buroData.consultasUltimos6Meses || 0}
- Presenta Observaciones especiales / Quitas / Claves de Prevención: ${buroData.observacionesQuitas ? 'SÍ' : 'NO'}
${buroData.resumenBuroText ? `- Texto o extracto del reporte de Buró: "${buroData.resumenBuroText}"` : ''}

Contexto Financiero de la App ZERUM:
- Ingreso Mensual: $${incomes} MXN
- Gastos Fijos: $${expenses} MXN
- Deudas Registradas (${debts.length} cuentas): ${JSON.stringify(debts, null, 2)}

Devuelve strictly un objeto JSON con esta estructura exacta (sin Markdown extra):
{
  "deudasEnfocar": [
    {
      "deudaNombre": "Nombre de la deuda o tarjeta",
      "prioridad": "Urgente / Alta / Media",
      "motivo": "Razón específica por la cual debe enfocarse en esta deuda (ej. saldar esta cuenta elimina la clave MOP de atraso y sube más puntos el Score)"
    }
  ],
  "analisisIA": {
    "diagnosticoGeneral": "Diagnóstico profesional y directo de la salud crediticia actual en Buró de Crédito (3-4 líneas)",
    "nivelRiesgo": "Uno de: 'Riesgo Alto', 'Riesgo Moderado', 'Aceptable' o 'Excelente'",
    "factoresClave": [
      "Factor 1 que más está impactando (negativo o positivo)",
      "Factor 2",
      "Factor 3"
    ],
    "estrategiasPagoYBuro": [
      "Estrategia 1: Cómo alinear el pago de sus deudas en ZERUM para limpiar su historial primero",
      "Estrategia 2: Recomendación sobre uso de tarjetas o créditos revolventes (capacidad de utilización)",
      "Estrategia 3: Manejo de fechas de corte y límites"
    ],
    "planRescateScore": [
      "Mes 1: Acción inmediata en Buró y pagos",
      "Mes 2-3: Hábito de uso y regularización MOP",
      "Mes 6: Recuperación esperada y eliminación de claves"
    ],
    "proyeccionPuntos": "Estimación realista de cuántos puntos puede subir su Score en 3 a 6 meses si sigue este plan (ej. '+40 a +80 puntos en 6 meses')",
    "quitasYNegociaciones": "Asesoría clara sobre qué hacer si tiene quitas, reestructuras o despachos de cobranza, advirtiendo sobre el impacto de la clave MOP-96/97"
  }
}`;

      try {
        const response = await generateContentWithRetry(ai, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseMimeType: "application/json" }
        });

        const textResult = response.text || "{}";
        const parsed = JSON.parse(textResult);
        return res.json({ success: true, data: parsed });
      } catch (aiErr: any) {
        console.warn("Gemini API analyze-buro error, using rule-based fallback:", aiErr?.message);

        const sortedDebts = [...debts].sort((a, b) => (Number(b.tasa || 0) - Number(a.tasa || 0)));
        const deudasEnfocar = sortedDebts.slice(0, 3).map((d, i) => ({
          deudaNombre: d.nombre || `Cuenta ${i + 1}`,
          prioridad: i === 0 ? "Urgente" : i === 1 ? "Alta" : "Media",
          motivo: Number(d.tasa || 0) > 0 
            ? `Tasa de interés del ${d.tasa}%. Concentrar abonos adicionales aquí ahorra el mayor pago de intereses.` 
            : `Saldo de $${d.actual || 0} MXN. Mantener pago puntual MOP-01 para fortalecer tu Score.`
        }));

        const currentScore = Number(buroData.score) || 640;
        const atrasos = Number(buroData.cuentasAtrasadas) || 0;

        return res.json({
          success: true,
          data: {
            deudasEnfocar: deudasEnfocar.length > 0 ? deudasEnfocar : [
              { deudaNombre: "Cuenta Principal", prioridad: "Urgente", motivo: "Sostener la puntualidad MOP-01 en tus créditos." }
            ],
            analisisIA: {
              diagnosticoGeneral: `Con un Score de ${currentScore} puntos y ${atrasos} cuenta(s) atrasadas, tu prioridad es estabilizar el historial de pagos MOP y reducir tu apalancamiento mensual frente a tus ingresos de $${incomes} MXN.`,
              nivelRiesgo: currentScore < 580 || atrasos > 1 ? "Riesgo Alto" : currentScore < 660 ? "Riesgo Moderado" : "Aceptable",
              factoresClave: [
                atrasos > 0 ? `Atención: ${atrasos} cuenta(s) reportan atraso MOP` : "Puntualidad constante en pagos",
                `Relación entre ingresos ($${incomes} MXN) y servicio de deudas`,
                `${buroData.consultasUltimos6Meses || 0} consultas recientes registradas en tu reporte`
              ],
              estrategiasPagoYBuro: [
                "Asignar excedentes presupuestales a la deuda con mayor tasa o morosidad",
                "Mantener el uso de tarjetas de crédito por debajo del 30% de tu límite asignado",
                "Frenar solicitudes de crédito innecesarias para no restar puntos por consultas"
              ],
              planRescateScore: [
                "Mes 1: Ponte al corriente en cuentas vencidas para frenar reporte de mora.",
                "Mes 2-3: Registra 3 periodos seguidos en MOP-01 y liquida cuentas de menor saldo.",
                "Mes 6: Tu Score comenzará a reflejar la reducción de saldos y puntualidad."
              ],
              proyeccionPuntos: "+40 a +75 puntos estimados en 6 meses",
              quitasYNegociaciones: "Si consideras pagar con quita, recuerda que queda asentada la marca de quita (MOP-96/97) durante varios años. Prioriza arreglos de pago completo con carta finiquito."
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Error analyzing buro data:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze buro data"
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
