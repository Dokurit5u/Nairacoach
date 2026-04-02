'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import { createClient } from '@/utils/supabase/client';
import {
  SLIDES, INCOME_RANGES, OCCUPATIONS, SKILLS, HABITS, COUNTRIES,
  ALL_HUSTLES, ALL_BADGES, DAILY_TASKS, CAT_COLORS, EXP_CATS,
  HUSTLES
} from '@/lib/constants';

// --- Utility Functions ---
const lsGet = (key: string, fallback: any) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem("nc_" + key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const lsSet = (key: string, val: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem("nc_" + key, JSON.stringify(val));
  } catch {}
};

const fmt = (n: number) => {
  return "₦" + Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 });
};

// --- Reusable Components ---
const Sheet = ({ show, onClose, children, title }: any) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[32px] p-6 pb-10 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mb-6" />
        {title && <h3 className="text-xl font-bold mb-4 dark:text-white">{title}</h3>}
        {children}
      </div>
    </div>
  );
};

// --- Main Application ---
export default function NairaCoach() {
  const [phase, setPhase] = useState('loading'); // splash, register, app
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  // UI State
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [splashIdx, setSplashIdx] = useState(0);
  const [regStep, setRegStep] = useState(0);
  const [regForm, setRegForm] = useState({ name: '', occupation: '', incomeRange: '', habit: '' });

  const supabase = createClient();

  useEffect(() => {
    setUser(lsGet("user", null));
    setExpenses(lsGet("expenses", []));
    setIncomes(lsGet("incomes", []));
    setXp(lsGet("xp", 0));
    setStreak(lsGet("streak", 0));
    setPhase(lsGet("phase", "splash"));
  }, []);

  const handleStartApp = () => {
    if (user) {
      setPhase('app');
      lsSet('phase', 'app');
    } else {
      setPhase('register');
    }
  };

  const handleRegister = () => {
    setUser(regForm);
    lsSet('user', regForm);
    setPhase('app');
    lsSet('phase', 'app');
  };

  const addExpense = (amt: number, cat: string) => {
    const newE = { id: Date.now(), amount: amt, cat, date: 'Today', icon: 'bolt' };
    const updated = [newE, ...expenses];
    setExpenses(updated);
    lsSet('expenses', updated);
    setXp(prev => prev + 10);
    setShowAddExpense(false);
  };

  if (phase === 'loading') return <div className="min-h-screen bg-white dark:bg-black" />;

  // --- 1. SPLASH SCREEN ---
  if (phase === 'splash') {
    const s = SLIDES[splashIdx];
    return (
      <div style={{ background: s.bg }} className="min-h-screen flex flex-col transition-all duration-700 font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-white">
          <div className="text-8xl mb-8 animate-bounce">{s.em}</div>
          <h1 className="text-4xl font-black mb-4 leading-tight whitespace-pre-line">{s.title}</h1>
          <p className="text-lg opacity-80 max-w-xs">{s.sub}</p>
        </div>
        <div className="p-10">
          <button
            onClick={() => splashIdx < SLIDES.length - 1 ? setSplashIdx(i => i + 1) : handleStartApp()}
            className="w-full py-5 bg-white text-green-800 font-black rounded-2xl shadow-2xl active:scale-95 transition-all text-lg"
          >
            {splashIdx < SLIDES.length - 1 ? 'Continue →' : 'Get Started 🚀'}
          </button>
        </div>
      </div>
    );
  }

  // --- 2. REGISTRATION ---
  if (phase === 'register') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-8 font-sans">
        <div className="max-w-md mx-auto">
          <div className="w-14 h-14 bg-green-600 rounded-[20px] flex items-center justify-center mb-8 shadow-lg shadow-green-200">
            <Icon name="naira" size={28} color="white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Create Account</h2>
          <p className="text-gray-500 font-medium mb-8">Let's personalize your experience.</p>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Full Name</label>
              <input
                value={regForm.name}
                onChange={e => setRegForm({...regForm, name: e.target.value})}
                placeholder="e.g. Tunde Okafor"
                className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 focus:border-green-500 outline-none font-bold dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Occupation</label>
              <select
                value={regForm.occupation}
                onChange={e => setRegForm({...regForm, occupation: e.target.value})}
                className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 outline-none font-bold dark:text-white appearance-none"
              >
                <option value="">Select Occupation</option>
                {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <button
              onClick={handleRegister}
              disabled={!regForm.name}
              className="w-full py-5 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-900/20 disabled:bg-gray-300 active:scale-95 transition-all"
            >
              Start Coaching →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. MAIN APP ---
  const balance = incomes.reduce((a,b) => a+b.amount, 0) - expenses.reduce((a,b) => a+b.amount, 0);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-zinc-950 font-sans pb-24 transition-colors">

      <div className="flex-1">
        {tab === 'home' && (
          <div className="p-6">
            <header className="flex justify-between items-center mb-8">
              <div>
                <p className="text-sm text-gray-500 font-medium">Welcome back,</p>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">{user?.name} 👋</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 dark:bg-orange-950 text-orange-600 px-3 py-1 rounded-full text-xs font-black">🔥 {streak}d</div>
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold shadow-lg shadow-green-200">
                  {user?.name?.[0] || 'C'}
                </div>
              </div>
            </header>

            <div className="bg-gradient-to-br from-green-500 to-green-800 p-8 rounded-[32px] text-white shadow-2xl shadow-green-900/20 dark:shadow-none mb-10 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <p className="text-xs uppercase tracking-widest font-black opacity-70 mb-2">Available Balance</p>
              <h3 className="text-5xl font-black mb-8 tracking-tighter">{fmt(balance)}</h3>
              <div className="flex gap-4">
                <button onClick={() => setShowAddIncome(true)} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md py-3.5 rounded-2xl font-bold text-sm border border-white/10 active:scale-95 transition-all">+ Income</button>
                <button onClick={() => setShowAddExpense(true)} className="flex-1 bg-white text-green-700 py-3.5 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">+ Expense</button>
              </div>
            </div>

            <section className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg dark:text-white">Recent Spending</h3>
                <button className="text-green-600 font-bold text-sm">View All</button>
              </div>
              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-zinc-900 rounded-[24px] border-2 border-dashed border-gray-100 dark:border-zinc-800 text-gray-400 font-bold italic">Log an expense to see history.</div>
                ) : (
                  expenses.slice(0, 5).map(e => (
                    <div key={e.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl flex items-center justify-between border border-gray-50 dark:border-zinc-800 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
                          <Icon name="bolt" size={22} color="#0FA958" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 dark:text-white text-sm">{e.cat}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{e.date}</p>
                        </div>
                      </div>
                      <p className="font-black text-gray-900 dark:text-white">-{fmt(e.amount)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {tab === 'hustles' && (
          <div className="p-6">
            <h2 className="text-3xl font-black mb-2 dark:text-white tracking-tighter">Hustles 💡</h2>
            <p className="text-gray-500 mb-8 font-medium">Extra income opportunities for you.</p>
            <div className="space-y-4">
              {HUSTLES.map(h => (
                <div key={h.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-gray-50 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all">
                  <div className="flex gap-4 mb-4">
                    <span className="text-4xl">{h.em}</span>
                    <div className="flex-1">
                      <h4 className="font-black text-gray-900 dark:text-white">{h.title}</h4>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{h.diff} • COST: {h.cost === 0 ? 'FREE' : fmt(h.cost)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed font-medium">{h.desc}</p>
                  <button className="w-full py-3.5 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-green-50 transition-colors">View Roadmap →</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-gray-100 dark:border-zinc-800 p-4 px-10 flex justify-between z-50">
        {[
          { id: 'home', icon: 'home', label: 'Home' },
          { id: 'analytics', icon: 'chart', label: 'Track' },
          { id: 'hustles', icon: 'bulb', label: 'Hustle' },
          { id: 'profile', icon: 'user', label: 'Me' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${tab === item.id ? 'text-green-600 scale-110' : 'text-gray-400'}`}
          >
            <Icon name={item.icon as any} size={24} color={tab === item.id ? '#0FA958' : '#999'} sw={tab === item.id ? 2.5 : 1.8} />
            <span className={`text-[9px] font-black uppercase tracking-tighter ${tab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Forms (Sheets) */}
      <Sheet show={showAddExpense} onClose={() => setShowAddExpense(false)} title="Log Expense 💸">
         <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-zinc-800 p-5 rounded-2xl flex items-center gap-4 border border-gray-100 dark:border-zinc-700">
               <span className="text-3xl font-black text-green-600">₦</span>
               <input type="number" placeholder="0.00" className="bg-transparent flex-1 text-3xl font-black outline-none dark:text-white" autoFocus onKeyDown={(e: any) => { if(e.key === 'Enter') addExpense(Number(e.target.value), 'Other') }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
               {['Food', 'Transport', 'Data', 'Rent'].map(c => (
                 <button key={c} className="py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl font-black text-xs uppercase tracking-widest dark:text-white hover:bg-green-50 transition-colors border border-gray-100 dark:border-zinc-700">{c}</button>
               ))}
            </div>
            <p className="text-center text-[10px] text-gray-400 font-black uppercase tracking-widest">Press Enter to save to your records</p>
         </div>
      </Sheet>

    </div>
  );
}
