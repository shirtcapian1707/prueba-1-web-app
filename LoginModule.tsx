import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { User as UserType } from './types';

interface LoginModuleProps {
  users: UserType[];
  onLogin: (user: UserType) => void;
}

const LoginModule: React.FC<LoginModuleProps> = ({ users, onLogin }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username.toLowerCase() === form.username.toLowerCase() && u.password === form.password);
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen bg-[#2b3a8c] flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Truck className="w-10 h-10 text-[#2b3a8c]" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">VOM SAS</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">Inventario Digital Ambulancia</p>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <input 
            className="w-full bg-slate-50 rounded-2xl p-5 text-sm font-bold text-black outline-none border-none focus:ring-2 focus:ring-blue-100" 
            placeholder="Usuario" 
            value={form.username} 
            onChange={e => setForm({...form, username: e.target.value})} 
          />
          <input 
            type="password" 
            className="w-full bg-slate-50 rounded-2xl p-5 text-sm font-bold text-black outline-none border-none focus:ring-2 focus:ring-blue-100" 
            placeholder="Contraseña" 
            value={form.password} 
            onChange={e => setForm({...form, password: e.target.value})} 
          />
          {error && <p className="text-red-500 text-[11px] font-black uppercase text-center mt-2">{error}</p>}
          <button type="submit" className="w-full bg-[#2b3a8c] text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl mt-6 hover:bg-blue-800 transition-all">
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModule;