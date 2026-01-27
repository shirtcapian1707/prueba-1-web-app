
import React, { useState } from 'react';
import { 
  ClipboardList, Pill, Thermometer, RefreshCw, FileSpreadsheet, Truck, Save, LogOut, 
  ChevronLeft, ChevronRight, Sun, Moon, Droplets, ShieldCheck, ChevronDown, ChevronUp,
  FlaskConical, Activity, Copy, CheckCircle, Plus, Trash2, Calendar, Info, Beaker, Tag,
  BarChart3, AlertTriangle, Timer, PackageSearch, History, CloudUpload
} from 'lucide-react';
import { INVENTORY_ITEMS, CATEGORIES } from './constants';
import { InventoryState, User as UserType, TechnicalInfo, ClimateReading, InventoryHeader, BatchEntry } from './types';
import { API_URL } from './config';

interface MobileModuleProps {
  currentUser: UserType;
  initialState: InventoryState;
  onSave: (state: InventoryState) => void;
  onLogout: () => void;
  showNotification: (text: string, type?: 'success' | 'error') => void;
}

const MobileModule: React.FC<MobileModuleProps> = ({ currentUser, initialState, onSave, onLogout, showNotification }) => {
  const [state, setState] = useState<InventoryState>(initialState);
  const [activeTab, setActiveTab] = useState<'daily' | 'technical' | 'climate' | 'orders' | 'summary'>('daily');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const handleHeaderChange = (field: keyof InventoryHeader, value: string) => {
    setState(prev => ({ ...prev, header: { ...prev.header, [field]: value } }));
  };

  const handleSave = () => {
    if (!state.header.responsable || state.header.responsable.trim() === '') {
      showNotification("El nombre del responsable es obligatorio", "error");
      return;
    }
    onSave(state);
  };

  const enviarDatosServidor = async (jornada: 'AM' | 'PM') => {
    const data = state.climateData[selectedDay];
    if (!data) {
      showNotification("No hay datos registrados para hoy", "error");
      return;
    }

    const tempVal = jornada === 'AM' ? data.tempAM : data.tempPM;
    const humVal = jornada === 'AM' ? data.humAM : data.humPM;

    if (!tempVal || !humVal) {
      showNotification(`Faltan datos en la jornada ${jornada}`, "error");
      return;
    }

    const temp = parseFloat(tempVal);
    const hum = parseFloat(humVal);

    if (isNaN(temp) || isNaN(hum)) {
      showNotification("Los valores deben ser numéricos", "error");
      return;
    }

    if (!state.header.responsable) {
      showNotification("El nombre del responsable es obligatorio", "error");
      return;
    }

    const payload = {
      movil_id: currentUser.id,
      jornada: jornada === 'AM' ? 'M' : 'T',
      temperatura: temp,
      humedad: hum,
      responsable: state.header.responsable
    };

    setIsSyncing(jornada);
    try {
      const response = await fetch(`${API_URL}/api/guardar-temperatura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showNotification(`Sincronización ${jornada} exitosa`, "success");
      } else {
        showNotification(`Error del servidor: ${response.status}`, "error");
      }
    } catch (error) {
      showNotification("Error de red: Servidor FastAPI no alcanzado", "error");
    } finally {
      setIsSyncing(null);
    }
  };

  const getLifeStatus = (expiryDate: string) => {
    if (!expiryDate) return { label: 'PENDIENTE', color: 'bg-slate-100 text-slate-400', days: 0, severity: 'none' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: `VENCIDO`, color: 'bg-red-600 text-white', days: diffDays, severity: 'critical' };
    if (diffDays <= 90) return { label: `CRÍTICO`, color: 'bg-red-500 text-white', days: diffDays, severity: 'high' };
    if (diffDays <= 180) return { label: `ALERTA`, color: 'bg-amber-500 text-white', days: diffDays, severity: 'medium' };
    return { label: `VIGENTE`, color: 'bg-emerald-500 text-white', days: diffDays, severity: 'safe' };
  };

  const toggleCheck = (itemId: string, day: number, status: 'ok' | 'missing') => {
    setState(prev => {
      const existingIdx = prev.checks.findIndex(c => c.itemId === itemId && c.day === day);
      const newChecks = [...prev.checks];
      if (existingIdx > -1) {
        newChecks[existingIdx].status = newChecks[existingIdx].status === status ? 'none' : status;
      } else {
        newChecks.push({ itemId, day, status, currentStock: '', historyNumber: '' });
      }
      return { ...prev, checks: newChecks };
    });
  };

  const updateCheckDetail = (itemId: string, day: number, field: string, value: string) => {
    setState(prev => ({
      ...prev,
      checks: prev.checks.map(c => (c.itemId === itemId && c.day === day) ? { ...c, [field]: value } : c)
    }));
  };

  const handleTechnicalChange = (itemId: string, field: keyof TechnicalInfo, value: any) => {
    setState(prev => {
      const current = prev.technicalData[itemId] || { 
        fechaRegistro: new Date().toISOString().split('T')[0],
        descripcion: '', marca: '', presentacionComercial: '', registroInvima: '',
        claseRiesgo: '', vidaUtil: '', batches: [] 
      };
      return {
        ...prev,
        technicalData: { ...prev.technicalData, [itemId]: { ...current, [field]: value } }
      };
    });
  };

  const addBatch = (itemId: string) => {
    const current = state.technicalData[itemId] || { batches: [] };
    const newBatch: BatchEntry = { id: Date.now().toString(), lot: '', expiryDate: '', quantity: '' };
    handleTechnicalChange(itemId, 'batches', [...(current.batches || []), newBatch]);
  };

  const removeBatch = (itemId: string, batchId: string) => {
    const current = state.technicalData[itemId];
    if (!current) return;
    handleTechnicalChange(itemId, 'batches', current.batches.filter(b => b.id !== batchId));
    showNotification("Lote eliminado correctamente");
  };

  const updateBatch = (itemId: string, batchId: string, field: keyof BatchEntry, value: string) => {
    const current = state.technicalData[itemId];
    const updatedBatches = current.batches.map(b => b.id === batchId ? { ...b, [field]: value } : b);
    handleTechnicalChange(itemId, 'batches', updatedBatches);
  };

  const handleClimateChange = (day: number, field: keyof ClimateReading, value: string) => {
    setState(prev => ({
      ...prev,
      climateData: {
        ...prev.climateData,
        [day]: { ...(prev.climateData[day] || { tempAM: '', humAM: '', tempPM: '', humPM: '' }), [field]: value }
      }
    }));
  };

  const generateSyncCode = () => {
    const missingItems = state.checks
      .filter(c => c.day === selectedDay && c.status === 'missing')
      .map(c => {
        const itemInfo = INVENTORY_ITEMS.find(i => i.id === c.itemId);
        const req = typeof itemInfo?.requiredStock === 'number' ? itemInfo.requiredStock : parseInt(String(itemInfo?.requiredStock)) || 0;
        return { n: itemInfo?.name || '?', d: Math.max(0, req - (parseFloat(String(c.currentStock)) || 0)), c: c.currentStock || 0, h: c.historyNumber || '' };
      });
    const payload = { mi: currentUser.id, mn: currentUser.displayName, dt: new Date().toLocaleDateString(), it: missingItems };
    navigator.clipboard.writeText(btoa(JSON.stringify(payload)));
    showNotification("Código de SOLICITUD corto copiado");
  };

  const renderClimateChart = () => {
    const width = 1000;
    const height = 200;
    const xStep = width / 30;
    const tempPoints: string[] = [];
    const humPoints: string[] = [];

    for (let i = 1; i <= 31; i++) {
      const d = state.climateData[i];
      if (d) {
        const tAM = parseFloat(d.tempAM);
        const tPM = parseFloat(d.tempPM);
        const hAM = parseFloat(d.humAM);
        const hPM = parseFloat(d.humPM);
        
        const avgT = (isNaN(tAM) ? (isNaN(tPM) ? null : tPM) : (isNaN(tPM) ? tAM : (tAM + tPM) / 2));
        const avgH = (isNaN(hAM) ? (isNaN(hPM) ? null : hPM) : (isNaN(hPM) ? hAM : (hAM + hPM) / 2));

        if (avgT !== null) tempPoints.push(`${(i - 1) * xStep},${height - (Math.min(avgT, 50) / 50) * height}`);
        if (avgH !== null) humPoints.push(`${(i - 1) * xStep},${height - (Math.min(avgH, 100) / 100) * height}`);
      }
    }

    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <BarChart3 className="w-5 h-5 text-[#2b3a8c]" />
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Gráfica de Tendencia Mensual</h3>
        </div>
        <div className="h-48 w-full bg-slate-50/50 rounded-2xl p-4 relative border border-slate-100/50">
          <div className="absolute top-2 right-4 flex gap-4 text-[7px] font-black uppercase tracking-widest z-10">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Temp (°C)</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Hum (%)</div>
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            {[0, 25, 50, 75, 100].map(p => (
              <line key={p} x1="0" y1={height - (p/100 * height)} x2={width} y2={height - (p/100 * height)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
            ))}
            {humPoints.length > 1 && <polyline fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={humPoints.join(' ')} />}
            {tempPoints.length > 1 && <polyline fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={tempPoints.join(' ')} />}
            {(() => {
              const d = state.climateData[selectedDay];
              if (d) {
                const tAM = parseFloat(d.tempAM);
                const tPM = parseFloat(d.tempPM);
                const avgT = (isNaN(tAM) ? (isNaN(tPM) ? null : tPM) : (isNaN(tPM) ? tAM : (tAM + tPM) / 2));
                if (avgT !== null) return <circle cx={(selectedDay - 1) * xStep} cy={height - (Math.min(avgT, 50) / 50) * height} r="6" fill="#f59e0b" stroke="white" strokeWidth="2" />;
              }
              return null;
            })()}
          </svg>
          <div className="flex justify-between mt-2 text-[7px] font-bold text-slate-300 uppercase tracking-widest">
            <span>Día 01</span>
            <span>Centro del Mes</span>
            <span>Día 31</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-20">
      <header className="bg-[#2b3a8c] text-white px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6" />
          <h1 className="font-black text-sm uppercase leading-none tracking-tight">VOM SAS <br/><span className="text-[9px] opacity-60 tracking-widest">Control Digital</span></h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-all shadow-lg active:scale-95"><Save className="w-5 h-5" /></button>
          <button onClick={onLogout} className="bg-red-500/20 p-2.5 rounded-xl hover:bg-red-500 transition-colors active:scale-95"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-6 px-4 space-y-6">
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsable <span className="text-red-500">*</span></label>
            <input className={`w-full bg-slate-50 rounded-xl p-3 text-xs font-bold text-black border-none focus:ring-2 focus:ring-blue-100 ${!state.header.responsable ? 'ring-1 ring-red-100' : ''}`} value={state.header.responsable} placeholder="Nombre completo del responsable" onChange={e => handleHeaderChange('responsable', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Placa Vehículo</label>
            <input className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold text-black border-none focus:ring-2 focus:ring-blue-100" value={state.header.placa} onChange={e => handleHeaderChange('placa', e.target.value)} />
          </div>
        </div>

        <nav className="flex bg-white rounded-full p-1.5 shadow-sm border border-slate-100 gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'daily', label: 'Diario', icon: ClipboardList },
            { id: 'technical', label: 'Técnica', icon: ShieldCheck },
            { id: 'climate', label: 'Ambiente', icon: Thermometer },
            { id: 'summary', label: 'Resumen', icon: FileSpreadsheet },
            { id: 'orders', label: 'Sincro', icon: RefreshCw }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[90px] flex items-center justify-center gap-2 py-3 rounded-full font-black text-[9px] uppercase transition-all ${activeTab === tab.id ? 'bg-[#2b3a8c] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </nav>

        {(activeTab === 'daily' || activeTab === 'climate') && (
          <div className="bg-white rounded-[2.5rem] py-8 px-10 shadow-sm border border-slate-100 flex justify-between items-center">
            <button onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))} className="p-4 text-slate-200 hover:text-[#2b3a8c] transition-transform"><ChevronLeft className="w-12 h-12" /></button>
            <div className="text-center group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Día de Registro</p>
              <p className="text-8xl font-black text-[#2b3a8c] tracking-tighter">{selectedDay}</p>
            </div>
            <button onClick={() => setSelectedDay(Math.min(31, selectedDay + 1))} className="p-4 text-slate-200 hover:text-[#2b3a8c] transition-transform"><ChevronRight className="w-12 h-12" /></button>
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="space-y-8 animate-in fade-in">
            {CATEGORIES.map(cat => (
              <div key={cat} className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">{cat}</h3>
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                  {INVENTORY_ITEMS.filter(i => i.category === cat).map(item => {
                    const check = state.checks.find(c => c.itemId === item.id && c.day === selectedDay);
                    const isMissing = check?.status === 'missing';
                    const technicalInfo = state.technicalData[item.id];
                    const activeBatches = technicalInfo?.batches || [];

                    return (
                      <div key={item.id} className={`p-5 transition-colors ${isMissing ? 'bg-red-50/30' : ''}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700 uppercase leading-tight">{item.name}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Requerido: <span className="text-blue-600">{item.requiredStock}</span></p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={() => toggleCheck(item.id, selectedDay, 'ok')} className={`flex-1 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${check?.status === 'ok' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>OK</button>
                            <button onClick={() => toggleCheck(item.id, selectedDay, 'missing')} className={`flex-1 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${isMissing ? 'bg-red-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>Falta</button>
                          </div>
                        </div>
                        
                        {isMissing && (
                          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input type="number" className="w-full bg-white border border-red-100 rounded-xl p-3 text-xs font-bold text-black" value={check?.currentStock || ''} placeholder="Stock Actual" onChange={e => updateCheckDetail(item.id, selectedDay, 'currentStock', e.target.value)} />
                              <input className="w-full bg-white border border-red-100 rounded-xl p-3 text-xs font-bold text-black" value={check?.historyNumber || ''} placeholder="N° Hist. Clínica" onChange={e => updateCheckDetail(item.id, selectedDay, 'historyNumber', e.target.value)} />
                            </div>

                            <div className="bg-white/60 p-4 rounded-2xl border border-red-100/50">
                               <div className="flex items-center gap-2 mb-3">
                                  <Tag className="w-3 h-3 text-red-500" />
                                  <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Lotes Registrados (Eliminar si ya se usó)</h4>
                               </div>
                               {activeBatches.length > 0 ? (
                                 <div className="space-y-2">
                                    {activeBatches.map(batch => (
                                      <div key={batch.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                                         <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-800 uppercase leading-none">Lote: {batch.lot}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Vence: {batch.expiryDate}</span>
                                         </div>
                                         <button 
                                           onClick={() => removeBatch(item.id, batch.id)}
                                           className="bg-red-50 p-2 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                           title="Eliminar lote usado"
                                         >
                                            <Trash2 className="w-3.5 h-3.5" />
                                         </button>
                                      </div>
                                    ))}
                                 </div>
                               ) : (
                                 <p className="text-[8px] font-bold text-slate-400 uppercase italic">No hay lotes registrados para este ítem.</p>
                               )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-[#2b3a8c] p-6 rounded-[2rem] text-white flex items-center justify-between shadow-xl">
               <div>
                 <h2 className="text-base font-black uppercase tracking-widest">Trazabilidad Técnica</h2>
                 <p className="text-[9px] opacity-60 uppercase font-bold tracking-widest">Registro INVIMA y Vida Útil</p>
               </div>
               <ShieldCheck className="w-8 h-8 opacity-40" />
            </div>

            {INVENTORY_ITEMS.map(item => {
              const t = state.technicalData[item.id] || { 
                fechaRegistro: new Date().toISOString().split('T')[0], descripcion: '', marca: '', presentacionComercial: '', registroInvima: '', claseRiesgo: '', vidaUtil: '', batches: [] 
              };
              const isExpanded = expandedTechId === item.id;
              const lifeStatus = t.batches.reduce((worst, b) => {
                const s = getLifeStatus(b.expiryDate);
                const order = { critical: 3, high: 2, medium: 1, safe: 0, none: -1 };
                return order[s.severity as keyof typeof order] > order[worst.severity as keyof typeof order] ? s : worst;
              }, { severity: 'none', color: 'bg-slate-100 text-slate-400', label: 'Sin Datos' } as any);

              return (
                <div key={item.id} className={`bg-white rounded-[2rem] border overflow-hidden transition-all ${isExpanded ? 'shadow-xl ring-1 ring-blue-50' : 'border-slate-100'}`}>
                  <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50" onClick={() => setExpandedTechId(isExpanded ? null : item.id)}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-4 rounded-2xl ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {item.type === 'MEDICAMENTO' ? <Pill className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{item.name}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${lifeStatus.color}`}>{lifeStatus.label}</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-300" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                  </div>

                  {isExpanded && (
                    <div className="p-6 bg-slate-50/30 border-t border-slate-100 animate-in slide-in-from-top-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Descripción</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.descripcion} onChange={e => handleTechnicalChange(item.id, 'descripcion', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Marca</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.marca} onChange={e => handleTechnicalChange(item.id, 'marca', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Presentación Comercial</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.presentacionComercial} onChange={e => handleTechnicalChange(item.id, 'presentacionComercial', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Reg. Sanitario / INVIMA</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.registroInvima} onChange={e => handleTechnicalChange(item.id, 'registroInvima', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Clase de Riesgo</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.claseRiesgo} onChange={e => handleTechnicalChange(item.id, 'claseRiesgo', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Vida Útil</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.vidaUtil} onChange={e => handleTechnicalChange(item.id, 'vidaUtil', e.target.value)} /></div>
                          
                          {item.type === 'MEDICAMENTO' && (
                            <>
                              <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Principio Activo</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.principioActivo || ''} onChange={e => handleTechnicalChange(item.id, 'principioActivo', e.target.value)} /></div>
                              <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Forma Farmacéutica</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.formaFarmaceutica || ''} onChange={e => handleTechnicalChange(item.id, 'formaFarmaceutica', e.target.value)} /></div>
                              <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Concentración</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.concentracion || ''} onChange={e => handleTechnicalChange(item.id, 'concentracion', e.target.value)} /></div>
                              <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Unidad de Medida</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.unidadMedida || ''} onChange={e => handleTechnicalChange(item.id, 'unidadMedida', e.target.value)} /></div>
                            </>
                          )}
                          {item.type === 'DISPOSITIVO' && (
                            <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Serie</label><input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border border-slate-200" value={t.serie || ''} onChange={e => handleTechnicalChange(item.id, 'serie', e.target.value)} /></div>
                          )}
                       </div>

                       <div className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                             <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Lotes y Vencimiento</h4>
                             <button onClick={() => addBatch(item.id)} className="bg-blue-600 text-white p-2 rounded-lg"><Plus className="w-4 h-4" /></button>
                          </div>
                          <div className="space-y-3">
                             {t.batches.map(batch => (
                               <div key={batch.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                  <div className="grid grid-cols-3 gap-3">
                                     <input className="bg-slate-50 border-none rounded-lg p-2 text-[10px] font-black text-black" value={batch.lot} placeholder="Lote" onChange={e => updateBatch(item.id, batch.id, 'lot', e.target.value)} />
                                     <input type="date" className="bg-slate-50 border-none rounded-lg p-2 text-[10px] font-black text-black" value={batch.expiryDate} onChange={e => updateBatch(item.id, batch.id, 'expiryDate', e.target.value)} />
                                     <input className="bg-slate-50 border-none rounded-lg p-2 text-[10px] font-black text-black" value={batch.quantity || ''} placeholder="Cant" onChange={e => updateBatch(item.id, batch.id, 'quantity', e.target.value)} />
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${getLifeStatus(batch.expiryDate).color}`}>{getLifeStatus(batch.expiryDate).label}</span>
                                    <button onClick={() => removeBatch(item.id, batch.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'climate' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {['AM', 'PM'].map(j => (
                  <div key={j} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-6">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         {j === 'AM' ? <Sun className="w-6 h-6 text-amber-500" /> : <Moon className="w-6 h-6 text-indigo-500" />}
                         <span className="font-black text-xs uppercase tracking-widest text-slate-500">Jornada {j}</span>
                       </div>
                       <button 
                         onClick={() => enviarDatosServidor(j as 'AM' | 'PM')}
                         disabled={isSyncing !== null}
                         className={`p-3 rounded-2xl flex items-center gap-2 text-[8px] font-black uppercase tracking-widest transition-all ${isSyncing === j ? 'bg-indigo-100 text-indigo-400 animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                       >
                         {isSyncing === j ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                         Sincro
                       </button>
                     </div>
                     <input type="number" step="0.1" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-black text-black" placeholder="Temperatura °C" value={(state.climateData[selectedDay] as any)?.[`temp${j}`] || ''} onChange={e => handleClimateChange(selectedDay, `temp${j}` as any, e.target.value)} />
                     <input type="number" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-black text-black" placeholder="Humedad %" value={(state.climateData[selectedDay] as any)?.[`hum${j}`] || ''} onChange={e => handleClimateChange(selectedDay, `hum${j}` as any, e.target.value)} />
                  </div>
               ))}
            </div>

            {/* GRÁFICA DE TENDENCIA AMBIENTAL */}
            {renderClimateChart()}

            {/* SECCIÓN DE TRAZABILIDAD AMBIENTAL MENSUAL */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8 space-y-6">
               <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <History className="w-5 h-5 text-[#2b3a8c]" />
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Trazabilidad Ambiental Mensual</h3>
               </div>
               
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-[10px] border-collapse min-w-[320px]">
                     <thead className="bg-slate-50 text-slate-400 uppercase font-black">
                        <tr className="border-b">
                           <th className="p-3 border-r text-center bg-slate-100 w-10">Día</th>
                           <th className="p-2 border-r text-center" colSpan={2}>AM</th>
                           <th className="p-2 text-center" colSpan={2}>PM</th>
                        </tr>
                        <tr className="border-b bg-slate-50/50">
                           <th className="p-2 border-r bg-slate-100 text-[8px]">#</th>
                           <th className="p-2 border-r text-[8px] text-amber-600">T°C</th>
                           <th className="p-2 border-r text-[8px] text-amber-600">H%</th>
                           <th className="p-2 border-r text-[8px] text-indigo-600">T°C</th>
                           <th className="p-2 text-[8px] text-indigo-600">H%</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-center">
                        {Array.from({length: 31}, (_, i) => {
                           const day = i + 1;
                           const d = state.climateData[day] || { tempAM: '', humAM: '', tempPM: '', humPM: '' };
                           const isCurrent = day === selectedDay;
                           return (
                             <tr key={day} className={`transition-colors ${isCurrent ? 'bg-blue-50/80 font-bold' : ''}`}>
                                <td className={`p-2 border-r bg-slate-50/30 ${isCurrent ? 'text-[#2b3a8c]' : 'text-slate-400'}`}>{day}</td>
                                <td className="p-2 border-r">{d.tempAM || '-'}</td>
                                <td className="p-2 border-r">{d.humAM || '-'}</td>
                                <td className="p-2 border-r">{d.tempPM || '-'}</td>
                                <td className="p-2">{d.humPM || '-'}</td>
                             </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-[3rem] p-10 shadow-xl text-center">
             <RefreshCw className="w-12 h-12 text-[#2b3a8c] mx-auto mb-6" />
             <h2 className="text-2xl font-black text-slate-800 uppercase">Sincronización</h2>
             <button onClick={generateSyncCode} className="w-full mt-10 bg-[#2b3a8c] text-white py-6 rounded-3xl font-black text-sm uppercase shadow-2xl">Generar Código Corto</button>
          </div>
        )}

        {activeTab === 'summary' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-[9px] border-collapse">
                       <thead className="bg-slate-50 text-slate-400 uppercase font-black">
                          <tr className="border-b"><th className="sticky left-0 bg-slate-50 p-4 border-r min-w-[160px] text-left">Insumo</th>{Array.from({length: 31}, (_, i) => <th key={i} className="p-2 border-r text-center w-10">{i+1}</th>)}</tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {INVENTORY_ITEMS.map(item => (
                             <tr key={item.id} className="hover:bg-slate-50"><td className="sticky left-0 bg-white p-4 border-r font-bold text-slate-700 text-[10px] uppercase truncate">{item.name}</td>{Array.from({length: 31}, (_, i) => {
                                   const check = state.checks.find(c => c.itemId === item.id && c.day === i+1);
                                   let val = '-'; let col = 'text-slate-300';
                                   if (check?.status === 'ok') { val = String(item.requiredStock); col = 'text-green-600 font-black'; }
                                   else if (check?.status === 'missing') { val = String(check.currentStock || 0); col = 'text-red-500 font-black'; }
                                   return <td key={i} className={`p-2 border-r text-center ${col}`}>{val}</td>;
                                })}</tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default MobileModule;
