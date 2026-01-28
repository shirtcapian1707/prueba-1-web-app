
import React, { useState, useEffect } from 'react';
import { INITIAL_USERS } from './constants';
import { 
  InventoryState, InventoryHeader, User as UserType, SupplyRequest 
} from './types';
import { API_URL } from './config';
import { supabase } from './lib/supabase'; // 1. Importación de Supabase
import LoginModule from './LoginModule';
import AdminModule from './AdminModule';
import WarehouseModule from './WarehouseModule';
import MobileModule from './MobileModule';
import DriverModule from './DriverModule';

const GLOBAL_DATA_KEY = 'vom_global_inventory';
const USERS_STORAGE_KEY = 'vom_users_list';

const getCurrentMonth = () => new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase();
const getCurrentYear = () => new Date().getFullYear().toString();

const INITIAL_HEADER: InventoryHeader = {
  responsable: '', sdsCode: '', placa: '', mes: getCurrentMonth(),
  ano: getCurrentYear(), codigoInterno: '', observaciones: ''
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [users, setUsers] = useState<UserType[]>(() => {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [globalInventory, setGlobalInventory] = useState<Record<string, InventoryState>>({});
  const [globalRequests, setGlobalRequests] = useState<SupplyRequest[]>([]);

  // 3. Activar el Tiempo Real (La Magia)
  useEffect(() => {
    // 1. Cargar los datos que ya están guardados al abrir la app
    const cargarDatos = async () => {
      try {
        const { data, error } = await supabase.from('inventarios_ambulancias').select('*');
        if (error) throw error;
        if (data) {
          // Convertimos el formato de la base de datos al formato de tu App
          const inventarioActualizado = data.reduce((acc, item) => ({
            ...acc, 
            [item.id]: item.datos
          }), {});
          setGlobalInventory(inventarioActualizado);
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    };

    cargarDatos();

    // 2. Escuchar la base de datos. Si algo cambia, la app se actualiza sola.
    const canal = supabase
      .channel('cambios-reales')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'inventarios_ambulancias' }, 
          () => { cargarDatos(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // 2. Cambiar la forma en que se guardan los datos (Guardado en la Nube)
  const guardarInventarioEnNube = async (idAmbulancia: string, datos: any) => {
    try {
      const { error } = await supabase
        .from('inventarios_ambulancias')
        .upsert({ 
          id: idAmbulancia, 
          datos: datos, 
          ultima_actualizacion: new Date() 
        });

      if (error) throw error;
      console.log("Datos sincronizados con éxito en la nube");
    } catch (error) {
      console.error("Error al sincronizar:", error);
      showNotification("Error al sincronizar con la nube", "error");
    }
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setSaveMessage({ text, type });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleUpdateGlobalInventory = async (userId: string, state: InventoryState) => {
    const newState = { ...state, lastSaved: new Date().toISOString() };
    
    // Actualización local para UI instantánea
    setGlobalInventory(prev => ({ ...prev, [userId]: newState }));
    
    // Sincronización en la nube (Supabase)
    await guardarInventarioEnNube(userId, newState);
    
    showNotification("Inventario sincronizado");
  };

  if (!currentUser) {
    return <LoginModule users={users} onLogin={setCurrentUser} />;
  }

  const isDriver = currentUser.username.startsWith('CONDMOVIL');

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {currentUser.role === 'ADMIN' && (
        <AdminModule 
          users={users} 
          setUsers={setUsers} 
          globalInventory={globalInventory} 
          onLogout={handleLogout} 
          showNotification={showNotification}
        />
      )}

      {currentUser.role === 'ALMACEN' && (
        <WarehouseModule 
          globalRequests={globalRequests} 
          setGlobalRequests={setGlobalRequests} 
          onLogout={handleLogout} 
          showNotification={showNotification}
        />
      )}

      {currentUser.role === 'MOBILE' && isDriver && (
        <DriverModule 
          currentUser={currentUser} 
          initialState={globalInventory[currentUser.id] || { header: { ...INITIAL_HEADER, placa: currentUser.username.replace('CONDMOVIL-', 'ABC-') }, checks: [], technicalData: {}, climateData: {} }}
          onSave={(state) => handleUpdateGlobalInventory(currentUser.id, state)}
          onLogout={handleLogout}
          showNotification={showNotification}
        />
      )}

      {currentUser.role === 'MOBILE' && !isDriver && (
        <MobileModule 
          currentUser={currentUser} 
          initialState={globalInventory[currentUser.id] || { header: { ...INITIAL_HEADER, placa: currentUser.username.replace('Movil-', 'ABC-') }, checks: [], technicalData: {}, climateData: {} }}
          onSave={(state) => handleUpdateGlobalInventory(currentUser.id, state)}
          onLogout={handleLogout}
          showNotification={showNotification}
        />
      )}

      {saveMessage && (
        <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 ${saveMessage.type === 'error' ? 'bg-red-600' : 'bg-[#2b3a8c]'} text-white px-10 py-4 rounded-full shadow-2xl font-black text-[11px] uppercase tracking-widest z-[200] animate-bounce text-center`}>
          {saveMessage.text}
        </div>
      )}
    </div>
  );
};

export default App;
