import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import { createRequest, getStoredMockRequests, saveStoredMockRequests, saveStoredMockEvents } from '@/services/requestService';
import { initialRequests, initialEvents } from '@/data/mockData';
import { emitRealtimeEvent } from '@/realtime/bus';
import {
  Sparkles,
  X,
  UserCheck,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  UtensilsCrossed,
  Wrench,
  Brush,
  ChevronDown,
  Building2,
  BedDouble,
  ShieldCheck,
  Check,
  ArrowRight,
} from 'lucide-react';

const HOTEL_ID = 'a0000000-0000-0000-0000-000000000001';

interface Persona {
  id: string;
  name: string;
  title: string;
  type: 'guest' | 'staff' | 'manager';
  roomOrDept: string;
  avatarBg: string;
  route: string;
  authData: any;
}

const PERSONAS: Persona[] = [
  // ── Guests ───────────────────────────────────────────
  {
    id: 'g-alex',
    name: 'Alex Morgan',
    title: 'Guest · VIP Deluxe Room',
    type: 'guest',
    roomOrDept: 'Room 408',
    avatarBg: 'from-amber-400 to-amber-600',
    route: '/guest/dashboard',
    authData: {
      guestId: 'g-1',
      name: 'Alex Morgan',
      roomNumber: '408',
      roomId: 'r-408',
      hotelId: HOTEL_ID,
      stayId: 's-1',
    },
  },
  {
    id: 'g-sarah',
    name: 'Sarah Chen',
    title: 'Guest · Sea View King',
    type: 'guest',
    roomOrDept: 'Room 212',
    avatarBg: 'from-teal-400 to-teal-600',
    route: '/guest/dining',
    authData: {
      guestId: 'g-2',
      name: 'Sarah Chen',
      roomNumber: '212',
      roomId: 'r-212',
      hotelId: HOTEL_ID,
      stayId: 's-2',
    },
  },
  {
    id: 'g-james',
    name: 'James Wilson',
    title: 'Guest · Family Suite',
    type: 'guest',
    roomOrDept: 'Room 317',
    avatarBg: 'from-cyan-400 to-blue-600',
    route: '/guest/concierge',
    authData: {
      guestId: 'g-3',
      name: 'James Wilson',
      roomNumber: '317',
      roomId: 'r-317',
      hotelId: HOTEL_ID,
      stayId: 's-3',
    },
  },
  // ── Operations Team ──────────────────────────────────
  {
    id: 'st-mgr',
    name: 'Antoine Caruana',
    title: 'General Manager · Operations Lead',
    type: 'manager',
    roomOrDept: 'Front Desk / Executive',
    avatarBg: 'from-amber-500 to-red-600',
    route: '/staff/manager',
    authData: {
      staffId: 'st-mgr',
      name: 'Antoine Caruana',
      role: 'manager',
      department: 'Front Desk',
      hotelId: HOTEL_ID,
      housekeepingEligible: true,
      maintenanceEligible: true,
    },
  },
  {
    id: 'st-maria',
    name: 'Maria Vella',
    title: 'Food & Beverage Lead · Kitchen Service',
    type: 'staff',
    roomOrDept: 'Food & Beverage',
    avatarBg: 'from-emerald-400 to-teal-600',
    route: '/staff/menu',
    authData: {
      staffId: 'st-1',
      name: 'Maria Vella',
      role: 'staff',
      department: 'Food & Beverage',
      hotelId: HOTEL_ID,
      housekeepingEligible: true,
      maintenanceEligible: false,
    },
  },
  {
    id: 'st-daniel',
    name: 'Daniel Zahra',
    title: 'Operations Staff · Maintenance & Rooms',
    type: 'staff',
    roomOrDept: 'Maintenance',
    avatarBg: 'from-indigo-400 to-purple-600',
    route: '/staff/rooms',
    authData: {
      staffId: 'st-2',
      name: 'Daniel Zahra',
      role: 'staff',
      department: 'Maintenance',
      hotelId: HOTEL_ID,
      housekeepingEligible: true,
      maintenanceEligible: true,
    },
  },
  {
    id: 'st-lucia',
    name: 'Lucia Grech',
    title: 'Front Desk Specialist · Concierge Dispatch',
    type: 'staff',
    roomOrDept: 'Front Desk',
    avatarBg: 'from-rose-400 to-pink-600',
    route: '/staff/dashboard',
    authData: {
      staffId: 'st-3',
      name: 'Lucia Grech',
      role: 'staff',
      department: 'Front Desk',
      hotelId: HOTEL_ID,
      housekeepingEligible: false,
      maintenanceEligible: false,
    },
  },
];

function playLuxuryChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First bell tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second bell tone (harmonious 5th above)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.9);
  } catch {}
}

