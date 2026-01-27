
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, LogOut, Truck, Users, UserCog, Key, Clock, History, CheckCircle2, 
  AlertCircle, Eye, ClipboardCheck, Thermometer, Pill, X, Calendar, Tag, Droplets, 
  Info, ChevronLeft, ChevronRight, FileDown, Camera, Shield, Gauge, User, 
  FolderDown, FileSpreadsheet, Search, Download, Archive, RefreshCw
} from 'lucide-react';
import { User as UserType, InventoryState, TechnicalInfo } from './types';
import { INVENTORY_ITEMS, CATEGORIES, DRIVER_ITEMS } from './constants';
import { API_URL } from './config';
import * as XLSX from 'xlsx';

interface AdminModuleProps {
  users: UserType[];
  setUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
  globalInventory: Record<string, InventoryState>;
  onLogout: () => void;
  showNotification: (text: string, type?: 'success' | 'error') => void;
}

const AdminModule: React.FC<AdminModuleProps> = ({ 
  users, setUsers, globalInventory, onLogout, showNotification
}) => {
  const [activeTab, setActiveTab] = useState<'fleet' | 'users' | 'history'>('fleet');
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [viewingUnit, setViewingUnit] = useState<{ crewId: string; driverId: string; number: string } | null>(null);
  const [activeAuditType, setActiveAuditType] = useState<'CREW' | 'DRIVER'>('CREW');
  
  // Estados para el historial centralizado (Servidor)
  const [historial, setHistorial] = useState<string[]>([]);
  const [movilSeleccionado, setMovilSeleccionado] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const checkStatus = (userId: string, day: number) => {
    const user = users.find(u => u.id === userId);
    const data = globalInventory[userId];
    if (!data) return { done: false, daily: false, tech: false, climate: false, hasPhoto: false };
    
    const isDriver = user?.username.startsWith('CONDMOVIL');
    const dailyDone = (data.checks || []).some(c => c.day === day && c.status !== 'none');
    const techDone = Object.keys(data.technicalData || {}).length > 0;
    const climate = data.climateData?.[day];
    const climateDone = !!(climate && (climate.tempAM || climate.tempPM || climate.humAM || climate.humPM));
    const hasPhoto = !!(data.liquidPhotos?.[day] && data.liquidPhotos[day].length > 0);
    
    const overallDone = isDriver ? dailyDone : (dailyDone && techDone && climateDone);
    return { done: overallDone, daily: dailyDone, tech: techDone, climate: climateDone, hasPhoto };
  };

  const cargarHistorial = async (nombreMovil: string) => {
    if (!nombreMovil) {
      setHistorial([]);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const folderName = nombreMovil.replace(/\s+/g, "_");
      const response = await fetch(`${API_URL}/api/historial/${folderName}`);
      if (!response.ok) throw new Error("Error al consultar el servidor");
      const data = await response.json();
      setHistorial(data.archivos || []);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      showNotification("Error conectando con el servidor central", "error");
      setHistorial([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const mobileUsers = users.filter(u => u.role === 'MOBILE');
      const inventoryData: any[] = [];
      mobileUsers.forEach(user => {
        const inv = globalInventory[user.id];
        if (!inv) return;
        const items = user.username.startsWith('CONDMOVIL') ? DRIVER_ITEMS : INVENTORY_ITEMS;
        items.forEach(item => {
          const row: any = { 'Móvil': user.displayName, 'Placa': inv.header.placa, 'Categoría': item.category, 'Insumo': item.name, 'Req': item.requiredStock };
          for (let d = 1; d <= 31; d++) {
            const check = inv.checks.find(c => c.itemId === item.id && c.day === d);
            if (user.username.startsWith('CONDMOVIL')) {
               row[`D${d}`] = check ? (check.status === 'ok' ? 'B' : (check.status === 'regular' ? 'R' : 'M')) : '-';
            } else {
               row[`D${d}`] = check?.status === 'ok' ? item.requiredStock : (check?.status === 'missing' ? (check.currentStock || '0') : '-');
            }
          }
          inventoryData.push(row);
        });
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryData), "VOM_Consolidado");
      XLSX.writeFile(wb, `REPORTE_LOCAL_VOM_${selectedDay}_${new Date().getMonth()+1}.xlsx`);
      showNotification("Reporte generado localmente");
    } catch (error) {
      showNotification("Error exportando", "error");
    }
  };

  const updateUserPassword = (userId: string, newPass: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPass } : u));
    showNotification("Contraseña actualizada");
  };

  const units = Array.from({ length: 30 }, (_, i) => {
    const num = i + 1;
    const crew = users.find(u => u.username.toLowerCase() === `movil-${num}`);
    const driver = users.find(u => u.username.toUpperCase() === `CONDMOVIL-${num}`);
    return {
      number: num.toString(),
      crewId: crew?.id || '',
      driverId: driver?.id || '',
      crewName: crew?.displayName || `Móvil ${num}`,
      driverName: driver?.displayName || `Conductor ${num}`
    };
  }).filter(u => u.crewId || u.driverId);

  const viewingData = activeAuditType === 'CREW' 
    ? globalInventory[viewingUnit?.crewId || ''] 
    : globalInventory[viewingUnit?.driverId || ''];

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-12">
      <header className="bg-[#1e293b] text-white px-6 py-5 flex justify-between items-center shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl"><ShieldCheck className="w-6 h-6" /></div>
          <div><h1 className="font-black text-sm uppercase leading-none">Panel de Control VOM</h1><p className="text-[10px] font-bold opacity-60 uppercase mt-1">Revisión Unificada de Flota</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToExcel} title="Exportar Local" className="bg-emerald-500 hover:bg-emerald-600 p-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-emerald-500/30"><FileDown className="w-5 h-5" /> <span>Local</span></button>
          <button onClick={onLogout} className="bg-red-500/20 p-2.5 rounded-xl hover:bg-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-8 px-4 space-y-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4"><Calendar className="w-6 h-6 text-indigo-600" /><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Día de Auditoría Local</p><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Día Seleccionado: {selectedDay}</h2></div></div>
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl"><button onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))} className="p-3 hover:bg-white rounded-xl transition-all"><ChevronLeft className="w-5 h-5" /></button><span className="text-2xl font-black px-6 text-indigo-600">{selectedDay}</span><button onClick={() => setSelectedDay(Math.min(31, selectedDay + 1))} className="p-3 hover:bg-white rounded-xl transition-all"><ChevronRight className="w-5 h-5" /></button></div>
        </div>

        <nav className="flex bg-white rounded-full p-1.5 shadow-sm border border-slate-200 gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('fleet')} className={`flex-1 min-w-[140px] py-4 rounded-full font-black text-[10px] uppercase transition-all ${activeTab === 'fleet' ? 'bg-[#1e293b] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Unidades Hoy</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[140px] py-4 rounded-full font-black text-[10px] uppercase transition-all ${activeTab === 'history' ? 'bg-[#1e293b] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Historial Central</button>
          <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[140px] py-4 rounded-full font-black text-[10px] uppercase transition-all ${activeTab === 'users' ? 'bg-[#1e293b] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Usuarios</button>
        </nav>

        {activeTab === 'fleet' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {units.map(unit => {
              const crewStatus = checkStatus(unit.crewId, selectedDay);
              const driverStatus = checkStatus(unit.driverId, selectedDay);
              return (
                <div key={unit.number} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                  <div className="p-6 bg-slate-50 flex justify-between items-center border-b">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#1e293b] text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm">#{unit.number}</div>
                      <h3 className="font-black text-slate-800 uppercase text-xs">{unit.crewName}</h3>
                    </div>
                    <button onClick={() => { setViewingUnit(unit); setActiveAuditType('CREW'); }} className="bg-white p-3 rounded-2xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all text-indigo-600"><Eye className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><Users className="w-3 h-3"/> Tripulación</div>
                      <div className="flex gap-1.5">
                        <div className={`p-2.5 rounded-xl border ${crewStatus.daily ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-200'}`}><ClipboardCheck className="w-4 h-4" /></div>
                        <div className={`p-2.5 rounded-xl border ${crewStatus.climate ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-200'}`}><Thermometer className="w-4 h-4" /></div>
                      </div>
                    </div>
                    <div className="space-y-3 border-l pl-4">
                      <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><Truck className="w-3 h-3"/> Conductor</div>
                      <div className="flex gap-1.5">
                        <div className={`p-2.5 rounded-xl border ${driverStatus.daily ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-200'}`}><Gauge className="w-4 h-4" /></div>
                        <div className={`p-2.5 rounded-xl border ${driverStatus.hasPhoto ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-200'}`}><Camera className="w-4 h-4" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-slate-100 pb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Consultar Archivos del Servidor</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acceso directo a la base de datos de reportes</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-300" />
                    <select 
                      className="w-full bg-slate-50 rounded-2xl p-3.5 pl-10 text-[10px] font-black uppercase text-slate-700 border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                      value={movilSeleccionado}
                      onChange={(e) => {
                        setMovilSeleccionado(e.target.value);
                        cargarHistorial(e.target.value);
                      }}
                    >
                      <option value="">Seleccione un móvil</option>
                      {units.map(u => (
                        <option key={u.number} value={u.crewName}>{u.crewName}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => cargarHistorial(movilSeleccionado)}
                    disabled={!movilSeleccionado || isLoadingHistory}
                    className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-30"
                  >
                    {/* Fixed: Added RefreshCw to imports to resolve Cannot find name 'RefreshCw' error */}
                    <RefreshCw className={`w-5 h-5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {historial.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {historial.map((archivo, index) => (
                    <div key={index} className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-indigo-600">
                           <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div className="max-w-[150px] truncate">
                           <p className="text-[10px] font-black text-slate-800 uppercase truncate" title={archivo.split('\\').pop()?.split('/').pop()}>
                             {archivo.split('\\').pop()?.split('/').pop()}
                           </p>
                           <p className="text-[8px] font-bold text-slate-400 uppercase">Reporte Mensual</p>
                        </div>
                      </div>
                      <a 
                        href={`${API_URL}/static/${archivo}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white p-3 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center">
                  <Archive className="w-16 h-16 text-slate-100 mb-4" />
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                    {movilSeleccionado ? "No hay archivos en el servidor para este móvil aún" : "Seleccione una unidad para ver sus reportes"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-500">
             <div className="overflow-x-auto"><table className="w-full text-[11px] border-collapse"><thead className="bg-slate-50 text-slate-400 uppercase font-black"><tr className="border-b"><th className="p-6 text-left">Identidad</th><th className="p-6 text-left">Rol</th><th className="p-6 text-left">Credencial</th><th className="p-6 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map(u => (<tr key={u.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-6"><p className="font-black text-slate-800 text-sm uppercase">{u.displayName}</p><p className="text-[10px] text-slate-400 font-bold">{u.username}</p></td><td className="p-6"><span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{u.role}</span></td><td className="p-6"><div className="flex items-center gap-2 font-mono text-black font-bold bg-slate-50 p-2 rounded-xl border border-slate-100 w-fit"><Key className="w-3 h-3 text-slate-300" /><input type="text" className="bg-transparent border-none focus:ring-0 p-0 w-24" value={u.password} onChange={(e) => updateUserPassword(u.id, e.target.value)} /></div></td><td className="p-6 text-right"><button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-xl"><UserCog className="w-4 h-4" /></button></td></tr>))}</tbody></table></div>
          </div>
        )}
      </main>

      {viewingUnit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setViewingUnit(null)}></div>
           <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8">
              <div className="bg-[#1e293b] text-white p-8 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className="bg-indigo-500 p-4 rounded-3xl shadow-lg"><Truck className="w-8 h-8" /></div>
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter">{viewingUnit.number}</h2>
                      <p className="text-[10px] font-bold opacity-60 tracking-[0.2em] uppercase">Auditoría Local • Día {selectedDay}</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingUnit(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X className="w-8 h-8" /></button>
              </div>
              <div className="flex bg-slate-100 p-2 m-6 rounded-3xl border border-slate-200 gap-2 shrink-0">
                <button onClick={() => setActiveAuditType('CREW')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${activeAuditType === 'CREW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><Users className="w-4 h-4"/> Tripulación</button>
                <button onClick={() => setActiveAuditType('DRIVER')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${activeAuditType === 'DRIVER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><User className="w-4 h-4"/> Conductor</button>
              </div>
              <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-10 custom-scrollbar">
                  {viewingData ? (
                    <>
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable</p>
                          <p className="text-sm font-black text-slate-800 uppercase">{viewingData.header.responsable || 'NO REGISTRADO'}</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Observaciones</p>
                          <p className="text-[11px] font-bold text-slate-600 italic leading-relaxed">{viewingData.header.observaciones || 'SIN HALLAZGOS'}</p>
                        </div>
                      </section>
                      <section className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest border-b pb-2">Resultados Checklist</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(activeAuditType === 'CREW' ? INVENTORY_ITEMS : DRIVER_ITEMS).map(item => { 
                            const check = viewingData.checks.find(c => c.itemId === item.id && c.day === selectedDay); 
                            if (!check || check.status === 'none') return null; 
                            return (
                              <div key={item.id} className="p-5 rounded-[1.5rem] border border-slate-100 bg-white shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                                <div className="max-w-[70%]"><p className="text-[9px] font-black text-slate-700 uppercase leading-tight">{item.name}</p></div>
                                <span className={`px-3 py-1.5 rounded-xl text-[7px] font-black uppercase tracking-widest ${check.status === 'ok' ? 'bg-emerald-100 text-emerald-600' : (check.status === 'regular' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600')}`}>
                                  {check.status === 'ok' ? 'B' : (check.status === 'regular' ? 'R' : 'M')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                      <History className="w-16 h-16 mb-4 opacity-10" />
                      <p className="text-xs font-black uppercase tracking-widest">Sin registros locales para esta unidad</p>
                    </div>
                  )}
              </div>
              <div className="bg-slate-50 p-8 flex justify-end items-center border-t shrink-0">
                 <button onClick={() => setViewingUnit(null)} className="bg-[#1e293b] text-white px-10 py-5 rounded-[1.5rem] text-[10px] font-black uppercase shadow-xl hover:bg-black transition-all">Cerrar Auditoría</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminModule;
