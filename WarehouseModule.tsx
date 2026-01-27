import React, { useState } from 'react';
import { 
  Package, LogOut, RefreshCw, Bell, Truck, BrainCircuit, Sparkles, Wand2, Archive, 
  ChevronDown, ChevronUp, CheckCircle2 
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { SupplyRequest } from './types';

interface WarehouseModuleProps {
  globalRequests: SupplyRequest[];
  setGlobalRequests: React.Dispatch<React.SetStateAction<SupplyRequest[]>>;
  onLogout: () => void;
  showNotification: (text: string) => void;
}

const WarehouseModule: React.FC<WarehouseModuleProps> = ({ globalRequests, setGlobalRequests, onLogout, showNotification }) => {
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [iaAnalysis, setIaAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const importSyncCode = () => {
    try {
      const d = JSON.parse(atob(syncInput));
      // d.mi = mobileId, d.mn = mobileName, d.dt = date, d.it = items
      const newRequest: SupplyRequest = {
        id: `REQ-${Date.now()}`,
        mobileId: d.mi,
        mobileName: d.mn,
        date: d.dt,
        items: d.it.map((item: any) => ({
          name: item.n,
          deficit: item.d,
          current: item.c,
          historyNumber: item.h
        })),
        status: 'PENDING'
      };
      setGlobalRequests(prev => [newRequest, ...prev]);
      setSyncInput('');
      setShowSyncModal(false);
      showNotification(`Solicitud de ${d.mn} importada correctamente`);
    } catch (err) {
      showNotification("Código de sincronización inválido");
    }
  };

  const runIAAnalysis = async () => {
    if (globalRequests.filter(r => r.status === 'PENDING').length === 0) {
      showNotification("No hay solicitudes pendientes para analizar");
      return;
    }
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const pending = globalRequests.filter(r => r.status === 'PENDING');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analiza estas solicitudes de inventario de ambulancias y genera un informe de despacho óptimo: ${JSON.stringify(pending)}`,
      });
      // SOLUCIÓN AL ERROR TS2345: response.text es string | undefined, el estado es string | null
      setIaAnalysis(response.text ?? "No se pudo generar un análisis en este momento.");
    } catch (error) {
      showNotification("Error al conectar con la IA de Auditoría");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-12">
      <header className="bg-[#2b3a8c] text-white px-6 py-5 flex justify-between items-center shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-sm"><Package className="text-[#2b3a8c] w-6 h-6" /></div>
          <div>
            <h1 className="font-black text-sm uppercase leading-none tracking-tight">VOM Almacén Central</h1>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-0.5">Gestión de Suministros</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSyncModal(true)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all">
            <RefreshCw className="w-4 h-4" /> Importar
          </button>
          <button onClick={onLogout} className="bg-red-500/20 p-2.5 rounded-xl hover:bg-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-red-50 p-4 rounded-2xl text-red-500"><Bell className="w-7 h-7" /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendientes</p><p className="text-3xl font-black text-slate-800 tracking-tighter">{globalRequests.filter(r => r.status === 'PENDING').length}</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-2xl text-[#2b3a8c]"><Truck className="w-7 h-7" /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Móviles</p><p className="text-3xl font-black text-slate-800 tracking-tighter">{new Set(globalRequests.map(r => r.mobileId)).size}</p></div>
          </div>
          <button onClick={runIAAnalysis} disabled={isAnalyzing} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 hover:border-purple-200 transition-all group">
            <div className={`p-4 rounded-2xl ${isAnalyzing ? 'bg-purple-100 text-purple-600 animate-pulse' : 'bg-purple-50 text-purple-500 group-hover:bg-purple-100'}`}><BrainCircuit className="w-7 h-7" /></div>
            <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditoría IA</p><p className="text-sm font-black text-purple-700 uppercase tracking-tight">{isAnalyzing ? 'Procesando...' : 'Analizar Cola'}</p></div>
          </button>
        </div>

        {iaAnalysis && (
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] text-white shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
            <Sparkles className="absolute -top-4 -right-4 w-24 h-24 opacity-10 rotate-12" />
            <div className="flex items-center gap-3 mb-6">
              <Wand2 className="w-6 h-6" />
              <h2 className="text-lg font-black uppercase tracking-widest">Reporte Inteligente</h2>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 text-sm font-medium leading-relaxed whitespace-pre-wrap">
              {iaAnalysis}
            </div>
            <button onClick={() => setIaAnalysis(null)} className="mt-6 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 underline decoration-2 underline-offset-4">Cerrar reporte</button>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Solicitudes Recientes</h2>
          {globalRequests.length === 0 ? (
            <div className="bg-white p-24 rounded-[3rem] border border-dashed border-slate-300 text-center">
              <Archive className="w-16 h-16 text-slate-100 mx-auto mb-4" />
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Sin solicitudes registradas</p>
            </div>
          ) : (
            globalRequests.map(req => (
              <div key={req.id} className={`bg-white rounded-[2rem] border transition-all ${req.status === 'PENDING' ? 'border-blue-200 shadow-md' : 'opacity-60 grayscale'}`}>
                <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setExpandedRequestId(expandedRequestId === req.id ? null : req.id)}>
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${req.status === 'PENDING' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}`}><Truck className="w-8 h-8" /></div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase text-base tracking-tighter">{req.mobileName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{req.date} • {req.items.length} Insumos</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-red-500 text-white' : 'bg-green-100 text-green-600'}`}>{req.status === 'PENDING' ? 'Pendiente' : 'Entregado'}</span>
                    {expandedRequestId === req.id ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}
                  </div>
                </div>
                {expandedRequestId === req.id && (
                  <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                    <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 mb-4">
                      <table className="w-full text-[11px]">
                        <thead className="bg-slate-100 text-slate-400 font-black uppercase text-[9px]">
                          <tr><th className="p-4 text-left">Insumo</th><th className="p-4 text-center">Despachar</th><th className="p-4 text-left">Referencia</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {req.items.map((item, i) => (
                            <tr key={i} className="font-bold text-slate-600">
                              <td className="p-4 uppercase">{item.name}</td>
                              <td className="p-4 text-center text-red-600 font-black">{item.deficit}</td>
                              <td className="p-4 text-blue-500 font-black">{item.historyNumber || 'Stock'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {req.status === 'PENDING' && (
                      <button onClick={() => {
                        setGlobalRequests(prev => prev.map(r => r.id === req.id ? {...r, status: 'COMPLETED'} : r));
                        showNotification("Solicitud marcada como despachada");
                      }} className="w-full bg-[#2b3a8c] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Finalizar Despacho
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center mb-6">
              <RefreshCw className="w-14 h-14 text-[#2b3a8c] mx-auto mb-4" />
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Importar Solicitud</h3>
              <p className="text-xs font-bold text-slate-400 uppercase mt-2">Pega el código generado por la ambulancia</p>
            </div>
            <textarea 
              className="w-full h-40 bg-slate-50 rounded-2xl p-4 text-[10px] font-mono text-black border-none focus:ring-2 focus:ring-blue-100 mb-6 resize-none"
              placeholder="Pega el código aquí..."
              value={syncInput}
              onChange={e => setSyncInput(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setShowSyncModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
              <button onClick={importSyncCode} className="flex-1 bg-[#2b3a8c] text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest shadow-xl">Sincronizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseModule;