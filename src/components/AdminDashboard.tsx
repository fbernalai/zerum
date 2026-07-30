import React, { useEffect, useState } from 'react';
import { getAdminAnonymousStats, logoutUser } from '../lib/firebase';
import { AdminStatsDoc } from '../types';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  Cpu, 
  MessageSquare, 
  LogOut, 
  RefreshCw, 
  Lock,
  Sparkles,
  BarChart3
} from 'lucide-react';

export default function AdminDashboard({ onExit }: { onExit?: () => void }) {
  const [stats, setStats] = useState<AdminStatsDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    const data = await getAdminAnonymousStats();
    if (data) {
      setStats(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 sm:p-8">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Panel Administrador Zerum</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                Anónimo & Aislado
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Métricas agregadas globales. Sin acceso a datos privados de usuarios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadStats}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 transition-all cursor-pointer"
            title="Actualizar Estadísticas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => logoutUser()}
            className="py-2.5 px-4 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión Admin</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Usuarios Registrados</span>
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {loading ? '...' : stats?.totalUsuarios || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Cuentas creadas en Firestore</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Usuarios Activos</span>
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {loading ? '...' : stats?.usuariosActivosMes || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Sesiones iniciadas este mes</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Versión Instalada</span>
              <Cpu className="w-5 h-5 text-teal-400" />
            </div>
            <div className="text-lg font-black text-white truncate">
              {loading ? '...' : stats?.versionInstalada || 'v3.0.0'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Arquitectura Firestore Multi-Tenant</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Feedback Recibido</span>
              <MessageSquare className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {loading ? '...' : stats?.retroalimentacionesContador || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Comentarios anónimos</div>
          </div>
        </div>

        {/* Security Isolation Banner */}
        <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex items-start gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white mb-1">
              Garantía de Privacidad de Zerum
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Las reglas de seguridad de Firestore (<code>firestore.rules</code>) bloquean estrictamente las consultas transversales. El rol administrador no posee permisos de lectura sobre la subcolección de datos de ningún usuario (<code>/usuarios/{'{uid}'}/...</code>). Todas las estadísticas mostradas arriba son estrictamente agregadas y anónimas.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
