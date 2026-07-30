import React from 'react';
import { LayoutDashboard, CreditCard, Receipt, Wallet, Calendar, ChevronDown, Plus, Trash2, Check, CheckCircle2, Repeat, Flame, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  todayString: string;
  profiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onAddProfile: (name: string, color: string) => void;
  onDeleteProfile: (id: string) => void;
  onResetAllData?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  todayString,
  profiles,
  activeProfileId,
  onSelectProfile,
  onAddProfile,
  onDeleteProfile,
  onResetAllData
}: SidebarProps) {

  const [isOpen, setIsOpen] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [newProfileName, setNewProfileName] = React.useState('');
  const [selectedColor, setSelectedColor] = React.useState('bg-brand-primary');

  const defaultProfile: UserProfile = {
    id: 'principal',
    name: 'Principal',
    avatarColor: 'bg-brand-primary',
    state: { debts: [], expenses: [], incomes: [], strategy: 'avalancha', recurring: null }
  };

  const activeProfile = (profiles && profiles.length > 0)
    ? (profiles.find(p => p.id === activeProfileId) || profiles[0] || defaultProfile)
    : defaultProfile;

  const colors = [
    { name: 'Azul', value: 'bg-brand-primary' },
    { name: 'Rosa', value: 'bg-pink-500' },
    { name: 'Naranja', value: 'bg-amber-500' },
    { name: 'Verde', value: 'bg-emerald-500' },
    { name: 'Morado', value: 'bg-purple-500' },
    { name: 'Rojo', value: 'bg-rose-500' },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onAddProfile(newProfileName.trim(), selectedColor);
    setNewProfileName('');
    setIsAdding(false);
    setIsOpen(false);
  };

  const navItems = [
    { id: 'resumen', label: 'Resumen General', icon: LayoutDashboard },
    { id: 'deudas', label: 'Mis Deudas', icon: CreditCard },
    { id: 'buro', label: 'Buró & Análisis IA', icon: ShieldCheck },
    { id: 'recurrentes', label: 'Suscripciones', icon: Repeat },
    { id: 'pagos', label: 'Calendario de Pagos', icon: CheckCircle2 },
    { id: 'gastos', label: 'Registro de Gastos', icon: Receipt },
    { id: 'ingresos', label: 'Registro de Ingresos', icon: Wallet },
  ];


  return (
    <aside className="w-full lg:w-[260px] lg:min-w-[260px] bg-canvas-outer border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col h-auto lg:h-screen sticky top-0 z-40 shadow-sm lg:shadow-none">
      {/* Brand Logo Area */}
      <div className="px-5 py-4 lg:px-6 lg:py-5 border-b border-gray-200/60 flex items-center justify-between lg:justify-start gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img src="/zerum-symbol.svg" alt="ZERUM Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col leading-none">
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center font-sans">
              <span className="text-blue-600 font-extrabold">Z</span>
              <span className="text-slate-900">ERUM</span>
            </h1>
            <span className="text-[9px] font-extrabold text-amber-700 tracking-wider uppercase mt-1 flex items-center gap-1 font-sans">
              <Flame className="w-2.5 h-2.5 text-amber-500" />
              La Fragua Financiera
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 lg:hidden">
          <Calendar className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-[11px] font-bold text-text-muted">
            {todayString.split(',')[1] || todayString}
          </span>
        </div>
      </div>

      {/* Profile Bar */}
      <div className="px-4 py-3 lg:px-5 lg:py-3.5 bg-slate-50/80 border-b border-slate-200/70 relative z-50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 font-sans">
            Perfil Activo
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
          >
            <span>Cambiar</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2.5 min-w-0">
          {/* Active Profile Avatar */}
          <div className={`w-7 h-7 rounded-full ${activeProfile.avatarColor} flex items-center justify-center text-white text-xs font-bold uppercase select-none shrink-0 shadow-xs`}>
            {activeProfile.name.charAt(0)}
          </div>
          <span className="text-xs font-extrabold text-slate-800 truncate leading-snug font-sans" title={activeProfile.name}>
            {activeProfile.name}
          </span>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-4 right-4 lg:left-5 lg:right-5 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200/90 p-2 space-y-1.5 animate-fadeIn z-50">
            {!isAdding ? (
              <>
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-text-muted tracking-wider border-b border-gray-100 pb-1.5">
                  Seleccionar Perfil
                </div>
                <div className="max-h-[160px] overflow-y-auto space-y-1 scrollbar-none">
                  {profiles.map(p => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                        p.id === activeProfileId
                          ? 'bg-pastel-blue text-brand-primary font-bold'
                          : 'hover:bg-gray-50 text-text-body'
                      }`}
                      onClick={() => {
                        onSelectProfile(p.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5.5 h-5.5 rounded-full ${p.avatarColor} flex items-center justify-center text-white text-[10px] font-bold uppercase`}>
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-xs">{p.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {p.id === activeProfileId && (
                          <Check className="w-3.5 h-3.5 text-brand-primary" />
                        )}
                        {profiles.length > 1 && p.id !== 'principal' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProfile(p.id);
                            }}
                            className="p-1 text-gray-400 hover:text-accent-danger rounded-md hover:bg-gray-100 transition-colors"
                            title="Eliminar Perfil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-brand-primary hover:bg-pastel-blue/50 rounded-lg transition-colors border border-dashed border-brand-primary/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear Nuevo Perfil
                </button>
                {onResetAllData && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onResetAllData();
                    }}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-accent-danger hover:bg-rose-50 rounded-lg transition-colors border border-transparent cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpiar Todos los Datos
                  </button>
                )}
              </>
            ) : (
              <form onSubmit={handleCreate} className="p-2 space-y-3">
                <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                  Nuevo Perfil
                </div>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Nombre de perfil..."
                  maxLength={16}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  autoFocus
                />
                
                {/* Color selection */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-text-muted">Color de Avatar</span>
                  <div className="grid grid-cols-6 gap-1">
                    {colors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setSelectedColor(c.value)}
                        className={`w-6 h-6 rounded-full ${c.value} flex items-center justify-center text-white relative transition-transform ${selectedColor === c.value ? 'scale-110 ring-2 ring-brand-primary ring-offset-1' : 'opacity-80 hover:opacity-100'}`}
                      >
                        {selectedColor === c.value && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setNewProfileName('');
                    }}
                    className="flex-1 py-1.5 text-[11px] font-bold text-text-muted bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 text-[11px] font-bold text-white bg-brand-primary hover:bg-brand-primary-dark rounded-lg cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Date & Subtext - Only on desktop */}
      <div className="hidden lg:flex px-8 py-4 border-b border-gray-200/40 items-center gap-2.5">
        <Calendar className="w-4 h-4 text-text-muted flex-shrink-0" />
        <p className="text-xs font-semibold text-text-muted leading-relaxed">
          {todayString}
        </p>
      </div>

      {/* Navigation List - Horizontal on mobile, vertical on desktop */}
      <nav className="px-4 py-2.5 lg:py-6 flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto flex-nowrap lg:flex-wrap space-x-1.5 lg:space-x-0 lg:space-y-2 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 lg:gap-3 px-3.5 py-2.5 lg:px-4 lg:py-3.5 rounded-xl transition-all duration-200 text-left cursor-pointer whitespace-nowrap text-xs lg:text-sm flex-shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-950 font-extrabold border-l-4 border-amber-600 shadow-sm'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-amber-50/50'
              }`}
            >
              <Icon className={`w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 ${isActive ? 'text-amber-700' : 'text-slate-500'}`} />
              <span className="font-sans font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / Info Card with Greek Mythology Style - Only on desktop */}
      <div className="hidden lg:block p-6">
        <div className="p-4 rounded-2xl bg-white shadow-sm border border-amber-200/80 relative overflow-hidden">
          {/* Subtle Flame Accent */}
          <div className="absolute right-3 top-3 opacity-15 pointer-events-none">
            <Flame className="w-8 h-8 text-amber-600" />
          </div>

          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 text-amber-800 flex items-center gap-1 font-serif">
              <Flame className="w-3 h-3 text-amber-600" />
              La Forja de Hefesto
            </p>
            <div className="w-full h-2 rounded-full mb-2 bg-slate-100 overflow-hidden border border-amber-200/60">
              <div className="h-full rounded-full w-3/4 bg-gradient-to-r from-amber-500 to-amber-600"></div>
            </div>
            <p className="text-xs text-slate-800 font-bold">
              Modelo Olímpico v2.0
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
