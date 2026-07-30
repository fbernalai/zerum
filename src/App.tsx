import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ResumenTab from './components/ResumenTab';
import DeudasTab from './components/DeudasTab';
import GastosTab from './components/GastosTab';
import IngresosTab from './components/IngresosTab';
import PagosTab from './components/PagosTab';
import SuscripcionesTab from './components/SuscripcionesTab';
import BuroTab from './components/BuroTab';
import ReportExportModal from './components/ReportExportModal';
import AuthScreen from './components/AuthScreen';
import OnboardingWizard from './components/OnboardingWizard';
import AdminDashboard from './components/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  AppState, 
  Debt, 
  DebtPayment, 
  Expense, 
  Income, 
  RecurringIncome, 
  RecurringBill, 
  Strategy, 
  UserProfile,
  FinancialAccount,
  FinancialCommitment,
  BuroRecord
} from './types';
import { 
  subscribeUserSubcollection, 
  addUserSubcolDoc, 
  updateUserSubcolDoc, 
  deleteUserSubcolDoc,
  logoutUser
} from './lib/firebase';
import { MotorFinanciero } from './lib/motorFinanciero';
import { LogOut, Loader2, Sparkles, Flame, Coins, Shield, FileText } from 'lucide-react';

function AppContent() {
  const { currentUser, userProfileDoc, loading, refreshUserProfile, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('resumen');
  const [todayString, setTodayString] = useState('');

  // Multi-Tenant Real-Time Firestore Collections
  const [compromisos, setCompromisos] = useState<FinancialCommitment[]>([]);
  const [gastos, setGastos] = useState<Expense[]>([]);
  const [ingresos, setIngresos] = useState<Income[]>([]);
  const [pagos, setPagos] = useState<DebtPayment[]>([]);
  const [suscripciones, setSuscripciones] = useState<RecurringBill[]>([]);
  const [cuentas, setCuentas] = useState<FinancialAccount[]>([]);
  const [buroRecord, setBuroRecord] = useState<BuroRecord | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [subperfiles, setSubperfiles] = useState<UserProfile[]>([
    { 
      id: 'principal', 
      name: 'Principal', 
      avatarColor: 'bg-brand-primary', 
      state: { debts: [], expenses: [], incomes: [], strategy: 'avalancha', recurring: null } 
    }
  ]);
  
  const [activeProfileId, setActiveProfileId] = useState<string>('principal');
  const [strategy, setStrategy] = useState<Strategy>('avalancha');
  const [recurringIncome, setRecurringIncome] = useState<RecurringIncome | null>(null);

  // Today Date String
  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    };
    const formatted = today.toLocaleDateString('es-MX', options);
    setTodayString(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, []);

  // Real-Time Subscriptions for User Subcollections
  useEffect(() => {
    if (!currentUser || !userProfileDoc?.onboardingCompletado) return;

    const uid = currentUser.uid;

    const unsub1 = subscribeUserSubcollection<FinancialCommitment>(uid, 'compromisos', (data) => {
      setCompromisos(data);
    });

    const unsub2 = subscribeUserSubcollection<Expense>(uid, 'gastos', (data) => {
      setGastos(data);
    });

    const unsub3 = subscribeUserSubcollection<Income>(uid, 'ingresos', (data) => {
      setIngresos(data);
    });

    const unsub4 = subscribeUserSubcollection<DebtPayment>(uid, 'pagos', (data) => {
      setPagos(data);
    });

    const unsub5 = subscribeUserSubcollection<RecurringBill>(uid, 'suscripciones', (data) => {
      setSuscripciones(data);
    });

    const unsub6 = subscribeUserSubcollection<FinancialAccount>(uid, 'cuentas', (data) => {
      setCuentas(data);
    });

    const unsub7 = subscribeUserSubcollection<UserProfile>(uid, 'perfiles', (data) => {
      const defaultProf: UserProfile = { 
        id: 'principal', 
        name: userProfileDoc?.nombre || 'Principal', 
        avatarColor: 'bg-brand-primary', 
        state: { debts: [], expenses: [], incomes: [], strategy: 'avalancha', recurring: null } 
      };

      if (data && data.length > 0) {
        const hasPrincipal = data.some(p => p.id === 'principal');
        if (!hasPrincipal) {
          setSubperfiles([defaultProf, ...data]);
        } else {
          setSubperfiles(data);
        }
      } else {
        setSubperfiles([defaultProf]);
      }
    });

    const unsub8 = subscribeUserSubcollection<BuroRecord>(uid, 'buro', (data) => {
      if (data && data.length > 0) {
        setBuroRecord(data[0]);
      }
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
    };
  }, [currentUser, userProfileDoc]);

  const handleSaveBuroRecord = async (record: BuroRecord) => {
    setBuroRecord(record);
    if (!currentUser) return;
    const docId = record.id || 'buro_actual';
    await updateUserSubcolDoc(currentUser.uid, 'buro', docId, { ...record, id: docId });
  };

  // Convert FinancialCommitments to Debt Interface for Compatibility
  const debtsCompatible: Debt[] = compromisos.map(c => ({
    ...c,
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    inicial: c.montoOriginal || c.montoActual,
    actual: c.montoActual,
    tasa: c.tasaInteresAnual || 0,
    pago: c.pagoPeriodico,
    pagoNoInteres: c.pagoNoInteres || 0,
    diaLimite: c.diaLimitePago || 15,
    pagoElegidoTipo: 'minimo'
  }));

  // Construct AppState
  const appState: AppState = {
    debts: debtsCompatible,
    expenses: gastos,
    incomes: ingresos,
    strategy: strategy,
    recurring: recurringIncome,
    payments: pagos,
    recurringBills: suscripciones,
    accounts: cuentas
  };

  // 1. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <div className="text-sm font-bold tracking-wider text-slate-300">
            ZERUM Cifrado e Inicializando...
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated user
  if (!currentUser) {
    return <AuthScreen />;
  }

  // 3. Admin view
  if (userProfileDoc?.rol === 'admin') {
    return <AdminDashboard />;
  }

  // 4. Onboarding requirement
  if (!userProfileDoc?.onboardingCompletado) {
    return (
      <OnboardingWizard 
        uid={currentUser.uid} 
        userEmail={currentUser.email || ''} 
        onComplete={refreshUserProfile} 
      />
    );
  }

  // ---------- REAL-TIME FIRESTORE MUTATIONS ----------

  // Add Commitment (Debt / Loan / Credit Card / etc)
  const handleAddDebt = async (newDebt: Omit<Debt, 'id'>) => {
    if (!currentUser) return;
    const commitmentDoc: Omit<FinancialCommitment, 'id'> = {
      nombre: newDebt.nombre,
      tipo: (newDebt.tipo as any) || 'tarjeta',
      categoria: 'Deudas y Créditos',
      montoOriginal: newDebt.inicial || newDebt.actual,
      montoActual: newDebt.actual,
      pagoPeriodico: newDebt.pago,
      pagoNoInteres: newDebt.pagoNoInteres,
      tasaInteresAnual: newDebt.tasa,
      diaLimitePago: newDebt.diaLimite,
      estatus: 'activo',
      frecuenciaPago: 'mensual',
      comprasMSI: newDebt.comprasMeses,
      mensualidadesPersonalizadas: newDebt.mensualidadesPersonalizadas,
      listaMensualidades: newDebt.listaMensualidades
    };

    await addUserSubcolDoc(currentUser.uid, 'compromisos', commitmentDoc);
  };

  // Update Commitment
  const handleUpdateDebt = async (id: string, updatedFields: Partial<Debt>) => {
    if (!currentUser) return;
    const patch: any = {};
    if (updatedFields.nombre !== undefined) patch.nombre = updatedFields.nombre;
    if (updatedFields.actual !== undefined) patch.montoActual = updatedFields.actual;
    if (updatedFields.inicial !== undefined) patch.montoOriginal = updatedFields.inicial;
    if (updatedFields.pago !== undefined) patch.pagoPeriodico = updatedFields.pago;
    if (updatedFields.pagoNoInteres !== undefined) patch.pagoNoInteres = updatedFields.pagoNoInteres;
    if (updatedFields.tasa !== undefined) patch.tasaInteresAnual = updatedFields.tasa;
    if (updatedFields.diaLimite !== undefined) patch.diaLimitePago = updatedFields.diaLimite;
    if (updatedFields.comprasMeses !== undefined) patch.comprasMSI = updatedFields.comprasMeses;

    await updateUserSubcolDoc(currentUser.uid, 'compromisos', id, patch);
  };

  // Delete Commitment
  const handleDeleteDebt = async (id: string) => {
    if (!currentUser) return;
    await deleteUserSubcolDoc(currentUser.uid, 'compromisos', id);
  };

  // Add Expense
  const handleAddExpense = async (
    newExpense: Omit<Expense, 'id'>, 
    opcional?: { deudaId?: string; esMSI?: boolean; mesesMSI?: number }
  ) => {
    if (!currentUser) return;
    await addUserSubcolDoc(currentUser.uid, 'gastos', newExpense);

    // Si está vinculado a un compromiso
    if (opcional?.deudaId) {
      const target = compromisos.find(c => c.id === opcional.deudaId);
      if (target) {
        const nuevoActual = target.montoActual + newExpense.monto;
        await updateUserSubcolDoc(currentUser.uid, 'compromisos', target.id, {
          montoActual: nuevoActual,
          montoOriginal: Math.max(target.montoOriginal || 0, nuevoActual)
        });
      }
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    if (!currentUser) return;
    await deleteUserSubcolDoc(currentUser.uid, 'gastos', id);
  };

  // Add Income
  const handleAddIncome = async (newIncome: Omit<Income, 'id'>) => {
    if (!currentUser) return;
    await addUserSubcolDoc(currentUser.uid, 'ingresos', newIncome);
  };

  // Delete Income
  const handleDeleteIncome = async (id: string) => {
    if (!currentUser) return;
    await deleteUserSubcolDoc(currentUser.uid, 'ingresos', id);
  };

  // Add Payment
  const handleAddPayment = async (newPay: Omit<DebtPayment, 'id'>) => {
    if (!currentUser) return;
    await addUserSubcolDoc(currentUser.uid, 'pagos', newPay);

    // Update target commitment balance
    const target = compromisos.find(c => c.id === newPay.deudaId);
    if (target) {
      const nuevoActual = Math.max(0, target.montoActual - newPay.monto);
      await updateUserSubcolDoc(currentUser.uid, 'compromisos', target.id, {
        montoActual: nuevoActual
      });
    }
  };

  // Delete Payment
  const handleDeletePayment = async (id: string) => {
    if (!currentUser) return;
    const payToDelete = pagos.find(p => p.id === id);
    if (payToDelete) {
      await deleteUserSubcolDoc(currentUser.uid, 'pagos', id);
      const target = compromisos.find(c => c.id === payToDelete.deudaId);
      if (target) {
        await updateUserSubcolDoc(currentUser.uid, 'compromisos', target.id, {
          montoActual: target.montoActual + payToDelete.monto
        });
      }
    }
  };

  // Strategy Update
  const handleUpdateStrategy = (newStrat: Strategy) => {
    setStrategy(newStrat);
  };

  // Recurring Salary Save
  const handleSaveRecurring = (recurring: RecurringIncome) => {
    setRecurringIncome(recurring);
  };

  // Add Recurring Bill
  const handleAddRecurringBill = async (newBill: Omit<RecurringBill, 'id'>) => {
    if (!currentUser) return;
    await addUserSubcolDoc(currentUser.uid, 'suscripciones', newBill);
  };

  // Update Recurring Bill
  const handleUpdateRecurringBill = async (id: string, updated: Partial<RecurringBill>) => {
    if (!currentUser) return;
    await updateUserSubcolDoc(currentUser.uid, 'suscripciones', id, updated);
  };

  // Delete Recurring Bill
  const handleDeleteRecurringBill = async (id: string) => {
    if (!currentUser) return;
    await deleteUserSubcolDoc(currentUser.uid, 'suscripciones', id);
  };

  // Toggle Pay Recurring Bill
  const handleTogglePayRecurringBill = async (id: string) => {
    if (!currentUser) return;
    const targetBill = suscripciones.find(b => b.id === id);
    if (!targetBill) return;

    const nextStatus: 'pending' | 'paid' = targetBill.status === 'pending' ? 'paid' : 'pending';
    await updateUserSubcolDoc(currentUser.uid, 'suscripciones', id, { status: nextStatus });

    // Link to credit card commitment if applicable
    if (targetBill.paymentMethodId && targetBill.paymentMethodId !== 'cash' && targetBill.paymentMethodId !== 'debit') {
      const targetCommitment = compromisos.find(c => c.id === targetBill.paymentMethodId);
      if (targetCommitment) {
        const diff = nextStatus === 'paid' ? targetBill.amount : -targetBill.amount;
        await updateUserSubcolDoc(currentUser.uid, 'compromisos', targetCommitment.id, {
          montoActual: Math.max(0, targetCommitment.montoActual + diff)
        });
      }
    }
  };

  // Add Subprofile (Francisco, Esposa, Negocio, etc.)
  const handleAddProfile = async (name: string, avatarColor: string) => {
    if (!currentUser) return;

    // Save default principal profile to Firestore if it exists in state
    const principalProf = subperfiles.find(p => p.id === 'principal') || {
      id: 'principal',
      name: userProfileDoc?.nombre || 'Principal',
      avatarColor: 'bg-brand-primary',
      state: { debts: [], expenses: [], incomes: [], strategy: 'avalancha', recurring: null }
    };
    await updateUserSubcolDoc(currentUser.uid, 'perfiles', 'principal', principalProf);

    const newProf: UserProfile = {
      id: 'prof_' + Date.now().toString(36),
      name,
      avatarColor,
      state: { debts: [], expenses: [], incomes: [], strategy: 'avalancha', recurring: null }
    };
    await updateUserSubcolDoc(currentUser.uid, 'perfiles', newProf.id, newProf);
    setSubperfiles(prev => {
      const exists = prev.some(p => p.id === newProf.id);
      return exists ? prev : [...prev, newProf];
    });
    setActiveProfileId(newProf.id);
  };

  // Delete Subprofile
  const handleDeleteProfile = async (id: string) => {
    if (!currentUser || id === 'principal') return;

    await deleteUserSubcolDoc(currentUser.uid, 'perfiles', id);
    
    setSubperfiles(prev => {
      const filtered = prev.filter(p => p.id !== id);
      return filtered.length > 0 ? filtered : [{
        id: 'principal',
        name: userProfileDoc?.nombre || 'Principal',
        avatarColor: 'bg-brand-primary',
        state: { debts: [], expenses: [], incomes: [], strategy: 'avalancha', recurring: null }
      }];
    });

    if (activeProfileId === id) {
      setActiveProfileId('principal');
    }
  };

  // Import JSON Data Handler
  const handleImportData = async (imported: any) => {
    if (!currentUser || !imported) return;
    const uid = currentUser.uid;

    if (imported.strategy) {
      setStrategy(imported.strategy);
    }
    if (imported.recurring) {
      setRecurringIncome(imported.recurring);
    }

    // 1. Debts / Compromisos
    const rawDebts = imported.compromisos || imported.debts || [];
    const newCompromisosList: FinancialCommitment[] = [];
    for (const d of rawDebts) {
      const docId = d.id || ('c_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
      const commitmentDoc: FinancialCommitment = {
        id: docId,
        nombre: d.nombre || 'Deuda Importada',
        tipo: d.tipo || 'tarjeta',
        categoria: d.categoria || 'Deudas y Créditos',
        montoOriginal: Number(d.montoOriginal || d.inicial || d.actual || 0),
        montoActual: Number(d.montoActual !== undefined ? d.montoActual : (d.actual || 0)),
        pagoPeriodico: Number(d.pagoPeriodico || d.pago || 0),
        pagoNoInteres: Number(d.pagoNoInteres || 0),
        tasaInteresAnual: Number(d.tasaInteresAnual !== undefined ? d.tasaInteresAnual : (d.tasa || 0)),
        diaLimitePago: Number(d.diaLimitePago || d.diaLimite || 15),
        estatus: d.estatus || 'activo',
        frecuenciaPago: d.frecuenciaPago || 'mensual',
        comprasMSI: d.comprasMSI || d.comprasMeses,
        mensualidadesPersonalizadas: d.mensualidadesPersonalizadas,
        listaMensualidades: d.listaMensualidades
      };
      await updateUserSubcolDoc(uid, 'compromisos', docId, commitmentDoc);
      newCompromisosList.push(commitmentDoc);
    }
    if (newCompromisosList.length > 0) setCompromisos(newCompromisosList);

    // 2. Expenses / Gastos
    const rawGastos = imported.gastos || imported.expenses || [];
    const newGastosList: Expense[] = [];
    for (const g of rawGastos) {
      const docId = g.id || ('g_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
      const expenseDoc: Expense = {
        id: docId,
        monto: Number(g.monto || 0),
        categoria: g.categoria || 'Otro',
        nota: g.nota || g.concepto || 'Gasto importado',
        fecha: g.fecha || new Date().toISOString()
      };
      await updateUserSubcolDoc(uid, 'gastos', docId, expenseDoc);
      newGastosList.push(expenseDoc);
    }
    if (newGastosList.length > 0) setGastos(newGastosList);

    // 3. Incomes / Ingresos
    const rawIngresos = imported.ingresos || imported.incomes || [];
    const newIngresosList: Income[] = [];
    for (const inc of rawIngresos) {
      const docId = inc.id || ('i_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
      const incomeDoc: Income = {
        id: docId,
        monto: Number(inc.monto || 0),
        fuente: inc.fuente || 'Ingreso importado',
        fecha: inc.fecha || new Date().toISOString(),
        tipo: inc.tipo === 'Fijo' || inc.tipo === 'fijo' ? 'Fijo' : 'Variable'
      };
      await updateUserSubcolDoc(uid, 'ingresos', docId, incomeDoc);
      newIngresosList.push(incomeDoc);
    }
    if (newIngresosList.length > 0) setIngresos(newIngresosList);

    // 4. Payments / Pagos
    const rawPagos = imported.pagos || imported.payments || [];
    const newPagosList: DebtPayment[] = [];
    for (const p of rawPagos) {
      const docId = p.id || ('p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
      const paymentDoc: DebtPayment = {
        id: docId,
        deudaId: p.deudaId || '',
        deudaNombre: p.deudaNombre || 'Deuda',
        monto: Number(p.monto || 0),
        fecha: p.fecha || new Date().toISOString(),
        nota: p.nota || 'Pago importado'
      };
      await updateUserSubcolDoc(uid, 'pagos', docId, paymentDoc);
      newPagosList.push(paymentDoc);
    }
    if (newPagosList.length > 0) setPagos(newPagosList);

    // 5. Suscripciones / Recurring bills
    const rawSuscripciones = imported.suscripciones || imported.recurringBills || [];
    const newSuscripcionesList: RecurringBill[] = [];
    for (const s of rawSuscripciones) {
      const docId = s.id || ('s_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
      const billDoc: RecurringBill = {
        id: docId,
        name: s.name || s.nombre || 'Suscripción',
        type: s.type || 'subscription',
        amount: Number(s.amount || s.monto || 0),
        dueDateDay: Number(s.dueDateDay || s.dueDay || s.diaPago || 1),
        category: s.category || s.categoria || 'Servicios',
        status: s.status || 'pending',
        paymentMethodId: s.paymentMethodId || 'cash'
      };
      await updateUserSubcolDoc(uid, 'suscripciones', docId, billDoc);
      newSuscripcionesList.push(billDoc);
    }
    if (newSuscripcionesList.length > 0) setSuscripciones(newSuscripcionesList);

    // 6. Cuentas / Accounts
    const rawCuentas = imported.cuentas || imported.accounts || [];
    const newCuentasList: FinancialAccount[] = [];
    for (const a of rawCuentas) {
      const docId = a.id || ('acc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
      const accDoc: FinancialAccount = {
        id: docId,
        nombre: a.nombre || 'Cuenta',
        tipo: a.tipo || 'debito',
        saldoActual: Number(a.saldoActual || a.saldo || 0),
        moneda: a.moneda || 'MXN',
        bancoOResponsable: a.bancoOResponsable || a.institucion || 'Banco'
      };
      await updateUserSubcolDoc(uid, 'cuentas', docId, accDoc);
      newCuentasList.push(accDoc);
    }
    if (newCuentasList.length > 0) setCuentas(newCuentasList);
  };

  // Render Router
  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumen':
        return (
          <ResumenTab 
            state={appState} 
            onUpdateStrategy={handleUpdateStrategy}
            onImportData={handleImportData}
            onUpdateDebt={handleUpdateDebt}
            payments={pagos}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
          />
        );
      case 'deudas':
        return (
          <DeudasTab 
            debts={debtsCompatible}
            payments={pagos}
            onAddDebt={handleAddDebt}
            onDeleteDebt={handleDeleteDebt}
            onUpdateDebt={handleUpdateDebt}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
            activeProfileId={activeProfileId}
          />
        );
      case 'buro':
        return (
          <BuroTab 
            state={appState}
            userProfile={userProfileDoc}
            buroRecord={buroRecord}
            onSaveBuroRecord={handleSaveBuroRecord}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        );
      case 'recurrentes':
        return (
          <SuscripcionesTab
            recurringBills={suscripciones}
            debts={debtsCompatible}
            onAddBill={handleAddRecurringBill}
            onUpdateBill={handleUpdateRecurringBill}
            onDeleteBill={handleDeleteRecurringBill}
            onTogglePayBill={handleTogglePayRecurringBill}
          />
        );
      case 'gastos':
        return (
          <GastosTab 
            expenses={gastos}
            debts={debtsCompatible}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        );
      case 'ingresos':
        return (
          <IngresosTab 
            recurring={recurringIncome}
            onSaveRecurring={handleSaveRecurring}
            incomes={ingresos}
            onAddIncome={handleAddIncome}
            onDeleteIncome={handleDeleteIncome}
          />
        );
      case 'pagos':
        return (
          <PagosTab 
            debts={debtsCompatible}
            payments={pagos}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-canvas-outer w-full font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        todayString={todayString} 
        profiles={subperfiles}
        activeProfileId={activeProfileId}
        onSelectProfile={setActiveProfileId}
        onAddProfile={handleAddProfile}
        onDeleteProfile={handleDeleteProfile}
      />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-5">
        {/* User Greeting & Sync Header - Hephaestus Divine Forge White Marble Theme */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-amber-200/80 border-t-4 border-t-amber-500 gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-slate-950 font-black flex items-center justify-center text-xl shadow-md shadow-amber-500/20 shrink-0">
              {userProfileDoc?.nombre?.charAt(0) || 'Z'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600" />
                  Artesano {userProfileDoc?.nombre || 'Usuario'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                  <Coins className="w-3 h-3 text-amber-600" />
                  {userProfileDoc?.moneda || 'MXN'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Fragua Zerum Conectada
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{userProfileDoc?.correo}</span>
                <span>•</span>
                <span className="text-slate-700 font-semibold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  {userProfileDoc?.objetivoPrincipal === 'salir_deudas' ? 'Estrategia: Destrucción de Deudas (Martillo de Hefesto)' : 
                   userProfileDoc?.objetivoPrincipal === 'ahorrar' ? 'Estrategia: Bóveda de Resguardo del Olimpo' : 
                   'Estrategia: Libertad Financiera'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="py-2 px-3 sm:px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Descargar Reporte PDF de Avances y Gastos Diarios"
            >
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              <span>Descargar Reporte PDF</span>
            </button>

            <button
              onClick={() => logout()}
              className="py-2 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        <div className="bg-canvas-inner rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-pronounced border border-gray-100/50 min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-4rem)]">
          {renderTabContent()}
        </div>

        {/* Modal: Printable Report */}
        <ReportExportModal 
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          state={appState}
          payments={pagos}
          userProfile={userProfileDoc}
          buroRecord={buroRecord}
        />

        <footer className="text-center text-[11px] text-text-muted leading-relaxed max-w-2xl mx-auto pt-4 pb-8">
          ZERUM v3.0 • Todos los datos están protegidos por Firebase Authentication y Firestore Security Rules.
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
