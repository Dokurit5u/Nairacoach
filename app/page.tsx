'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@/components/Icons';
import {
  SLIDES, INCOME_RANGES, OCCUPATIONS, SKILLS, HABITS, COUNTRIES,
  ALL_HUSTLES, HUSTLE_UPGRADES, ALL_BADGES, DAILY_TASKS, CAT_COLORS, EXP_CATS,
  IconName
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

// --- Components ---
const Toast = ({ msg, on }: { msg: string; on: boolean }) => (
  <div style={{
    position: "fixed", bottom: 88, left: "50%",
    transform: `translateX(-50%) translateY(${on ? 0 : 10}px)`,
    opacity: on ? 1 : 0, background: "#111", color: "#fff",
    padding: "10px 22px", borderRadius: 14, fontSize: 13, fontWeight: 700,
    zIndex: 9998, transition: "all 0.3s", whiteSpace: "nowrap",
    boxShadow: "0 6px 24px rgba(0,0,0,0.3)", pointerEvents: "none",
    display: "flex", alignItems: "center", gap: 8
  }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0FA958", flexShrink: 0 }} />
    {msg}
  </div>
);

// --- Main Application ---
export default function NairaCoach() {
  const [phase, setPhase] = useState('splash');
  const [user, setUser] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [xp, setXp] = useState(0);

  // Initialize data on mount
  useEffect(() => {
    setPhase(lsGet("phase", "splash"));
    setUser(lsGet("user", null));
    setExpenses(lsGet("expenses", []));
    setXp(lsGet("xp", 0));
  }, []);

  if (phase === 'splash') {
    return (
      <div className="min-h-screen bg-green-600 flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-8 animate-pulse">
           <Icon name="naira" size={48} color="white" />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tighter">NairaCoach</h1>
        <p className="text-lg opacity-80 mb-12">Your Nigerian personal finance coach.</p>
        <button
          onClick={() => setPhase('app')}
          className="w-full max-w-xs py-4 bg-white text-green-700 font-bold rounded-2xl shadow-xl active:scale-95 transition-transform"
        >
          Get Started
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 font-sans pb-24">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div>
           <p className="text-sm text-gray-500 font-medium">Welcome back 👋</p>
           <h2 className="text-xl font-bold text-gray-900">{user?.name || 'Champ'}</h2>
        </div>
        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
          <Icon name="zap" size={14} color="#0FA958" />
          Lv.{Math.floor(xp / 100) + 1}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-6">
         <div className="bg-gradient-to-br from-green-500 to-green-700 p-6 rounded-3xl text-white shadow-lg mb-6">
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Net Balance</p>
            <h3 className="text-4xl font-black mb-6">{fmt(250000)}</h3>
            <div className="grid grid-cols-2 gap-4">
               <button className="bg-white/20 py-3 rounded-xl font-bold text-sm">+ Income</button>
               <button className="bg-white/20 py-3 rounded-xl font-bold text-sm">+ Expense</button>
            </div>
         </div>

         <section>
            <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
            {expenses.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400">No expenses logged yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map(e => (
                  <div key={e.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Icon name="bolt" size={20} color="#666" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{e.cat}</p>
                        <p className="text-xs text-gray-500">{e.date}</p>
                      </div>
                    </div>
                    <p className="font-bold text-red-500">-{fmt(e.amount)}</p>
                  </div>
                ))}
              </div>
            )}
         </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 flex justify-around">
         <button className="flex flex-col items-center gap-1 text-green-600">
            <Icon name="home" size={24} color="#0FA958" />
            <span className="text-[10px] font-bold">Home</span>
         </button>
         <button className="flex flex-col items-center gap-1 text-gray-400">
            <Icon name="chart" size={24} color="#999" />
            <span className="text-[10px] font-bold">Analytics</span>
         </button>
         <button className="flex flex-col items-center gap-1 text-gray-400">
            <Icon name="bulb" size={24} color="#999" />
            <span className="text-[10px] font-bold">Hustles</span>
         </button>
         <button className="flex flex-col items-center gap-1 text-gray-400">
            <Icon name="user" size={24} color="#999" />
            <span className="text-[10px] font-bold">Profile</span>
         </button>
      </nav>
    </div>
  );
}
