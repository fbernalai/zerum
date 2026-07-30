import React, { useState } from 'react';
import { 
  signUpWithEmail, 
  loginWithEmail, 
  loginWithGoogle,
  resetPassword 
} from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  Zap,
  Flame
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export default function AuthScreen() {
  const { loginAsGuest } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  
  // Form Fields
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await loginAsGuest(nombre || 'Usuario Demostración', email || 'demo@zerum.app');
    } catch (e: any) {
      console.error('Error on guest login:', e);
      setErrorMsg('No se pudo acceder en modo demo. Por favor reintenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.warn('Google login notice:', err?.code || err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User intentionally closed or cancelled the popup - do not display an intrusive error banner
        return;
      }
      let msg = 'No se pudo iniciar sesión con Google.';
      if (err?.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        if (!nombre.trim()) {
          setErrorMsg('Por favor ingresa tu nombre completo.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
          setIsSubmitting(false);
          return;
        }
        await signUpWithEmail(email.trim(), password, nombre.trim());
      } else if (mode === 'login') {
        await loginWithEmail(email.trim(), password);
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setSuccessMsg('Se ha enviado un correo con instrucciones para restablecer tu contraseña.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Ocurrió un error en la autenticación.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'El inicio de sesión con correo está desactivado en Firebase Console. Puedes ingresar con Google o usando el Acceso Directo Demo.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo ya está registrado. Por favor inicia sesión.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Correo o contraseña incorrectos.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Por favor escribe un correo electrónico válido.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Soft Ambient Light Glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/8 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-blue-500/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-500/8 blur-[120px] rounded-full pointer-events-none" />

      {/* Greek Key Frame Border Card */}
      <div className="w-full max-w-lg bg-white/95 border border-amber-200/80 border-t-4 border-t-amber-500 backdrop-blur-xl rounded-[32px] p-6 sm:p-9 shadow-[0_20px_50px_-10px_rgba(217,119,6,0.08)] relative z-10 animate-fadeIn">
        
        {/* Mythology Header & Logo */}
        <div className="text-center mb-7">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase tracking-widest mb-4 font-sans">
            <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>LA FRAGUA DE HEFESTO · LIBERTAD FINANCIERA</span>
          </div>

          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 p-2 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-sm flex items-center justify-center">
              <img src="/zerum-symbol.svg" alt="ZERUM Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center justify-center gap-1 font-sans">
            <span className="text-blue-600 font-extrabold">Z</span>
            <span className="text-slate-900">ERUM</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium max-w-xs mx-auto leading-relaxed">
            Forja tu camino financiero con inteligencia. Controla tus deudas e ingresos con claridad sagrada.
          </p>
        </div>

        {/* Tab Switcher */}
        {mode !== 'forgot' && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 mb-6 shadow-inner">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Auth Button */}
        {mode !== 'forgot' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer border border-slate-200 shadow-sm hover:border-slate-300 disabled:opacity-50"
            >
              <GoogleIcon />
              <span>Continuar con Google</span>
            </button>

            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative px-3 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                o con tu correo
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Nombre Completo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="ej. Francisco Ramírez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Contraseña
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <span>Cargando...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Entrar a Zerum</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Crear Mi Cuenta Segura</span>
                  <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Enviar Correo de Recuperación</span>
                  <KeyRound className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {mode !== 'forgot' && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-200/80 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Acceso Directo (Modo Demostración)</span>
              </button>
            </div>
          )}
        </form>

        {mode === 'forgot' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* Security Reassurance */}
        <div className="mt-7 pt-5 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium text-center">
          <Shield className="w-3.5 h-3.5 text-[#00D084] shrink-0" />
          <span>Tus datos financieros están cifrados e independizados por cuenta.</span>
        </div>
      </div>
    </div>
  );
}
