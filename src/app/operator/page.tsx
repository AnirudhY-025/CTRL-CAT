'use client';
import React, { useState, useEffect } from 'react';
import { 
  HardHat, ScanLine, Camera, CheckCircle2, XCircle, 
  AlertTriangle, PlayCircle, Clock, ArrowRight, ChevronLeft
} from "lucide-react";

type Step = 
  | 'SCAN' 
  | 'IDENTIFIED' 
  | 'SAFETY_PHOTO' 
  | 'ANALYZING' 
  | 'RESULT_FAIL' 
  | 'COACHING' 
  | 'RESULT_PASS' 
  | 'CONFIRMATION' 
  | 'ACTIVE_SESSION' 
  | 'CHECKED_IN';

export default function OperatorCheckout() {
  const [step, setStep] = useState<Step>('SCAN');
  const [machineId, setMachineId] = useState('EQX1005');
  const [sessionTime, setSessionTime] = useState(0);

  // Timer simulation for active session
  useEffect(() => {
    let interval: any;
    if (step === 'ACTIVE_SESSION') {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const simulateAnalysis = () => {
    setStep('ANALYZING');
    setTimeout(() => {
      // For demo purposes, we always fail the first time, then pass if they retry
      // Actually, let's use a state to track if they've seen the coaching
      setStep(prev => hasCoached ? 'RESULT_PASS' : 'RESULT_FAIL');
    }, 2000);
  };

  const [hasCoached, setHasCoached] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans flex justify-center">
      {/* Mobile Container */}
      <div className="w-full max-w-md bg-white border-x border-slate-200 min-h-screen flex flex-col relative shadow-sm">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#FFCC00] rounded-sm"></div>
            <span className="font-bold text-sm tracking-widest text-slate-900 uppercase">Cat FleetFlow</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <HardHat className="w-4 h-4" />
            <span className="font-medium">Operator</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 pb-24">
          
          {/* SCREEN 1: SCAN */}
          {step === 'SCAN' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold mb-2">Equipment Checkout</h1>
                <p className="text-slate-500">Scan the QR code attached to the machine.</p>
              </div>

              <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-4">
                <ScanLine className="w-16 h-16 text-slate-300" />
                <span className="text-slate-400 font-medium text-sm tracking-wide">CAMERA VIEWPORT</span>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => setStep('IDENTIFIED')}
                  className="w-full bg-[#FFCC00] text-slate-900 font-bold py-3.5 px-4 rounded-xl hover:bg-[#F2C200] transition-colors flex items-center justify-center gap-2"
                >
                  <ScanLine className="w-5 h-5" /> Start Scanner
                </button>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-400 tracking-wider mb-3">OR ENTER MANUALLY</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-3 font-mono text-slate-900 focus:outline-none focus:border-[#FFCC00]"
                  />
                  <button 
                    onClick={() => setStep('IDENTIFIED')}
                    className="bg-slate-900 text-white font-bold px-6 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    CONTINUE
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: IDENTIFIED */}
          {step === 'IDENTIFIED' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div>
                <button onClick={() => setStep('SCAN')} className="flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6 font-medium">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <div className="text-xs font-bold tracking-wider text-slate-400 mb-2">MACHINE IDENTIFIED</div>
                <h1 className="text-4xl font-bold text-slate-900 mb-1">CAT 336</h1>
                <div className="text-lg text-slate-500 font-mono">{machineId}</div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">Customer</div>
                  <div className="font-bold text-slate-900">Prestige Construction</div>
                </div>
                <div className="border-t border-slate-200/60 pt-4">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Site</div>
                  <div className="font-bold text-slate-900">Prestige Heights</div>
                </div>
                <div className="border-t border-slate-200/60 pt-4 flex justify-between items-center">
                  <div className="text-xs font-semibold text-slate-500">Current status</div>
                  <div className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs tracking-wider">AVAILABLE</div>
                </div>
              </div>

              <button 
                onClick={() => setStep('SAFETY_PHOTO')}
                className="w-full bg-[#FFCC00] text-slate-900 font-bold py-3.5 px-4 rounded-xl hover:bg-[#F2C200] transition-colors flex justify-center items-center gap-2"
              >
                Continue to Safety Check <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* SCREEN 3: SAFETY CHECK */}
          {step === 'SAFETY_PHOTO' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div>
                <button onClick={() => setStep('IDENTIFIED')} className="flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6 font-medium">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <h1 className="text-2xl font-bold mb-2">Safety Check</h1>
                <p className="text-slate-500">Take a photo of yourself with your required safety equipment visible.</p>
              </div>

              <div className="aspect-[3/4] bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                <div className="absolute inset-0 border-4 border-slate-800/50 m-4 rounded-xl border-dashed"></div>
                <Camera className="w-12 h-12 text-slate-600" />
                <span className="text-slate-500 font-medium text-sm tracking-wide">FRONT CAMERA</span>
              </div>

              <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-5">
                <div className="text-xs font-bold text-slate-400 tracking-wider mb-3">REQUIRED PPE</div>
                <div className="grid grid-cols-2 gap-3">
                  {['Helmet', 'Safety Vest', 'Safety Shoes', 'Gloves'].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div> {item}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={simulateAnalysis}
                className="w-full bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 transition-colors flex justify-center items-center gap-2"
              >
                <Camera className="w-5 h-5" /> Take Photo
              </button>
            </div>
          )}

          {/* SCREEN 4: ANALYZING */}
          {step === 'ANALYZING' && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 duration-300 min-h-[60vh]">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-[#FFCC00] rounded-full absolute top-0 left-0 border-t-transparent animate-spin"></div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Analyzing safety readiness...</h2>
                <p className="text-slate-500 text-sm">Running AI computer vision models.</p>
              </div>
            </div>
          )}

          {/* SCREEN 5: RESULT FAIL */}
          {step === 'RESULT_FAIL' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-300">
              <div className="text-center pt-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Safety Check Incomplete</h1>
                <p className="text-red-600 font-medium">Required PPE was not detected.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Safety readiness:</span>
                  <span className="text-3xl font-bold text-red-600">68%</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">Helmet</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">Safety Vest</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between bg-red-50 -mx-2 px-2 py-1.5 rounded-lg border border-red-100">
                    <span className="font-bold text-red-700">Safety Shoes</span>
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">Gloves</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => setStep('COACHING')}
                  className="w-full bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 transition-colors flex justify-center items-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" /> View Safety Coaching
                </button>
                <button 
                  onClick={() => setStep('SAFETY_PHOTO')}
                  className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Check Again
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 6: COACHING */}
          {step === 'COACHING' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h1 className="text-2xl font-bold mb-2">Safety Coaching</h1>
                <p className="text-slate-500">Correct the detected safety gap before operating the machine.</p>
              </div>

              <div className="bg-slate-900 rounded-2xl aspect-video flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
                <PlayCircle className="w-16 h-16 text-white/90 mb-2 hover:scale-110 transition-transform cursor-pointer" />
                <div className="text-white font-bold tracking-wider text-sm">PPE & MACHINE SAFETY</div>
                <div className="text-slate-400 font-mono text-xs mt-1">2:14</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-800 text-sm">Required Action</h4>
                  <p className="text-amber-700 text-sm mt-1">Watching this coaching video and wearing your safety shoes is required before machine checkout.</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setHasCoached(true);
                  setStep('SAFETY_PHOTO');
                }}
                className="w-full bg-[#FFCC00] text-slate-900 font-bold py-3.5 px-4 rounded-xl hover:bg-[#F2C200] transition-colors mt-8"
              >
                I am ready. Check Again.
              </button>
            </div>
          )}

          {/* SCREEN 7: RESULT PASS */}
          {step === 'RESULT_PASS' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-300">
              <div className="text-center pt-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Safety Check Passed</h1>
                <p className="text-emerald-600 font-medium">Operator cleared to operate.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Safety readiness:</span>
                  <span className="text-3xl font-bold text-emerald-600">96%</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">Helmet</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">Safety Vest</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">Safety Shoes</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">Gloves</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep('CONFIRMATION')}
                className="w-full bg-[#FFCC00] text-slate-900 font-bold py-3.5 px-4 rounded-xl hover:bg-[#F2C200] transition-colors"
              >
                Continue to Checkout
              </button>
            </div>
          )}

          {/* SCREEN 8: CONFIRMATION */}
          {step === 'CONFIRMATION' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div>
                <div className="text-xs font-bold tracking-wider text-emerald-600 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> OPERATOR CLEARED
                </div>
                <h1 className="text-4xl font-bold text-slate-900 mb-1">CAT 336</h1>
                <div className="text-lg text-slate-500 font-mono">{machineId}</div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">Operator</div>
                  <div className="font-bold text-slate-900">Worker #204</div>
                </div>
                <div className="border-t border-slate-200/60 pt-4">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Site</div>
                  <div className="font-bold text-slate-900">Prestige Heights</div>
                </div>
                <div className="border-t border-slate-200/60 pt-4 flex justify-between items-center">
                  <div className="text-xs font-semibold text-slate-500">Safety Readiness</div>
                  <div className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs tracking-wider">96%</div>
                </div>
              </div>

              <button 
                onClick={() => setStep('ACTIVE_SESSION')}
                className="w-full bg-slate-900 text-white font-bold py-4 px-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
              >
                Check Out Machine
              </button>
            </div>
          )}

          {/* SCREEN 9: ACTIVE SESSION */}
          {step === 'ACTIVE_SESSION' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h1 className="text-xl font-bold text-emerald-900">MACHINE CHECKED OUT</h1>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-slate-900">CAT 336</h2>
                <div className="text-slate-500 font-mono">{machineId}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-100 rounded-xl p-4 bg-white">
                  <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Operator</div>
                  <div className="font-bold text-slate-900">Worker #204</div>
                </div>
                <div className="border border-slate-100 rounded-xl p-4 bg-white">
                  <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Site</div>
                  <div className="font-bold text-slate-900 truncate">Prestige Heights</div>
                </div>
                <div className="border border-slate-100 rounded-xl p-4 bg-white">
                  <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Started</div>
                  <div className="font-bold text-slate-900">8:14 AM</div>
                </div>
                <div className="border border-[#FFCC00]/50 bg-[#FFCC00]/10 rounded-xl p-4">
                  <div className="text-xs font-bold text-[#B38F00] mb-1 uppercase tracking-wider">Status</div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFCC00] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B38F00]"></span>
                    </span>
                    IN USE
                  </div>
                </div>
              </div>

              <div className="pt-8 pb-4 text-center">
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">SESSION TIMER</div>
                <div className="text-5xl font-mono font-light text-slate-900 tabular-nums">
                  {formatTime(sessionTime + 16338)} {/* Mocking that it's been running for 4.5 hours for realism, but ticking */}
                </div>
              </div>

              <button 
                onClick={() => setStep('CHECKED_IN')}
                className="w-full bg-slate-900 text-white font-bold py-4 px-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
              >
                Check In Machine
              </button>
            </div>
          )}

          {/* SCREEN 10: CHECKED IN */}
          {step === 'CHECKED_IN' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500 text-center pt-8">
              <div className="w-20 h-20 bg-slate-100 text-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Machine Checked In</h1>
              <p className="text-slate-500">The session has been securely logged to the Dealer Control Tower.</p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left space-y-4 my-8">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">End time</span>
                  <span className="font-bold text-slate-900">12:46 PM</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-4">
                  <span className="text-sm font-semibold text-slate-500">Session duration</span>
                  <span className="font-mono font-bold text-slate-900">04:32:18</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-4">
                  <span className="text-sm font-semibold text-slate-500">Machine status</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs tracking-wider">AVAILABLE</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setStep('SCAN');
                  setSessionTime(0);
                  setHasCoached(false);
                }}
                className="text-slate-500 font-semibold hover:text-slate-900 transition-colors text-sm"
              >
                Start New Session
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
