import { 
  FinancialCommitment, 
  FinancialAccount, 
  Income, 
  Expense, 
  DebtPayment, 
  RecurringBill, 
  Strategy, 
  MotorSummary 
} from '../types';

export class MotorFinanciero {
  
  /**
   * Calcula el resumen financiero integral del usuario
   */
  static calcularResumenIntegral(
    ingresos: Income[],
    gastos: Expense[],
    compromisos: FinancialCommitment[],
    recurrentes: RecurringBill[],
    cuentas: FinancialAccount[],
    estrategia: Strategy = 'avalancha'
  ): MotorSummary {
    
    // 1. Ingresos Mensuales Totales
    const flujoMensualTotal = ingresos.reduce((sum, ing) => sum + (ing.monto || 0), 0);

    // 2. Gastos Variables Mensuales Totales
    const gastosVariablesTotales = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

    // 3. Compromisos Fijos y Deudas Mensuales Totales
    const compromisosDeudasMensuales = compromisos
      .filter(c => c.estatus === 'activo')
      .reduce((sum, c) => sum + (c.pagoPeriodico || 0), 0);

    const recurrentesMensuales = recurrentes
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + (r.billingCycle === 'annual' ? r.amount / 12 : r.amount), 0);

    const compromisosMensualesTotales = compromisosDeudasMensuales + recurrentesMensuales;

    // 4. Flujo Disponible = Ingresos - Compromisos Fijos
    const flujoDisponible = Math.max(0, flujoMensualTotal - compromisosMensualesTotales);

    // 5. Flujo Libre Real = Flujo Disponible - Gastos Variables
    const flujoLibre = flujoDisponible - gastosVariablesTotales;

    // 6. Deuda Total Actual Acumulada
    const deudaTotalActual = compromisos
      .filter(c => c.estatus === 'activo')
      .reduce((sum, c) => sum + (c.montoActual || 0), 0);

    // 7. Próximos Pagos Inmediatos
    const hoy = new Date();
    const diaHoy = hoy.getDate();

    const proximosPagosCompromisos = compromisos
      .filter(c => c.estatus === 'activo')
      .map(c => {
        let fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth(), c.diaLimitePago || 15);
        if (c.diaLimitePago < diaHoy) {
          fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth() + 1, c.diaLimitePago || 15);
        }
        return {
          id: c.id,
          nombre: c.nombre,
          monto: c.pagoPeriodico,
          fechaLimite: fechaLimite.toISOString().split('T')[0],
          tipo: c.tipo,
          estatus: 'pendiente' as const
        };
      });

    const proximosPagosRecurrentes = recurrentes
      .filter(r => r.status === 'pending')
      .map(r => {
        let fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth(), r.dueDateDay || 15);
        if (r.dueDateDay < diaHoy) {
          fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth() + 1, r.dueDateDay || 15);
        }
        return {
          id: r.id,
          nombre: r.name,
          monto: r.amount,
          fechaLimite: fechaLimite.toISOString().split('T')[0],
          tipo: r.type,
          estatus: 'pendiente' as const
        };
      });

    const proximosPagos = [...proximosPagosCompromisos, ...proximosPagosRecurrentes]
      .sort((a, b) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime())
      .slice(0, 5);

    // 8. Cálculo de Salud Financiera Score (0 a 100)
    let saludFinancieraScore = 100;

    if (flujoMensualTotal > 0) {
      const ratioDeudaIngreso = (compromisosMensualesTotales / flujoMensualTotal) * 100;
      if (ratioDeudaIngreso > 50) saludFinancieraScore -= 30;
      else if (ratioDeudaIngreso > 35) saludFinancieraScore -= 15;

      if (flujoLibre < 0) saludFinancieraScore -= 25;
    } else {
      saludFinancieraScore = 50;
    }

    if (deudaTotalActual === 0) saludFinancieraScore = 100;
    saludFinancieraScore = Math.max(0, Math.min(100, saludFinancieraScore));

    // 9. Estimación de Salida de Deudas (Meses proyectados)
    let mesesProyectadosLibreDeuda = 0;
    if (deudaTotalActual > 0) {
      const abonoMensualEstimado = Math.max(compromisosDeudasMensuales, compromisosDeudasMensuales + Math.max(0, flujoLibre));
      if (abonoMensualEstimado > 0) {
        mesesProyectadosLibreDeuda = Math.ceil(deudaTotalActual / abonoMensualEstimado);
      } else {
        mesesProyectadosLibreDeuda = 999;
      }
    }

    const fechaLibertad = new Date();
    fechaLibertad.setMonth(fechaLibertad.getMonth() + mesesProyectadosLibreDeuda);
    const fechaEstimadaLibertad = mesesProyectadosLibreDeuda < 999 
      ? fechaLibertad.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
      : 'Requiere ajuste de flujo';

    return {
      flujoMensualTotal,
      compromisosMensualesTotales,
      flujoDisponible,
      flujoLibre,
      deudaTotalActual,
      saludFinancieraScore,
      mesesProyectadosLibreDeuda,
      fechaEstimadaLibertad,
      proximosPagos
    };
  }

  /**
   * Ordena compromisos según la Estrategia (Avalancha o Bola de Nieve)
   */
  static ordenarCompromisosEstrategia(
    compromisos: FinancialCommitment[], 
    estrategia: Strategy
  ): FinancialCommitment[] {
    const copia = [...compromisos].filter(c => c.estatus === 'activo');
    if (estrategia === 'avalancha') {
      // Ordena por mayor Tasa de Interés
      return copia.sort((a, b) => (b.tasaInteresAnual || 0) - (a.tasaInteresAnual || 0));
    } else {
      // Bola de Nieve: Ordena por menor Saldo Actual
      return copia.sort((a, b) => a.montoActual - b.montoActual);
    }
  }
}
