
import React, { useState, useEffect } from 'react';
import { INITIAL_USERS } from './constants';
import { 
  InventoryState, InventoryHeader, User as UserType, SupplyRequest 
} from './types';
import { API_URL } from './config';
import LoginModule from './LoginModule';
import AdminModule from './AdminModule';
import WarehouseModule from './WarehouseModule';
import MobileModule from './MobileModule';
import DriverModule from './DriverModule';

const GLOBAL_DATA_KEY = 'vom_global_inventory';
const GLOBAL_REQUESTS_KEY = 'vom_global_requests';
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

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const [globalInventory, setGlobalInventory] = useState<Record<string, InventoryState>>(() => {
    const saved = localStorage.getItem(GLOBAL_DATA_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const [globalRequests, setGlobalRequests] = useState<SupplyRequest[]>(() => {
    const saved = localStorage.getItem(GLOBAL_REQUESTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(GLOBAL_DATA_KEY, JSON.stringify(globalInventory));
  }, [globalInventory]);

  useEffect(() => {
    localStorage.setItem(GLOBAL_REQUESTS_KEY, JSON.stringify(globalRequests));
  }, [globalRequests]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setSaveMessage({ text, type });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleUpdateGlobalInventory = async (userId: string, state: InventoryState) => {
    const newState = { ...state, lastSaved: new Date().toISOString() };
    const updatedGlobal = { ...globalInventory, [userId]: newState };
    setGlobalInventory(updatedGlobal);
    
    // --- SINCRONIZACIÓN CON SERVIDOR FASTAPI ---
    try {
      const response = await fetch(`${API_URL}/api/sync-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          timestamp: newState.lastSaved,
          data: newState
        })
      });

      if (response.ok) {
        showNotification("Datos guardados y sincronizados con éxito");
      } else {
        showNotification("Guardado local OK, pero error en servidor central", "error");
      }
    } catch (error) {
      console.error("Sync error:", error);
      showNotification("Guardado local OK (Servidor Offline)", "error");
    }
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
