export interface CompraMeses {
  id: string;
  concepto: string;
  montoTotal: number;
  mesesTotales: number;
  mesesPagados: number;
  montoMensual: number;
  fechaCompra: string;
}

export interface MensualidadPlazo {
  mes: number;
  monto: number;
  pagado: boolean;
  fecha?: string;
}

// ----------------------------------------------------
// MODELO DE COMPROMISOS FINANCIEROS (Entidad Unificada)
// ----------------------------------------------------
export type TipoCompromiso = 
  | 'tarjeta'
  | 'prestamo'
  | 'hipoteca'
  | 'auto'
  | 'nomina'
  | 'fonacot'
  | 'infonavit'
  | 'tanda'
  | 'caja_ahorro'
  | 'suscripcion'
  | 'servicio'
  | 'colegiatura'
  | 'prestamo_familiar'
  | 'compra_msi'
  | 'cooperacion'
  | 'app_prestamo'
  | 'negocio'
  | 'otro'
  | 'Tarjeta de crédito'
  | 'Crédito de auto'
  | 'Préstamo de app'
  | 'Préstamo personal'
  | (string & {});

export interface FinancialCommitment {
  id: string;
  perfilId?: string; // Subperfil (ej. 'principal', 'esposa', 'negocio')
  nombre: string;
  tipo: TipoCompromiso;
  categoria?: string;
  
  // Saldos y Montos
  montoOriginal?: number;
  montoActual: number;
  pagoPeriodico: number; // Pago mínimo o cuota mensual
  pagoNoInteres?: number;
  
  // Tasas y Plazos
  tasaInteresAnual?: number;
  plazoMesesTotal?: number;
  plazoMesesRestante?: number;
  
  // Fechas Clave
  diaCorte?: number;
  diaLimitePago: number;
  
  // Estado y Clasificación
  estatus?: 'activo' | 'saldado' | 'pausado';
  frecuenciaPago?: 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'anual';
  
  // Vinculaciones
  cuentaCobroId?: string; // ID de la cuenta bancaria / tarjeta de débito o crédito
  
  // Específicos
  comprasMSI?: CompraMeses[];
  mensualidadesPersonalizadas?: boolean;
  listaMensualidades?: MensualidadPlazo[];
  esKavak?: boolean;
  notas?: string;
}

// Compatibilidad heredada con interfaz Debt
export interface Debt {
  id: string;
  nombre: string;
  tipo: TipoCompromiso;
  inicial: number;
  actual: number;
  tasa: number;
  pago: number;
  pagoNoInteres: number;
  diaLimite: number;
  pagoElegidoTipo: 'minimo' | 'no_interes' | 'ninguno' | 'otro';
  pagoElegidoMonto?: number;
  limiteCredito?: number;
  diaCorte?: number;
  mesesPlazo?: number;
  mensualidadesPersonalizadas?: boolean;
  listaMensualidades?: MensualidadPlazo[];
  comprasMeses?: CompraMeses[];
  esKavak?: boolean;
  categoria?: string;
  montoActual?: number;
  pagoPeriodico?: number;
  diaLimitePago?: number;
  estatus?: 'activo' | 'saldado' | 'pausado';
}

// ----------------------------------------------------
// CUENTAS BANCARIAS Y FINANCIERAS
// ----------------------------------------------------
export type TipoCuenta = 'efectivo' | 'debito' | 'credito' | 'billetera' | 'inversion' | 'otro';

export interface FinancialAccount {
  id: string;
  perfilId?: string;
  nombre: string;
  tipo: TipoCuenta;
  bancoOResponsable?: string;
  saldoActual: number;
  moneda: string;
  ultimosCuatroDigitos?: string;
  colorHex?: string;
  esPredeterminada?: boolean;
}

// ----------------------------------------------------
// MOVIMIENTOS: INGRESOS, GASTOS Y PAGOS
// ----------------------------------------------------
export interface Expense {
  id: string;
  perfilId?: string;
  categoria: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
  nota: string;
  cuentaId?: string; // ID de la cuenta usada
  compromisoId?: string; // Opcional: vinculado a un compromiso (tarjeta, servicio, etc)
}

export interface Income {
  id: string;
  perfilId?: string;
  fuente: string;
  tipo: 'Fijo' | 'Variable';
  monto: number;
  fecha: string; // YYYY-MM-DD
  auto?: boolean;
  cuentaId?: string; // Cuenta receptora
}

