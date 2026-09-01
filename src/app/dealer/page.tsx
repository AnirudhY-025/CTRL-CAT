'use client';
import React, { useState } from 'react';
import { 
  Building2, HardHat, Activity, ShieldAlert, ArrowRightLeft, 
  Map, Bell, Search, LayoutDashboard, Settings, UserCircle,
  ArrowRight, CheckCircle2, ChevronRight, X
} from "lucide-react";

// Mock Data
const ALERTS = [
  { id: '1', type: 'AI', title: 'PRESTIGE → SOBHA', desc: 'Redeploy 2 machines.', impact: '₹2.4L/month', urgency: 'High' },
  { id: '2', type: 'CRITICAL', title: 'Safety Event', desc: 'Proximity violation at Prestige Heights', urgency: 'High' },
  { id: '3', type: 'WARNING', title: 'Rental Expiry', desc: 'CAT 336 #EQX1005 expires in 3 days', urgency: 'Medium' }
];

const ASSETS = [
  { id: 'EQX1005', model: 'CAT 336', customer: 'Prestige Construction', site: 'Prestige Heights', status: 'UNDERUTILIZED', utilization: 31, idle: 28, todayHours: 7.4 },
  { id: 'EQX1021', model: 'CAT 320', customer: 'Sobha Residency', site: 'Sobha Residency', status: 'ACTIVE', utilization: 88, idle: 5, todayHours: 11.2 },
  { id: 'EQX1044', model: 'CAT 323', customer: 'Prestige Construction', site: 'Prestige Towers', status: 'IDLE', utilization: 12, idle: 80, todayHours: 1.1 },
  { id: 'EQX1082', model: 'CAT 336', customer: 'Brigade Group', site: 'Brigade Phase II', status: 'ACTIVE', utilization: 92, idle: 2, todayHours: 12.4 },
];

