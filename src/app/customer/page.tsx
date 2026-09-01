'use client';
import React, { useState } from 'react';
import { 
  Building2, HardHat, Activity, ShieldAlert, ArrowRightLeft, 
  Map, Bell, Search, LayoutDashboard, Settings, UserCircle,
  ArrowRight, CheckCircle2, ChevronRight, X, PlayCircle
} from "lucide-react";

export default function CustomerWorkspace() {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="flex h-screen bg-[#FDFDFD] text-slate-800 font-sans overflow-hidden selection:bg-[#FFCC00]/30">
      
      {/* 1. LEFT NAVIGATION (Narrow & Quiet) */}
      <nav className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="font-bold text-lg tracking-tight flex items-center gap-2 text-slate-900">
            <div className="w-3 h-3 bg-[#FFCC00] rounded-sm"></div>
            CAT FLEETFLOW
          </div>
        </div>

        <div className="px-4 py-6 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 tracking-wider mb-4 px-2">CUSTOMER PORTAL</div>
          <ul className="space-y-1">
            {['Overview', 'My Machines', 'Rentals', 'Alerts', 'Safety'].map((item) => (
              <li key={item}>
                <button 
                  onClick={() => setActiveTab(item)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                    activeTab === item 
                      ? 'bg-slate-50 text-slate-900 shadow-sm border border-slate-100' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
                  }`}
                >
                  {item}
                  {activeTab === item && <div className="w-1.5 h-1.5 bg-[#FFCC00] rounded-full" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2 text-sm text-slate-600">
            <UserCircle className="w-5 h-5" />
            <span className="font-medium">Prestige Group</span>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
          <h1 className="text-lg font-semibold text-slate-900">My Workspace</h1>
          <div className="flex items-center gap-6 text-slate-500">
            <Search className="w-4 h-4 cursor-pointer hover:text-slate-900" />
            <Bell className="w-4 h-4 cursor-pointer hover:text-slate-900" />
          </div>
        </header>

        {/* WORKSPACE & DETAIL SPLIT */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 2. OPERATIONAL WORKSPACE (Center) */}
          <main className="flex-1 overflow-y-auto bg-[#FDFDFD] p-8">
            <div className="max-w-3xl mx-auto">
              
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">3 things need your attention.</h2>
                <p className="text-slate-500">Overview of critical alerts and recommendations for Prestige Construction.</p>
              </div>
              
              <div className="space-y-4">
                
                {/* RENTAL RENEWAL */}
                <div 
                  onClick={() => setSelectedItem({ type: 'rental', title: 'CAT 336' })}
                  className="bg-white border border-slate-200 rounded-xl p-6 cursor-pointer hover:border-[#FFCC00] hover:shadow-sm transition-all"
                >
                  <div className="text-xs font-bold text-slate-400 tracking-wider mb-2">RENTAL RENEWAL</div>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">CAT 336</h3>
                      <p className="text-amber-600 font-medium text-sm mt-1">Rental expires in 3 days</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">REVIEW</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* AI RECOMMENDATION */}
                <div 
                  onClick={() => setSelectedItem({ type: 'ai_recommendation' })}
                  className="bg-white border border-[#FFCC00]/50 rounded-xl p-6 cursor-pointer hover:border-[#FFCC00] hover:shadow-sm transition-all shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#FFCC00]"></div>
                  <div className="text-xs font-bold text-[#B38F00] tracking-wider mb-3">AI RECOMMENDATION</div>
                  <div className="flex justify-between items-end">
                    <div className="max-w-md">
                      <p className="text-slate-900 font-medium mb-1">2 machines are currently underutilized.</p>
                      <p className="text-slate-500 text-sm">Your dealer recommends temporarily reallocating these machines to recover costs.</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-500 mb-1">Potential savings</div>
                      <div className="text-emerald-600 font-bold text-xl mb-4">₹1.1L/month</div>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-semibold text-slate-900">REVIEW</span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SAFETY ALERT */}
                <div 
                  onClick={() => setSelectedItem({ type: 'safety' })}
                  className="bg-white border border-red-200 rounded-xl p-6 cursor-pointer hover:border-red-300 hover:shadow-sm transition-all"
                >
                  <div className="text-xs font-bold text-red-400 tracking-wider mb-2">SAFETY ALERT</div>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Proximity event detected</h3>
                      <p className="text-slate-500 text-sm mt-1">Prestige Heights • 12:14 PM</p>
                    </div>
                    <div className="flex items-center gap-2 text-red-600">
                      <span className="text-sm font-semibold">VIEW INCIDENT</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </main>

          {/* 3. DETAIL PANEL (Right) */}
          {selectedItem && (
            <aside className="w-[420px] bg-white border-l border-slate-200 shadow-2xl z-10 flex flex-col animate-in slide-in-from-right-8 duration-200">
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
                <h2 className="font-semibold text-slate-900">
                  {selectedItem.type === 'ai_recommendation' ? 'Fleet Recommendation' : 
                   selectedItem.type === 'safety' ? 'Safety Incident' : 'Rental Details'}
                </h2>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                
                {selectedItem.type === 'ai_recommendation' && (
                  <div className="space-y-8">
                    <div>
                      <div className="text-xs font-bold text-[#B38F00] tracking-wider mb-2">AI FLEET RECOMMENDATION</div>
                      <h1 className="text-3xl font-bold text-slate-900 mb-2">2 × CAT 336</h1>
                    </div>

                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-4">
                        <div className="text-xs font-semibold text-slate-400 mb-1">Current location</div>
                        <div className="font-bold text-slate-900">Prestige Heights</div>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <div className="text-xs font-semibold text-slate-400 mb-1">Destination</div>
                        <div className="font-bold text-slate-900">Sobha Green Residency</div>
                      </div>
                      <div className="border-b border-slate-100 pb-4">
                        <div className="text-xs font-semibold text-slate-400 mb-1">Reason</div>
                        <div className="font-medium text-slate-700">Low current utilization (averaging 31% over 7 days)</div>
                      </div>
                      <div className="border-b border-slate-100 pb-4 flex justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-400 mb-1">Expected duration</div>
                          <div className="font-medium text-slate-900">14 days</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-400 mb-1">Potential savings</div>
                          <div className="font-bold text-emerald-600 text-lg">₹1.1L/month</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button className="w-full bg-[#FFCC00] text-slate-900 font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-[#F2C200] transition-colors">
                        APPROVE
                      </button>
                      <button className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors">
                        DECLINE
                      </button>
                      <button className="w-full bg-transparent text-slate-500 font-semibold py-3 px-4 rounded-lg hover:text-slate-800 transition-colors text-sm">
                        REQUEST DETAILS
                      </button>
                    </div>
                  </div>
                )}

                {selectedItem.type === 'safety' && (
                  <div className="space-y-8">
                    <div>
                      <div className="text-xs font-bold text-red-500 tracking-wider mb-2">SAFETY EVENT</div>
                      <h1 className="text-3xl font-bold text-slate-900 mb-1">CAT 336</h1>
                      <div className="text-slate-500 font-mono">EQX1005</div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">Event</div>
                        <div className="font-semibold text-slate-900">Person entered red proximity zone.</div>
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-1">Machine state</div>
                          <div className="font-semibold text-slate-900">ACTIVE</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-500 mb-1">Risk</div>
                          <div className="font-bold text-red-600">HIGH</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">Operator</div>
                        <div className="font-semibold text-slate-900">Operator #204</div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <div className="text-xs font-bold text-slate-400 tracking-wider mb-3">RECOMMENDED RESPONSE</div>
                      <p className="text-sm font-medium text-slate-900 mb-4">Initiate operator coaching.</p>
                      
                      <div className="bg-slate-900 rounded-xl p-1 mb-4 relative aspect-video flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center gap-2">
                           <PlayCircle className="w-12 h-12 text-white/80" />
                           <span className="text-white/80 text-xs font-medium tracking-wider">SAFE MACHINE-ZONE AWARENESS (2:14)</span>
                        </div>
                      </div>

                      <button className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-slate-800 transition-colors mb-3">
                        PLAY COACHING
                      </button>
                      <button className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors">
                        MARK COMPLETE
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