export function DemoSwitcher() {
  const { session, switchPersona } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'personas' | 'scenarios'>('personas');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const triggerChime = () => {
    if (soundEnabled) playLuxuryChime();
  };

  const handleSelectPersona = (p: Persona) => {
    switchPersona(p.type, p.authData, p.route);
    triggerChime();
    toast.show({
      type: 'success',
      title: `Switched to ${p.name}`,
      message: `Active as ${p.title} (${p.roomOrDept})`,
      duration: 3500,
    });
    setIsOpen(false);
  };

  // ── Scenarios ──────────────────────────────────────────

  const simulateDiningRush = async () => {
    setIsSimulating(true);
    triggerChime();

    // 1. Order for Room 408
    await createRequest({
      hotelId: HOTEL_ID,
      guestId: 'g-1',
      stayId: 's-1',
      roomId: 'r-408',
      title: 'Dining order: 2 items',
      description: 'Guest placed order for delivery to room 408:\n1 × Spaghetti Carbonara (€18.00)\n1 × Negroni (€13.00)\nTotal: €31.00',
      category: 'Room Service',
      priority: 'Normal',
      source: 'concierge',
    });

    // 2. Order for Room 212
    await createRequest({
      hotelId: HOTEL_ID,
      guestId: 'g-2',
      stayId: 's-2',
      roomId: 'r-212',
      title: 'Dining order: 3 items',
      description: 'Guest placed order for delivery to room 212:\n1 × Grilled Sea Bass (€26.00)\n1 × Caprese Salad (€11.00)\n1 × House Red Wine (bottle) (€28.00)\nTotal: €65.00',
      category: 'Room Service',
      priority: 'Normal',
      source: 'concierge',
    });

    emitRealtimeEvent({ type: 'menu:updated' });
    setIsSimulating(false);

    toast.show({
      type: 'success',
      title: '🍽️ Dining Rush Dispatched!',
      message: '2 in-room dining orders sent to Kitchen & Bar (Rooms 408 & 212). Check Requests tab!',
      duration: 6000,
    });
  };

  const simulateUrgentLeak = async () => {
    setIsSimulating(true);
    triggerChime();

    const req = await createRequest({
      hotelId: HOTEL_ID,
      guestId: 'g-3',
      stayId: 's-3',
      roomId: 'r-317',
      title: 'AC unit dripping water onto desk',
      description: 'Guest in Room 317 reports ceiling air conditioning unit is rapidly dripping water onto the desk and luggage stand. High priority intervention requested.',
      category: 'Maintenance',
      priority: 'Urgent',
      source: 'concierge',
    });

    setIsSimulating(false);

    toast.show({
      type: 'alert',
      title: '⚡ Urgent Maintenance SLA Alert!',
      message: 'Urgent ticket created for Room 317. 15-minute response SLA active in Staff & Manager view.',
      duration: 6000,
    });
  };

  const simulateHousekeepingWave = async () => {
    setIsSimulating(true);
    triggerChime();

    await createRequest({
      hotelId: HOTEL_ID,
      guestId: 'g-2',
      stayId: 's-2',
      roomId: 'r-212',
      title: 'Extra hypoallergenic pillows & turndown',
      description: 'Guest requested 2 extra feather pillows and evening turndown service with fresh bath towels.',
      category: 'Housekeeping',
      priority: 'Normal',
      source: 'concierge',
    });

    setIsSimulating(false);

    toast.show({
      type: 'info',
      title: '🧹 Housekeeping Task Created',
      message: 'Room 212 requested turndown & extra pillows. Assigned to Housekeeping department.',
      duration: 5000,
    });
  };

  const handleResetData = () => {
    saveStoredMockRequests(initialRequests);
    saveStoredMockEvents(initialEvents);
    localStorage.removeItem('dth_mock_menu_items');
    triggerChime();
    toast.show({
      type: 'success',
      title: '✨ Demo Clean Reset Complete',
      message: 'All sample requests, mock orders, and menus restored to original pristine baseline.',
      duration: 4000,
    });
    setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  const currentPersonaName = session?.name ?? 'Not logged in';

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 select-none">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 px-4 py-2.5 text-xs sm:text-sm font-semibold text-amber-300 shadow-2xl border border-amber-500/40 hover:border-amber-400 hover:scale-105 active:scale-95 transition-all backdrop-blur-md"
          title="Open Demo Persona & Scenario Controls"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          </div>
          <span className="font-medium tracking-wide">Demo Studio</span>
          <span className="hidden xs:inline-block max-w-[90px] truncate text-[11px] text-slate-400 font-normal border-l border-slate-700 pl-2">
            {session ? session.name.split(' ')[0] : 'Log in'}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-amber-400/80 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Floating Modal Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-3 sm:p-6 bg-slate-950/40 backdrop-blur-xs animate-fade-in pointer-events-auto">
          <div
            className="w-full sm:w-[440px] max-h-[88vh] flex flex-col rounded-2xl border border-amber-500/30 bg-slate-900/95 backdrop-blur-xl text-white shadow-2xl overflow-hidden animate-slide-up"
            role="dialog"
            aria-label="Demo Studio Controls"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-gold-glow">
                  <Sparkles className="h-4 w-4 text-slate-950 font-bold" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-wide">DoubleTree Malta Studio</h2>
                  <p className="text-[11px] text-amber-300/80">1-Click Personas & Scenario Generator</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSoundEnabled((v) => !v)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Current Active User Banner */}
            <div className="bg-slate-800/60 border-b border-slate-800/80 px-5 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Role:</span>
              <span className="font-semibold text-amber-300 flex items-center gap-1.5 truncate max-w-[260px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                {currentPersonaName}
                {session?.type === 'guest' && session.roomNumber && ` (Rm ${session.roomNumber})`}
                {session && session.type !== 'guest' && ` (${session.role === 'manager' ? 'Manager' : session.department})`}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5">
              <button
                onClick={() => setActiveTab('personas')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'personas'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Switch Persona</span>
              </button>
              <button
                onClick={() => setActiveTab('scenarios')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'scenarios'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Scenario Generator</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {activeTab === 'personas' ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      <BedDouble className="h-3 w-3 text-amber-400" />
                      <span>Hotel Guests (Room Key Pass)</span>
                    </div>
                    <div className="space-y-1.5">
                      {PERSONAS.filter((p) => p.type === 'guest').map((p) => {
                        const isCurrent = session?.name === p.name;
                        return (
                          <button
                            key={p.id}
                            onClick={() => handleSelectPersona(p)}
                            className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              isCurrent
                                ? 'bg-amber-500/15 border-amber-500/50 text-white ring-1 ring-amber-500/30'
                                : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${p.avatarBg} text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0`}>
                                {p.name.split(' ').map((n) => n[0]).join('')}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                                <p className="text-[11px] text-slate-400 truncate">{p.title} · <span className="text-amber-300/90 font-medium">{p.roomOrDept}</span></p>
                              </div>
                            </div>
                            {isCurrent ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            ) : (
                              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      <Building2 className="h-3 w-3 text-sea-400" />
                      <span>Operations & Staff Roster</span>
                    </div>
                    <div className="space-y-1.5">
                      {PERSONAS.filter((p) => p.type !== 'guest').map((p) => {
                        const isCurrent = session?.name === p.name;
                        return (
                          <button
                            key={p.id}
                            onClick={() => handleSelectPersona(p)}
                            className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              isCurrent
                                ? 'bg-amber-500/15 border-amber-500/50 text-white ring-1 ring-amber-500/30'
                                : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${p.avatarBg} text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0`}>
                                {p.name.split(' ').map((n) => n[0]).join('')}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                                <p className="text-[11px] text-slate-400 truncate">{p.title}</p>
                              </div>
                            </div>
                            {isCurrent ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            ) : (
                              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Trigger live operational events to showcase real-time alerts, room service orders, and SLA timers across tabs.
                  </p>

                  {/* Scenario 1: Dining */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300">
                      <UtensilsCrossed className="h-4 w-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wide">Evening Dining Rush</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Dispatches 2 live dining orders (Carbonara & Negroni for Room 408; Sea Bass & Wine for Room 212) to the Kitchen & Bar.
                    </p>
                    <button
                      onClick={simulateDiningRush}
                      disabled={isSimulating}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 px-3 text-xs font-bold transition-all shadow-sm active:scale-98 disabled:opacity-50"
                    >
                      <UtensilsCrossed className="h-3.5 w-3.5" />
                      <span>Trigger Dining Rush Orders</span>
                    </button>
                  </div>

                  {/* Scenario 2: Maintenance */}
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-red-300">
                      <Wrench className="h-4 w-4 text-red-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wide">Urgent Maintenance Leak</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Creates an urgent AC drip request in Room 317 with active 15-minute response SLA timer visible in Manager and Staff views.
                    </p>
                    <button
                      onClick={simulateUrgentLeak}
                      disabled={isSimulating}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white py-2 px-3 text-xs font-bold transition-all shadow-sm active:scale-98 disabled:opacity-50"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      <span>Trigger Urgent AC Ticket</span>
                    </button>
                  </div>

                  {/* Scenario 3: Housekeeping */}
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-blue-300">
                      <Brush className="h-4 w-4 text-blue-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wide">Housekeeping Refresh Wave</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Submits request for hypoallergenic pillows, extra towels, and evening turndown service for Room 212.
                    </p>
                    <button
                      onClick={simulateHousekeepingWave}
                      disabled={isSimulating}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 text-xs font-bold transition-all shadow-sm active:scale-98 disabled:opacity-50"
                    >
                      <Brush className="h-3.5 w-3.5" />
                      <span>Trigger Housekeeping Task</span>
                    </button>
                  </div>

                  {/* Clean Reset */}
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={handleResetData}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-3 text-xs font-semibold transition-colors border border-slate-700"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                      <span>Reset All Mock Data to Clean Baseline</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800/80 px-4 py-2.5 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                Presentation & Testing Mode
              </span>
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