export default function DealerWorkspace() {
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [mlData, setMlData] = useState<{
    utilization?: any;
    anomaly?: any;
    maintenance?: any;
    demand?: any;
    loading: boolean;
    error: boolean;
  }>({ loading: false, error: false });

  React.useEffect(() => {
    if (selectedAsset && selectedAsset.type !== 'ai_recommendation') {
      setMlData({ loading: true, error: false });
      
      const telemetry = {
        engine_hours: selectedAsset.todayHours || 5.0,
        idle_hours: selectedAsset.idle ? selectedAsset.idle / 10.0 : 2.0,
        fuel_consumed: 120.5,
        utilization_pct: selectedAsset.utilization || 50.0,
        age_years: 3.0,
        total_hours: 3500.0,
        roll_hours: 120.0,
        roll_dtc_3d: 0,
        roll_sos_3d: 0
      };

      Promise.all([
        fetch('/api/ml/utilization', { method: 'POST', body: JSON.stringify(telemetry) }).then(r => r.ok ? r.json() : null),
        fetch('/api/ml/anomaly', { method: 'POST', body: JSON.stringify(telemetry) }).then(r => r.ok ? r.json() : null),
        fetch('/api/ml/maintenance', { method: 'POST', body: JSON.stringify(telemetry) }).then(r => r.ok ? r.json() : null)
      ]).then(([util, anom, maint]) => {
        setMlData({ utilization: util, anomaly: anom, maintenance: maint, loading: false, error: false });
      }).catch(err => {
        console.error("Failed to load ML insights:", err);
        setMlData({ loading: false, error: true });
      });
    } else if (selectedAsset && selectedAsset.type === 'ai_recommendation') {
       // Fetch demand for recommendation
       setMlData({ loading: true, error: false });
       const siteData = { active_equip_count: 5, prev_week_demand: 12 };
       fetch('/api/ml/demand', { method: 'POST', body: JSON.stringify(siteData) })
         .then(r => r.ok ? r.json() : null)
         .then(demand => {
            setMlData({ demand, loading: false, error: false });
         }).catch(err => {
            console.error("Failed to load demand:", err);
            setMlData({ loading: false, error: true });
         });
    }
  }, [selectedAsset]);

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
          <div className="text-xs font-semibold text-slate-400 tracking-wider mb-4 px-2">WORKSPACE</div>
          <ul className="space-y-1">
            {['Overview', 'Assets', 'Customers', 'Jobsites', 'AI Insights', 'Safety', 'Rentals'].map((item) => (
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
            <span className="font-medium">Dealer Admin</span>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
          <h1 className="text-lg font-semibold text-slate-900">Dealer Operations</h1>
          <div className="flex items-center gap-6 text-slate-500">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              LIVE
            </div>
            <Search className="w-4 h-4 cursor-pointer hover:text-slate-900" />
            <Bell className="w-4 h-4 cursor-pointer hover:text-slate-900" />
          </div>
        </header>

        {/* WORKSPACE & DETAIL SPLIT */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 2. OPERATIONAL WORKSPACE (Center) */}
          <main className="flex-1 overflow-y-auto bg-[#FDFDFD] p-8">
            <div className="max-w-4xl mx-auto">
              
              <div className="mb-10 text-xs font-semibold text-slate-400 tracking-wider">WHAT SHOULD I DO NEXT?</div>
              
              {/* AI Recommendation Decision Object */}
              <div 
                onClick={() => setSelectedAsset({ type: 'ai_recommendation', ...ASSETS[0] })}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-[#FFCC00] hover:shadow-md cursor-pointer transition-all mb-12 group"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="px-2 py-0.5 bg-[#FFCC00]/20 text-[#B38F00] text-xs font-bold rounded">AI RECOMMENDATION</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Prestige <ArrowRight className="inline w-4 h-4 mx-2 text-slate-400" /> Sobha</h3>
                    <p className="text-slate-500 text-sm">Redeploy 2 machines from Prestige Heights to Sobha Residency.</p>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-600 font-bold text-lg">₹2.4L/month</div>
                    <div className="text-slate-400 text-sm">+18% fleet utilization</div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-900">REVIEW TRANSFER</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                </div>
              </div>

              <div className="mb-6 flex justify-between items-end">
                <div className="text-xs font-semibold text-slate-400 tracking-wider">ALL MACHINES</div>
              </div>

              {/* Asset List (Large Horizontal Objects) */}
              <div className="space-y-3">
                {ASSETS.map((asset) => (
                  <div 
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`flex items-center justify-between p-5 bg-white border rounded-xl cursor-pointer transition-all ${
                      selectedAsset?.id === asset.id 
                        ? 'border-[#FFCC00] shadow-sm ring-1 ring-[#FFCC00]/50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-1/4">
                      <div className="text-sm text-slate-500 mb-1">{asset.site}</div>
                      <div className="font-semibold text-slate-900">{asset.customer}</div>
                    </div>
                    <div className="w-1/4">
                      <div className="text-sm text-slate-500 mb-1">Machine</div>
                      <div className="font-semibold text-slate-900">{asset.model} <span className="text-slate-400 font-normal">#{asset.id}</span></div>
                    </div>
                    <div className="w-1/4 flex justify-end">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                        asset.status === 'UNDERUTILIZED' ? 'bg-amber-100 text-amber-800' : 
                        asset.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {asset.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* 3. DETAIL PANEL (Right) */}
          {selectedAsset && (
            <aside className="w-[420px] bg-white border-l border-slate-200 shadow-2xl z-10 flex flex-col animate-in slide-in-from-right-8 duration-200">
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
                <h2 className="font-semibold text-slate-900">
                  {selectedAsset.type === 'ai_recommendation' ? 'Fleet Exchange' : 'Asset Detail'}
                </h2>
                <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8">
                {selectedAsset.type === 'ai_recommendation' ? (
                  // AI FLEET EXCHANGE PANEL
                  <div className="space-y-10">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="text-sm text-slate-500 mb-1">Source</div>
                          <div className="font-bold text-slate-900">Prestige Construction</div>
                          <div className="text-sm text-slate-600">CAT 336 × 2</div>
                          <div className="text-sm text-amber-600 font-medium">31% utilization</div>
                        </div>
                        <div className="pt-4 text-slate-300"><ArrowRight className="w-5 h-5"/></div>
                        <div className="text-right">
                          <div className="text-sm text-slate-500 mb-1">Destination</div>
                          <div className="font-bold text-slate-900">Sobha Construction</div>
                          <div className="text-sm text-slate-600">2 machine shortage</div>
                          <div className="text-sm text-emerald-600 font-medium">91% confidence</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 border-t border-slate-100 pt-8">
                      <div>
                        <div className="text-xs font-bold text-slate-400 tracking-wider mb-2">WHY?</div>
                        <p className="text-sm text-slate-700">Prestige has excess capacity at Prestige Heights site.</p>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 tracking-wider mb-2">WHY NOW?</div>
                        <p className="text-sm text-slate-700">Sobha demand forecast has increased 27% due to project phase shift.</p>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 tracking-wider mb-3">WHAT WILL HAPPEN?</div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Expected utilization</span>
                            <span className="text-sm font-semibold text-slate-900">31% <ArrowRight className="inline w-3 h-3 mx-1"/> 82%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Recovered monthly value</span>
                            <span className="text-sm font-semibold text-emerald-600">₹2.4L</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button className="w-full bg-[#FFCC00] text-slate-900 font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-[#F2C200] transition-colors flex items-center justify-center gap-2">
                        APPROVE TRANSFER
                      </button>
                      <button className="w-full mt-3 bg-white border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors">
                        DISMISS
                      </button>
                    </div>
                  </div>
                ) : (
                  // ASSET DETAIL PANEL
                  <div className="space-y-8">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 mb-1">{selectedAsset.model}</h1>
                      <div className="text-lg text-slate-400 font-mono">{selectedAsset.id}</div>
                    </div>

                    <div>
                      <div className="text-slate-900 font-semibold">{selectedAsset.customer}</div>
                      <div className="text-slate-500 text-sm">{selectedAsset.site}</div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex justify-between items-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">STATUS</div>
                        <div className={`font-bold ${selectedAsset.status === 'UNDERUTILIZED' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {selectedAsset.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">{selectedAsset.utilization}%</div>
                        <div className="text-xs font-semibold text-slate-500">UTILIZATION</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-slate-100 rounded-lg p-4">
                        <div className="text-xl font-bold text-slate-900 mb-1">{selectedAsset.todayHours} h</div>
                        <div className="text-xs font-semibold text-slate-500">TODAY</div>
                      </div>
                      <div className="border border-slate-100 rounded-lg p-4">
                        <div className="text-xl font-bold text-slate-900 mb-1">{selectedAsset.idle}%</div>
                        <div className="text-xs font-semibold text-slate-500">IDLE TIME</div>
                      </div>
                      
                      {selectedAsset.status === 'UNDERUTILIZED' && (
                      <div className="space-y-6 pt-4 border-t border-slate-100">
                        <div>
                          <div className="text-xs font-bold text-slate-400 tracking-wider mb-2">LIVE AI INSIGHTS</div>
                          
                          {mlData.loading ? (
                            <div className="text-sm text-slate-500 flex items-center gap-2 italic">
                               <div className="w-3 h-3 border-2 border-slate-300 border-t-[#FFCC00] rounded-full animate-spin"></div>
                               Analyzing machine telemetry...
                            </div>
                          ) : mlData.error ? (
                            <p className="text-sm text-slate-400 italic">AI insights temporarily unavailable</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                               <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                                  <div className="text-[10px] font-bold text-slate-400 mb-1 tracking-wider uppercase">Predicted State</div>
                                  <div className={`font-semibold text-sm ${mlData.utilization?.prediction === 'Under-utilized' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                     {mlData.utilization?.prediction || 'Unknown'}
                                  </div>
                               </div>
                               <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                                  <div className="text-[10px] font-bold text-slate-400 mb-1 tracking-wider uppercase">Anomaly Status</div>
                                  <div className={`font-semibold text-sm ${mlData.anomaly?.is_anomaly ? 'text-red-600' : 'text-emerald-600'}`}>
                                     {mlData.anomaly?.is_anomaly ? 'Anomaly Detected' : 'Normal'}
                                  </div>
                               </div>
                               <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 col-span-2">
                                  <div className="text-[10px] font-bold text-slate-400 mb-1 tracking-wider uppercase">7-Day Maint Risk</div>
                                  <div className={`font-semibold text-sm ${mlData.maintenance?.maintenance_risk_7d ? 'text-red-600' : 'text-emerald-600'}`}>
                                     {mlData.maintenance?.maintenance_risk_7d ? 'High Risk' : 'Low Risk'}
                                  </div>
                               </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-white border border-[#FFCC00]/50 shadow-sm rounded-xl p-5">
                          <div className="text-xs font-bold text-[#B38F00] tracking-wider mb-3">RECOMMENDED ACTION</div>
                          <p className="text-sm font-medium text-slate-900 mb-2">Move this machine to:</p>
                          <p className="text-lg font-bold text-slate-900 mb-4">Sobha Green Residency</p>
                          
                          <div className="space-y-2 mb-6">
                            <div className="flex justify-between">
                              <span className="text-sm text-slate-500">Projected utilization:</span>
                              <span className="text-sm font-bold text-slate-900">82%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-slate-500">Estimated impact:</span>
                              <span className="text-sm font-bold text-emerald-600">+₹1.2L/mo</span>
                            </div>
                          </div>

                          <button className="w-full bg-[#FFCC00] text-slate-900 font-bold py-2.5 px-4 rounded-lg shadow-sm hover:bg-[#F2C200] transition-colors text-sm">
                            REVIEW TRANSFER
                          </button>
                        </div>
                      </div>
                    )}
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-400 tracking-wider mb-4">RECENT ACTIVITY</div>
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="text-xs font-mono text-slate-400 mt-0.5">09:41</div>
                          <div className="text-sm text-slate-700">Machine started</div>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-xs font-mono text-slate-400 mt-0.5">11:32</div>
                          <div className="text-sm text-slate-700">Idle detected</div>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-xs font-mono text-slate-400 mt-0.5">12:14</div>
                          <div className="text-sm text-amber-600 font-medium">Safety event proximity</div>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-xs font-mono text-slate-400 mt-0.5">13:02</div>
                          <div className="text-sm text-slate-700">Machine resumed</div>
                        </div>
                      </div>
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
