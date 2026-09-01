import Link from "next/link";
import { ArrowRight, HardHat, Building2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-3xl w-full space-y-12 text-center">
        
        <div>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-4 h-4 bg-[#FFCC00] rounded-sm"></div>
            <h1 className="text-xl font-bold tracking-[0.2em] text-slate-500 uppercase">
              Cat FleetFlow
            </h1>
          </div>
          <h2 className="text-5xl font-bold tracking-tight mb-4">
            Industrial Operating System.
          </h2>
          <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto">
            AI-powered dealer control tower for construction equipment rental, fleet utilization, and jobsite safety.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto text-left">
          {/* Dealer Persona */}
          <Link
            href="/dealer"
            className="group block bg-white p-8 rounded-2xl border border-slate-200 hover:border-[#FFCC00] hover:shadow-lg transition-all duration-300"
          >
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center mb-6">
              <Building2 className="w-5 h-5 text-slate-900" />
            </div>
            <h3 className="text-xl font-bold mb-2">Dealer Control Tower</h3>
            <p className="text-slate-500 text-sm mb-8">
              Manage assets, execute fleet exchanges, and view AI demand forecasts.
            </p>
            <div className="flex items-center text-sm font-bold text-slate-900 group-hover:text-[#B38F00] transition-colors">
              ENTER WORKSPACE <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Customer Persona */}
          <Link
            href="/customer"
            className="group block bg-white p-8 rounded-2xl border border-slate-200 hover:border-[#FFCC00] hover:shadow-lg transition-all duration-300"
          >
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center mb-6">
              <HardHat className="w-5 h-5 text-slate-900" />
            </div>
            <h3 className="text-xl font-bold mb-2">Customer Workspace</h3>
            <p className="text-slate-500 text-sm mb-8">
              Approve recommendations, monitor safety events, and manage rentals.
            </p>
            <div className="flex items-center text-sm font-bold text-slate-900 group-hover:text-[#B38F00] transition-colors">
              ENTER WORKSPACE <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Operator Persona */}
          <Link
            href="/operator"
            className="group block bg-white p-8 rounded-2xl border border-slate-200 hover:border-[#FFCC00] hover:shadow-lg transition-all duration-300"
          >
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center mb-6">
              <div className="w-5 h-5 border-2 border-slate-900 border-dashed rounded-sm flex items-center justify-center">
                 <div className="w-2 h-2 bg-[#FFCC00]"></div>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Operator Check-In</h3>
            <p className="text-slate-500 text-sm mb-8">
              Mobile-first QR scanner and AI safety PPE verification for machine operators.
            </p>
            <div className="flex items-center text-sm font-bold text-slate-900 group-hover:text-[#B38F00] transition-colors">
              OPEN SCANNER <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
