
import React, { useState, useRef } from 'react';
import { 
  ClipboardList, Settings, Save, LogOut, ChevronLeft, ChevronRight, 
  FileCheck, AlertTriangle, Truck, Calendar, Gauge, Shield, ShieldCheck,
  Camera, Image as ImageIcon, Trash2, X, PlusCircle
} from 'lucide-react';
import { DRIVER_ITEMS, DRIVER_CATEGORIES } from './constants';
import { InventoryState, User as UserType, InventoryHeader, DayCheck } from './types';

interface DriverModuleProps {
  currentUser: UserType;
  initialState: InventoryState;
  onSave: (state: InventoryState) => void;
  onLogout: () => void;
  showNotification: (text: string, type?: 'success' | 'error') => void;
}

const DriverModule: React.FC<DriverModuleProps> = ({ currentUser, initialState, onSave, onLogout, showNotification }) => {
  const [state, setState] = useState<InventoryState>(initialState);
  const [activeTab, setActiveTab] = useState<'info' | 'check' | 'summary'>('info');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHeaderChange = (field: keyof InventoryHeader, value: string) => {
    setState(prev => ({ ...prev, header: { ...prev.header, [field]: value } }));
  };

  const handleSave = () => {
    if (!state.header.responsable || state.header.responsable.trim() === '') {
      showNotification("El nombre del conductor es obligatorio", "error");
      return;
    }
    onSave(state);
  };

  const setStatus = (itemId: string, day: number, status: DayCheck['status']) => {
    setState(prev => {
      const existingIdx = prev.checks.findIndex(c => c.itemId === itemId && c.day === day);
      const newChecks = [...prev.checks];
      if (existingIdx > -1) {
        newChecks[existingIdx].status = status;
      } else {
        newChecks.push({ itemId, day, status, currentStock: '', historyNumber: '' });
      }
      return { ...prev, checks: newChecks };
    });
  };

  const getStatusLabel = (status: DayCheck['status']) => {
    if (status === 'ok') return 'B';
    if (status === 'regular') return 'R';
    if (status === 'missing') return 'M';
    return '-';
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const currentPhotos = state.liquidPhotos?.[selectedDay] || [];
      if (currentPhotos.length >= 4) {
        showNotification("Límite máximo de 4 fotos alcanzado", "error");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setState(prev => ({
          ...prev,
          liquidPhotos: {
            ...(prev.liquidPhotos || {}),
            [selectedDay]: [...(prev.liquidPhotos?.[selectedDay] || []), base64String]
          }
        }));
        showNotification(`Foto ${currentPhotos.length + 1} de 4 cargada`);
      };
      reader.readAsDataURL(file);
    }
    // Reset input to allow same file upload if needed
    if (e.target) e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setState(prev => {
      const currentPhotos = [...(prev.liquidPhotos?.[selectedDay] || [])];
      currentPhotos.splice(index, 1);
      return { 
        ...prev, 
        liquidPhotos: {
          ...(prev.liquidPhotos || {}),
          [selectedDay]: currentPhotos
        }
      };
    });
    showNotification("Evidencia eliminada", "error");
  };

  return (
    <div className="pb-20">
      <header className="bg-[#2b3a8c] text-white px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6" />
          <h1 className="font-black text-sm uppercase leading-none tracking-tight">VOM TÉCNICO <br/><span className="text-[9px] opacity-60 tracking-widest leading-none">PESV-FR-01 v.02</span></h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-all shadow-lg active:scale-95"><Save className="w-5 h-5" /></button>
          <button onClick={onLogout} className="bg-red-500/20 p-2.5 rounded-xl hover:bg-red-500 transition-colors active:scale-95"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-6 px-4 space-y-6">
        <nav className="flex bg-white rounded-full p-1.5 shadow-sm border border-slate-100 gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'info', label: 'Datos Vehículo', icon: Truck },
            { id: 'check', label: 'Inspección B/R/M', icon: ClipboardList },
            { id: 'summary', label: 'Hoja de Control', icon: FileCheck }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-full font-black text-[9px] uppercase transition-all ${activeTab === tab.id ? 'bg-[#2b3a8c] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'info' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-8 animate-in fade-in">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
               <Shield className="text-[#2b3a8c] w-5 h-5" />
               <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Información del Formato</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre Conductor</label>
                <input className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.responsable} onChange={e => handleHeaderChange('responsable', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Placa</label>
                <input className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.placa} onChange={e => handleHeaderChange('placa', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Marca / Línea</label>
                <div className="grid grid-cols-2 gap-2">
                   <input placeholder="Marca" className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.marca || ''} onChange={e => handleHeaderChange('marca', e.target.value)} />
                   <input placeholder="Línea" className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.linea || ''} onChange={e => handleHeaderChange('linea', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modelo / Cilindraje</label>
                <div className="grid grid-cols-2 gap-2">
                   <input placeholder="Modelo" className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.modelo || ''} onChange={e => handleHeaderChange('modelo', e.target.value)} />
                   <input placeholder="Cilindraje" className="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.cilindraje || ''} onChange={e => handleHeaderChange('cilindraje', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kilometraje Inicial Mes</label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-3 w-4 h-4 text-slate-300" />
                  <input type="number" className="w-full bg-slate-50 rounded-xl p-3 pl-10 text-xs font-bold text-black border-none" value={state.header.kilometrajeInicial || ''} onChange={e => handleHeaderChange('kilometrajeInicial', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 pt-4">
               <ShieldCheck className="text-emerald-500 w-5 h-5" />
               <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Documentación Vigente</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 space-y-4">
                  <h4 className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">SOAT</h4>
                  <div className="space-y-3">
                     <div className="space-y-1">
                        <label className="text-[8px] font-bold text-emerald-600 uppercase">Aseguradora</label>
                        <input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.aseguradora || ''} onChange={e => handleHeaderChange('aseguradora', e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[8px] font-bold text-emerald-600 uppercase">Vencimiento</label>
                        <input type="date" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.vencimientoSoat || ''} onChange={e => handleHeaderChange('vencimientoSoat', e.target.value)} />
                     </div>
                  </div>
               </div>
               <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 space-y-4">
                  <h4 className="text-[9px] font-black text-blue-700 uppercase tracking-widest">TECNOMECÁNICA</h4>
                  <div className="space-y-3">
                     <div className="space-y-1">
                        <label className="text-[8px] font-bold text-blue-600 uppercase">CDA</label>
                        <input className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.cda || ''} onChange={e => handleHeaderChange('cda', e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[8px] font-bold text-blue-600 uppercase">Vencimiento</label>
                        <input type="date" className="w-full bg-white rounded-xl p-3 text-xs font-bold text-black border-none" value={state.header.vencimientoTecno || ''} onChange={e => handleHeaderChange('vencimientoTecno', e.target.value)} />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'check' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] py-8 px-10 shadow-sm border border-slate-100 flex justify-between items-center">
              <button onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))} className="p-4 text-slate-200 hover:text-[#2b3a8c] transition-transform"><ChevronLeft className="w-12 h-12" /></button>
              <div className="text-center group">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Día de Inspección</p>
                <p className="text-8xl font-black text-[#2b3a8c] tracking-tighter">{selectedDay}</p>
              </div>
              <button onClick={() => setSelectedDay(Math.min(31, selectedDay + 1))} className="p-4 text-slate-200 hover:text-[#2b3a8c] transition-transform"><ChevronRight className="w-12 h-12" /></button>
            </div>

            <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 text-center">
               <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Estado: B = Bueno | R = Regular | M = Malo</p>
            </div>

            {DRIVER_CATEGORIES.map(cat => (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2 px-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat}</h3>
                </div>
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                  {DRIVER_ITEMS.filter(i => i.category === cat).map(item => {
                    const check = state.checks.find(c => c.itemId === item.id && c.day === selectedDay);
                    const status = check?.status || 'none';

                    return (
                      <div key={item.id} className="p-5 transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700 uppercase leading-tight">{item.name}</p>
                          </div>
                          <div className="flex bg-slate-50 p-1.5 rounded-2xl w-full sm:w-auto gap-1">
                            <button 
                               onClick={() => setStatus(item.id, selectedDay, 'ok')} 
                               className={`flex-1 sm:w-12 h-12 rounded-xl text-xs font-black transition-all ${status === 'ok' ? 'bg-green-600 text-white shadow-md scale-110 z-10' : 'text-slate-300'}`}>B</button>
                            <button 
                               onClick={() => setStatus(item.id, selectedDay, 'regular')} 
                               className={`flex-1 sm:w-12 h-12 rounded-xl text-xs font-black transition-all ${status === 'regular' ? 'bg-amber-500 text-white shadow-md scale-110 z-10' : 'text-slate-300'}`}>R</button>
                            <button 
                               onClick={() => setStatus(item.id, selectedDay, 'missing')} 
                               className={`flex-1 sm:w-12 h-12 rounded-xl text-xs font-black transition-all ${status === 'missing' ? 'bg-red-600 text-white shadow-md scale-110 z-10' : 'text-slate-300'}`}>M</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Sección de fotos específica para LÍQUIDOS - SOPORTA HASTA 4 FOTOS */}
                  {cat === "LÍQUIDOS" && (
                    <div className="p-8 bg-blue-50/30 border-t border-blue-100/50">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-center space-y-1">
                          <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Registro Fotográfico de Niveles</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Sube hasta 4 fotos de evidencia para el día {selectedDay}</p>
                        </div>
                        
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          ref={fileInputRef}
                          onChange={handlePhotoUpload}
                        />

                        {/* Cuadrícula de fotos */}
                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                          {(state.liquidPhotos?.[selectedDay] || []).map((photo, idx) => (
                            <div key={idx} className="relative group">
                              <div className="aspect-square rounded-2xl overflow-hidden shadow-lg border-2 border-white ring-1 ring-blue-100">
                                 <img 
                                   src={photo} 
                                   alt={`Evidencia ${idx + 1}`} 
                                   className="w-full h-full object-cover"
                                 />
                              </div>
                              <button 
                                onClick={() => removePhoto(idx)}
                                className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:bg-red-700 transition-all active:scale-90"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          {/* Botón para agregar más fotos (si < 4) */}
                          {(!state.liquidPhotos?.[selectedDay] || state.liquidPhotos[selectedDay].length < 4) && (
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="flex flex-col items-center justify-center aspect-square bg-white rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                            >
                              <div className="bg-blue-100 p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                                <PlusCircle className="w-6 h-6" />
                              </div>
                              <span className="text-[7px] font-black text-blue-600 uppercase tracking-widest mt-2">Agregar Foto</span>
                              <span className="text-[6px] font-bold text-slate-300">{(state.liquidPhotos?.[selectedDay]?.length || 0)} / 4</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Observaciones y/o Hallazgos
              </label>
              <textarea 
                className="w-full bg-slate-50 rounded-2xl p-5 text-sm font-bold text-black border-none focus:ring-2 focus:ring-blue-100 min-h-[120px] resize-none"
                placeholder="Escribe aquí cualquier hallazgo importante..."
                value={state.header.observaciones}
                onChange={e => handleHeaderChange('observaciones', e.target.value)}
              />
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-[9px] border-collapse">
                       <thead className="bg-slate-50 text-slate-400 uppercase font-black">
                          <tr className="border-b"><th className="sticky left-0 bg-slate-50 p-4 border-r min-w-[180px] text-left">Ítem de Verificación</th>{Array.from({length: 31}, (_, i) => <th key={i} className="p-2 border-r text-center w-8">{i+1}</th>)}</tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {DRIVER_ITEMS.map(item => (
                             <tr key={item.id} className="hover:bg-slate-50">
                                <td className="sticky left-0 bg-white p-4 border-r font-bold text-slate-700 text-[9px] uppercase truncate">{item.name}</td>
                                {Array.from({length: 31}, (_, i) => {
                                   const check = state.checks.find(c => c.itemId === item.id && c.day === i+1);
                                   let val = '-'; 
                                   let col = 'text-slate-300';
                                   if (check) {
                                      val = getStatusLabel(check.status);
                                      if (check.status === 'ok') col = 'text-green-600 font-black';
                                      else if (check.status === 'regular') col = 'text-amber-500 font-black';
                                      else if (check.status === 'missing') col = 'text-red-500 font-black';
                                   }
                                   return <td key={i} className={`p-1 border-r text-center ${col}`}>{val}</td>;
                                })}
                             </tr>
                          ))}
                          {/* Fila especial para fotos en el resumen */}
                          <tr className="bg-blue-50/20">
                             <td className="sticky left-0 bg-blue-50/50 p-4 border-r font-black text-blue-800 text-[9px] uppercase truncate">Evidencia de Líquidos</td>
                             {Array.from({length: 31}, (_, i) => {
                                const photos = state.liquidPhotos?.[i+1];
                                const count = photos?.length || 0;
                                return <td key={i} className={`p-1 border-r text-center ${count > 0 ? 'text-blue-600 font-bold' : 'text-slate-200'}`}>
                                  {count > 0 ? `${count}📸` : '-'}
                                </td>;
                             })}
                          </tr>
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

export default DriverModule;
