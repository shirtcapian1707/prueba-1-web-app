
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, LogOut, Truck, Users, UserCog, Key, Clock, History, CheckCircle2, 
  AlertCircle, Eye, ClipboardCheck, Thermometer, Pill, X, Calendar, Tag, Droplets, 
  Info, ChevronLeft, ChevronRight, FileDown, Camera, Shield, Gauge, User, 
  FolderDown, FileSpreadsheet, Search, Download, Archive, RefreshCw, Activity,
  Sun, Moon
} from 'lucide-react';
import { User as UserType, InventoryState, TechnicalInfo } from './types';
import { INVENTORY_ITEMS, CATEGORIES, DRIVER_ITEMS } from './constants';
import { API_URL } from './config';
import * as XLSX from 'xlsx';

// 1. Preparación de las librerías oficiales
import ExcelJS from 'exceljs';
import saveAs from 'file-saver'; // Corregido: Importación por defecto para evitar SyntaxError
import { supabase } from './lib/supabase'; // Importante para traer los datos de la nube

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
  
  const [historial, setHistorial] = useState<string[]>([]);
  const [movilSeleccionado, setMovilSeleccionado] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isExportingOfficial, setIsExportingOfficial] = useState(false);

  // PEGA AQUÍ LA FUNCIÓN DE DESCARGA
  const descargarReporteOficial = async (datosMovil: any, tipoFormato: 'basico' | 'medicalizada' | 'temperatura') => {
    setIsExportingOfficial(true);
    try {
      const nombreArchivo = {
        basico: 'inventario_diario_basico.xlsx',
        medicalizada: 'inventario_diario_medicalizada.xlsx',
        temperatura: 'temperatura_y_humedad.xlsx'
      }[tipoFormato];

      const response = await fetch(`/templates/${nombreArchivo}`);
      if (!response.ok) throw new Error("Plantilla no encontrada");
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const nombreHoja = tipoFormato === 'basico' ? 'BASICA' : 
                         tipoFormato === 'medicalizada' ? 'MEDICALIZADA' : 'FORMATO';
      const worksheet = workbook.getWorksheet(nombreHoja);

      if (!worksheet) {
        throw new Error(`No se encontró la hoja ${nombreHoja} en la plantilla`);
      }

      const diaActual = selectedDay; // Usamos el día seleccionado en la UI para el reporte

      // Mapeo de celdas según especificación técnica
      if (tipoFormato === 'basico' || tipoFormato === 'medicalizada') {
        const header = datosMovil.header;
        worksheet.getCell('B5').value = header.responsable;
        worksheet.getCell('J6').value = header.placa;
        worksheet.getCell('V5').value = header.mes;
        worksheet.getCell('Z5').value = header.ano || header.anio; // Soporta ambos por si acaso
        
        // Llenado automático de insumos basado en el día actual
        const col = 3 + diaActual; 
        
        // Ejemplo de lógica para iterar ítems y marcar en el Excel
        // Nota: En una versión final, aquí se mapearía item.id a la fila exacta del Excel
        // Por ahora marcamos la fila 8 como ejemplo de la estructura solicitada
        const rowSample = worksheet.getRow(8);
        if (rowSample) {
           rowSample.getCell(col).value = 'X'; 
        }

        // Podríamos iterar sobre todos los checks del día
        datosMovil.checks.filter((c: any) => c.day === diaActual).forEach((check: any, index: number) => {
           // Si conociéramos las filas, aquí iría el mapeo
           // const row = worksheet.getRow(8 + index); 
           // row.getCell(col).value = check.status === 'ok' ? 'B' : check.status;
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `REPORTE_OFICIAL_${tipoFormato.toUpperCase()}_M${viewingUnit?.number}_DIA_${diaActual}.xlsx`);
      showNotification("Reporte oficial generado con éxito");
    } catch (error) {
      console.error("Error:", error);
      alert("Error al generar reporte. Asegúrate de haber subido los archivos correctos a public/templates/");
    } finally {
      setIsExportingOfficial(false);
    }
  };

  // Formatear fecha de última sincronización
  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Sin datos';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const checkStatus = (userId: string, day: number) => {
    const user = users.find(u => u.id === userId);
    const data = globalInventory[userId];
    if (!data) return { done: false, daily: false, tech: false, climate: false, hasPhoto: false, lastSync: '' };
    
    const isDriver = user?.username.startsWith('CONDMOVIL');
    const dailyDone = (data.checks || []).some(c => c.day === day && c.status !== 'none');
    const techDone = Object.keys(data.technicalData || {}).length > 0;
    const climate = data.climateData?.[day];
    const climateDone = !!(climate && (climate.tempAM || climate.tempPM || climate.humAM || climate.humPM));
    const hasPhoto = !!(data.liquidPhotos?.[day] && data.liquidPhotos[day].length > 0);
    
    const overallDone = isDriver ? dailyDone : (dailyDone && techDone && climateDone);
    return { 
      done: overallDone, 
      daily: dailyDone, 
      tech: techDone, 
      climate: climateDone, 
      hasPhoto,
      lastSync: formatLastSync(data.lastSaved)
    };
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
      
      // 1. Hoja de Inventario Consolidado
      const inventoryData: any[] = [];
      mobileUsers.forEach(user => {
        const inv = globalInventory[user.id];
        if (!inv) return;
        const items = user.username.startsWith('CONDMOVIL') ? DRIVER_ITEMS : INVENTORY_ITEMS;
        items.forEach(item => {
          const row: any = { 
            'Unidad': user.displayName, 
            'Responsable': inv.header.responsable || 'N/A',
            'Placa': inv.header.placa || 'N/A', 
            'Categoría': item.category, 
            'Insumo': item.name, 
            'Stock Req': item.requiredStock 
          };
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryData), "Inventario_VOM");

      // 2. Hoja de Control Ambiental (Temperatura y Humedad)
      const climateDataExport: any[] = [];
      mobileUsers.filter(u => !u.username.startsWith('CONDMOVIL')).forEach(user => {
        const inv = globalInventory[user.id];
        if (!inv || !inv.climateData) return;
        
        for (let d = 1; d <= 31; d++) {
          const c = inv.climateData[d];
          if (c) {
            climateDataExport.push({
              'Unidad': user.displayName,
              'Día': d,
              'Temp AM (°C)': c.tempAM || '-',
              'Hum AM (%)': c.humAM || '-',
              'Temp PM (°C)': c.tempPM || '-',
              'Hum PM (%)': c.humPM || '-'
            });
          }
        }
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(climateDataExport), "Control_Ambiental");

      const monthName = new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      XLSX.writeFile(wb, `REPORTE_CENTRAL_VOM_${monthName}_${new Date().getFullYear()}.xlsx`);
      showNotification("Reporte Centralizado Generado con Éxito");
    } catch (error) {
      showNotification("Error exportando reporte", "error");
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
          <div className="bg-white/10 p-2 rounded-xl border border-white/10 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-black text-sm uppercase leading-none tracking-tight">Consola Administrativa VOM</h1>
            <p className="text-[9px] font-bold opacity-60 uppercase mt-1 tracking-widest flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 animate-pulse text-emerald-400" /> Sincronizado con Supabase Cloud
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToExcel} 
            title="Generar Reporte Maestro" 
            className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-emerald-400/30 shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <FileSpreadsheet className="w-5 h-5" /> <span>Reporte Maestro</span>
          </button>
          <button onClick={onLogout} className="bg-red-500/20 p-2.5 rounded-xl hover:bg-red-500 transition-colors border border-red-500/20">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-8 px-4 space-y-8">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-50 p-4 rounded-3xl text-indigo-600 shadow-inner">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditoría en Tiempo Real</p>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Día Seleccionado: {selectedDay}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-100">
            <button onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))} className="p-4 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-indigo-600">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-3xl font-black px-8 text-indigo-600 min-w-[80px] text-center">{selectedDay}</span>
            <button onClick={() => setSelectedDay(Math.min(31, selectedDay + 1))} className="p-4 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-indigo-600">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        <nav className="flex bg-white rounded-full p-1.5 shadow-sm border border-slate-200 gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('fleet')} className={`flex-1 min-w-[150px] py-4 rounded-full font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'fleet' ? 'bg-[#1e293b] text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Truck className="w-4 h-4" /> Estado de Flota
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[150px] py-4 rounded-full font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-[#1e293b] text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Archive className="w-4 h-4" /> Historial Nube
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[150px] py-4 rounded-full font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'users' ? 'bg-[#1e293b] text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
            <UserCog className="w-4 h-4" /> Gestión Usuarios
          </button>
        </nav>

        {activeTab === 'fleet' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {units.map(unit => {
              const crewStatus = checkStatus(unit.crewId, selectedDay);
              const driverStatus = checkStatus(unit.driverId, selectedDay);
              return (
                <div key={unit.number} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl transition-all group relative">
                  <div className="p-6 bg-slate-50 flex justify-between items-center border-b">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#1e293b] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-lg">#{unit.number}</div>
                      <div>
                        <h3 className="font-black text-slate-800 uppercase text-xs leading-none">{unit.crewName}</h3>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Placa: {globalInventory[unit.crewId]?.header?.placa || '---'}</p>
                      </div>
                    </div>
                    <button onClick={() => { setViewingUnit(unit); setActiveAuditType('CREW'); }} className="bg-white p-3.5 rounded-2xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all text-indigo-600 border border-slate-100">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><Users className="w-3 h-3"/> Tripulación</div>
                        <div className="flex gap-2">
                          <div title="Checklist" className={`p-2.5 rounded-xl border transition-all ${crewStatus.daily ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-200'}`}><ClipboardCheck className="w-4 h-4" /></div>
                          <div title="Clima" className={`p-2.5 rounded-xl border transition-all ${crewStatus.climate ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-200'}`}><Thermometer className="w-4 h-4" /></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] font-black text-slate-300 uppercase">Sincro</p>
                        <p className="text-[9px] font-black text-indigo-600">{crewStatus.lastSync}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><Truck className="w-3 h-3"/> Conductor</div>
                        <div className="flex gap-2">
                          <div title="Inspección PESV" className={`p-2.5 rounded-xl border transition-all ${driverStatus.daily ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-200'}`}><Gauge className="w-4 h-4" /></div>
                          <div title="Evidencia Líquidos" className={`p-2.5 rounded-xl border transition-all ${driverStatus.hasPhoto ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-200'}`}><Camera className="w-4 h-4" /></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] font-black text-slate-300 uppercase">Sincro</p>
                        <p className="text-[9px] font-black text-blue-600">{driverStatus.lastSync}</p>
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
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10 border-b border-slate-100 pb-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Bóveda de Reportes</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" /> Historial de cierres mensuales en la nube
                  </p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-5 top-4 w-5 h-5 text-slate-300" />
                    <select 
                      className="w-full bg-slate-50 rounded-[1.5rem] p-4 pl-12 text-[11px] font-black uppercase text-slate-700 border border-slate-100 ring-indigo-100 focus:ring-4 focus:ring-indigo-100 outline-none appearance-none cursor-pointer"
                      value={movilSeleccionado}
                      onChange={(e) => {
                        setMovilSeleccionado(e.target.value);
                        cargarHistorial(e.target.value);
                      }}
                    >
                      <option value="">Filtrar por Móvil...</option>
                      {units.map(u => (
                        <option key={u.number} value={u.crewName}>{u.crewName}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => cargarHistorial(movilSeleccionado)}
                    disabled={!movilSeleccionado || isLoadingHistory}
                    className="bg-indigo-600 text-white p-4.5 rounded-[1.5rem] hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:grayscale"
                  >
                    <RefreshCw className={`w-6 h-6 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {historial.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {historial.map((archivo, index) => (
                    <div key={index} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all hover:scale-[1.02]">
                      <div className="flex items-center gap-5">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                           <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div className="max-w-[180px]">
                           <p className="text-[11px] font-black text-slate-800 uppercase truncate" title={archivo.split('/').pop()}>
                             {archivo.split('/').pop()}
                           </p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Cierre Mensual</p>
                        </div>
                      </div>
                      <a 
                        href={`${API_URL}/static/${archivo}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white p-4 rounded-2xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-md border border-slate-100 active:scale-90"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center flex flex-col items-center">
                  <div className="bg-slate-50 p-8 rounded-full mb-6">
                    <Archive className="w-16 h-16 text-slate-200" />
                  </div>
                  <p className="text-sm font-black text-slate-300 uppercase tracking-widest">
                    {movilSeleccionado ? "Aún no hay cierres mensuales para este móvil" : "Selecciona una unidad para explorar su archivo"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-500">
             <div className="overflow-x-auto">
               <table className="w-full text-[11px] border-collapse">
                 <thead className="bg-slate-50 text-slate-400 uppercase font-black">
                   <tr className="border-b">
                     <th className="p-8 text-left">Identidad</th>
                     <th className="p-8 text-left">Rol</th>
                     <th className="p-8 text-left">Acceso Directo</th>
                     <th className="p-8 text-right">Acciones</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {users.map(u => (
                     <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="p-8">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black">
                             {u.displayName.charAt(0)}
                           </div>
                           <div>
                             <p className="font-black text-slate-800 text-sm uppercase">{u.displayName}</p>
                             <p className="text-[10px] text-slate-400 font-bold">{u.username}</p>
                           </div>
                         </div>
                       </td>
                       <td className="p-8">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                           {u.role}
                         </span>
                       </td>
                       <td className="p-8">
                         <div className="flex items-center gap-3 font-mono text-black font-bold bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 w-fit">
                           <Key className="w-4 h-4 text-slate-300" />
                           <input 
                             type="text" 
                             className="bg-transparent border-none focus:ring-0 p-0 w-32 text-xs font-black tracking-widest" 
                             value={u.password} 
                             onChange={(e) => updateUserPassword(u.id, e.target.value)} 
                           />
                         </div>
                       </td>
                       <td className="p-8 text-right">
                         <button className="p-4 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-2xl hover:bg-white border border-transparent hover:border-slate-100 shadow-sm">
                           <UserCog className="w-5 h-5" />
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}
      </main>

      {viewingUnit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-lg" onClick={() => setViewingUnit(null)}></div>
           <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8">
              <div className="bg-[#1e293b] text-white p-10 flex items-center justify-between border-b border-white/5">
                 <div className="flex items-center gap-6">
                    <div className="bg-indigo-500 p-5 rounded-[2rem] shadow-2xl shadow-indigo-500/30"><Truck className="w-10 h-10" /></div>
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{viewingUnit.number}</h2>
                      <p className="text-[11px] font-bold opacity-50 tracking-[0.3em] uppercase mt-2">Expediente de Auditoría • Día {selectedDay}</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingUnit(null)} className="p-4 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X className="w-10 h-10" /></button>
              </div>

              {/* SECCIÓN DE REPORTES OFICIALES EXCELJS */}
              <div className="bg-slate-50 px-10 py-6 flex flex-wrap items-center gap-4 border-b border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-full">Descarga de Formatos Oficiales (Plantilla Excel)</p>
                <button 
                  disabled={!viewingData || isExportingOfficial}
                  onClick={() => descargarReporteOficial(viewingData, 'basico')}
                  className="bg-[#1e293b] text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" /> Formato Básico
                </button>
                <button 
                  disabled={!viewingData || isExportingOfficial}
                  onClick={() => descargarReporteOficial(viewingData, 'medicalizada')}
                  className="bg-[#1e293b] text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" /> Formato Medicalizada
                </button>
                <button 
                  disabled={!viewingData || isExportingOfficial}
                  onClick={() => descargarReporteOficial(viewingData, 'temperatura')}
                  className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase flex items-center gap-2 hover:emerald-700 transition-all disabled:opacity-50"
                >
                  <Thermometer className="w-4 h-4" /> Formato T° y H%
                </button>
              </div>

              <div className="flex bg-slate-100 p-2 m-8 rounded-[2rem] border border-slate-200 gap-2 shrink-0">
                <button onClick={() => setActiveAuditType('CREW')} className={`flex-1 py-5 rounded-[1.5rem] font-black text-[11px] uppercase flex items-center justify-center gap-3 transition-all ${activeAuditType === 'CREW' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}><Users className="w-5 h-5"/> Tripulación</button>
                <button onClick={() => setActiveAuditType('DRIVER')} className={`flex-1 py-5 rounded-[1.5rem] font-black text-[11px] uppercase flex items-center justify-center gap-3 transition-all ${activeAuditType === 'DRIVER' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}><User className="w-5 h-5"/> Conductor</button>
              </div>
              <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-12 custom-scrollbar">
                  {viewingData ? (
                    <>
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-inner">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsable en Turno</p>
                          <p className="text-lg font-black text-slate-800 uppercase leading-none">{viewingData.header.responsable || 'NO REGISTRADO'}</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observaciones de Campo</p>
                          <p className="text-[12px] font-bold text-slate-600 italic leading-relaxed">{viewingData.header.observaciones || 'SIN NOVEDADES REPORTADAS'}</p>
                        </div>
                      </section>
                      <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                           <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Desglose de Checklist Digital</h3>
                           <span className="bg-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-400 uppercase">Día {selectedDay}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {(activeAuditType === 'CREW' ? INVENTORY_ITEMS : DRIVER_ITEMS).map(item => { 
                            const check = viewingData.checks.find(c => c.itemId === item.id && c.day === selectedDay); 
                            if (!check || check.status === 'none') return null; 
                            return (
                              <div key={item.id} className="p-6 rounded-[2rem] border border-slate-100 bg-white shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all hover:shadow-lg">
                                <div className="max-w-[75%]">
                                  <p className="text-[10px] font-black text-slate-700 uppercase leading-tight group-hover:text-indigo-600 transition-colors">{item.name}</p>
                                  {check.currentStock && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Stock: {check.currentStock}</p>}
                                </div>
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner border ${check.status === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : (check.status === 'regular' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-red-50 border-red-100 text-red-600')}`}>
                                  {check.status === 'ok' ? 'B' : (check.status === 'regular' ? 'R' : 'M')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                      
                      {activeAuditType === 'DRIVER' && viewingData.liquidPhotos?.[selectedDay] && (
                        <section className="space-y-6">
                           <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                              <Camera className="w-5 h-5 text-blue-600" />
                              <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Evidencia Fotográfica de Niveles</h3>
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              {viewingData.liquidPhotos[selectedDay].map((photo, i) => (
                                <div key={i} className="aspect-square rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-100 group">
                                   <img src={photo} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                              ))}
                           </div>
                        </section>
                      )}

                      {activeAuditType === 'CREW' && viewingData.climateData?.[selectedDay] && (
                        <section className="space-y-6">
                           <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                              <Thermometer className="w-5 h-5 text-indigo-600" />
                              <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Cadena de Frío / Clima</h3>
                           </div>
                           <div className="grid grid-cols-2 gap-8">
                              <div className="bg-amber-50/50 p-8 rounded-[2.5rem] border border-amber-100 text-center">
                                 <Sun className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                                 <p className="text-[9px] font-black text-slate-400 uppercase mb-4">Jornada Mañana</p>
                                 <div className="flex justify-around">
                                    <div><p className="text-2xl font-black text-slate-800">{viewingData.climateData[selectedDay].tempAM || '--'}°</p><p className="text-[8px] font-black text-slate-400 uppercase">Temp</p></div>
                                    <div className="w-px h-10 bg-amber-200"></div>
                                    <div><p className="text-2xl font-black text-slate-800">{viewingData.climateData[selectedDay].humAM || '--'}%</p><p className="text-[8px] font-black text-slate-400 uppercase">Hum</p></div>
                                 </div>
                              </div>
                              <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 text-center">
                                 <Moon className="w-8 h-8 text-indigo-500 mx-auto mb-4" />
                                 <p className="text-[9px] font-black text-slate-400 uppercase mb-4">Jornada Tarde</p>
                                 <div className="flex justify-around">
                                    <div><p className="text-2xl font-black text-slate-800">{viewingData.climateData[selectedDay].tempPM || '--'}°</p><p className="text-[8px] font-black text-slate-400 uppercase">Temp</p></div>
                                    <div className="w-px h-10 bg-indigo-200"></div>
                                    <div><p className="text-2xl font-black text-slate-800">{viewingData.climateData[selectedDay].humPM || '--'}%</p><p className="text-[8px] font-black text-slate-400 uppercase">Hum</p></div>
                                 </div>
                              </div>
                           </div>
                        </section>
                      )}
                    </>
                  ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-slate-300">
                      <div className="bg-slate-50 p-10 rounded-full mb-6">
                        <Activity className="w-20 h-20 opacity-10" />
                      </div>
                      <p className="text-sm font-black uppercase tracking-[0.2em]">Sin registros sincronizados para hoy</p>
                    </div>
                  )}
              </div>
              <div className="bg-slate-50 p-10 flex justify-end items-center border-t border-slate-100 shrink-0">
                 <button onClick={() => setViewingUnit(null)} className="bg-[#1e293b] text-white px-12 py-5 rounded-[1.5rem] text-[11px] font-black uppercase shadow-2xl hover:bg-black transition-all active:scale-95">Cerrar Expediente</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminModule;