export interface DebtPayment {
  id: string;
  perfilId?: string;
  deudaId: string; // ID del compromiso
  deudaNombre: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
  nota?: string;
  cuentaOrigenId?: string; // Cuenta de la cual salió el dinero
  compromisoId?: string;
}

export interface RecurringIncome {
  fuente: string;
  monto: number;
  dia1: number | null;
  dia2: number | null;
  cuentaId?: string;
}

export type Strategy = 'avalancha' | 'bolanieve';

export type RecurringBillType = 'subscription' | 'service';

export interface RecurringBill {
  id: string;
  name: string;
  type: RecurringBillType;
  amount: number;
  dueDateDay: number;
  billingCycle?: 'monthly' | 'bimonthly' | 'annual';
  category?: string;
  paymentMethodId: string;
  status: 'pending' | 'paid';
  lastPaidMonth?: string;
  notes?: string;
  logoIcon?: string;
  compromisoId?: string;
}

export interface AppState {
  debts: Debt[];
  expenses: Expense[];
  incomes: Income[];
  strategy: Strategy;
  recurring: RecurringIncome | null;
  payments?: DebtPayment[];
  recurringBills?: RecurringBill[];
  accounts?: FinancialAccount[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatarColor: string;
  state: AppState;
}

// ----------------------------------------------------
// ESTRUCTURA DE USUARIO Y ONBOARDING FIRESTORE
// ----------------------------------------------------
export type UserRole = 'usuario' | 'admin';

export interface OnboardingAnswers {
  nombre: string;
  pais: string;
  moneda: string;
  tipoIngreso: 'fijo' | 'variable' | 'mixto';
  frecuenciaIngreso: 'semanal' | 'quincenal' | 'mensual';
  ingresoPromedio: number;
  objetivoPrincipal: 'salir_deudas' | 'ahorrar' | 'control_gastos' | 'inversión' | 'libertad_financiera';
  tieneHijos: boolean;
  tieneAuto: boolean;
  tieneMascotas: boolean;
  compromisosIniciales: TipoCompromiso[];
}

export interface UserProfileDoc {
  uid: string;
  nombre: string;
  correo: string;
  foto?: string;
  rol: UserRole;
  pais: string;
  moneda: string;
  tipoIngreso: string;
  frecuenciaIngreso: string;
  ingresoPromedio: number;
  objetivoPrincipal: string;
  fechaRegistro: string;
  ultimaConexion: string;
  onboardingCompletado: boolean;
  onboardingData?: OnboardingAnswers;
}

// ----------------------------------------------------
// MOTOR FINANCIERO Y METRICAS CALCULADAS
// ----------------------------------------------------
export interface MotorSummary {
  flujoMensualTotal: number;
  compromisosMensualesTotales: number;
  flujoDisponible: number;
  flujoLibre: number;
  deudaTotalActual: number;
  saludFinancieraScore: number; // 0 a 100
  mesesProyectadosLibreDeuda: number;
  fechaEstimadaLibertad: string;
  proximosPagos: {
    id: string;
    nombre: string;
    monto: number;
    fechaLimite: string;
    tipo: string;
    estatus: 'pendiente' | 'pagado';
  }[];
}

// ----------------------------------------------------
// ESTADÍSTICAS ANONIMAS ADMINISTRADOR
// ----------------------------------------------------
export interface BuroRecord {
  id?: string;
  score: number; // 300 to 850
  categoriaScore: 'Excelente' | 'Bueno' | 'Regular' | 'Riesgo' | 'Sin Datos';
  cuentasEnBuro: number;
  cuentasPuntuales: number;
  cuentasAtrasadas: number;
  consultasUltimos6Meses: number;
  observacionesQuitas: boolean;
  fechaUltimoReporte?: string;
  resumenBuroText?: string;
  deudasEnfocar?: {
    deudaNombre: string;
    prioridad: 'Urgente' | 'Alta' | 'Media' | string;
    motivo: string;
  }[];
  analisisIA?: {
    diagnosticoGeneral: string;
    nivelRiesgo: string;
    factoresClave: string[];
    estrategiasPagoYBuro: string[];
    planRescateScore: string[];
    proyeccionPuntos: string;
    quitasYNegociaciones: string;
  };
}

export interface AdminStatsDoc {
  totalUsuarios: number;
  usuariosActivosMes: number;
  versionInstalada: string;
  fechaActualizacion: string;
  retroalimentacionesContador: number;
}
