import { GoogleGenAI } from "@google/genai";

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileBase64, mimeType } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: "No file data provided" });
    }

    const cleanBase64 = fileBase64.replace(/^data:([a-zA-Z0-9\/+-]+);base64,/, "");
    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || "application/pdf",
              },
            },
            {
              text: `Analiza este documento financiero, estado de cuenta o contrato de crédito (puede ser tarjeta de crédito, crédito de auto como Kavak, préstamo bancario, etc.).
Extrae los siguientes datos en un objeto JSON válido y puro:
{
  "nombre": "Nombre descriptivo de la cuenta o deuda (ej. 'Volkswagen Gol - Kavak' o 'Tarjeta BBVA')",
  "tipo": "Debe ser estrictamente uno de: 'Tarjeta de crédito', 'Préstamo de app', 'Préstamo personal', 'Crédito de auto', u 'Otro'",
  "inicial": Número entero o decimal con el monto original del crédito, límite de crédito, o financiamiento total. Si no aparece, usa el saldo actual,
  "actual": Número con el saldo actual adeudado (si hay un pago reciente o saldo al corte, toma el adeudado actual),
  "tasa": Número con la tasa de interés anual % (si dice 33.49%, pon 33.49. Si no dice o es meses sin intereses, pon 0),
  "pago": Número con el pago mensual fijo o pago mínimo al mes,
  "pagoNoInteres": Número con el pago para no generar intereses (si es préstamo fijo pon lo mismo que pago),
  "diaLimite": Número entero del día del mes límite de pago (1-31). Si dice día 1, pon 1,
  "limiteCredito": Si es tarjeta de crédito y viene el límite, ponlo en número, si no 0,
  "diaCorte": Si es tarjeta de crédito y viene día de corte (1-31), ponlo, si no 0,
  "mesesPlazo": Número total de meses del plazo si es un crédito a plazos o auto (ej. 12, 24, 60). Si es tarjeta pon 0,
  "resumen": "Breve explicación en español de 2 líneas describiendo el crédito y las condiciones encontradas en el documento"
}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const textResult = response.text || "{}";
    const parsed = JSON.parse(textResult);
    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error analyzing credit document on Vercel:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze document",
    });
  }
}
