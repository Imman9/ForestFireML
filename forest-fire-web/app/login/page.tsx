'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.user.role !== 'admin') {
        setError('Access denied: Admins only');
        return;
      }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
       <form onSubmit={handleLogin} className="p-8 bg-white rounded-lg shadow-xl w-96 space-y-6">
         <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800">Admin Panel</h1>
            <p className="text-slate-500">Forest Fire Config</p>
         </div>
         
         {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded text-sm mb-4">
                {error}
            </div>
         )}
         
         <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 outline-none transition"
              placeholder="admin@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
         </div>
         
         <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 outline-none transition"
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
         </div>
         
         <button className="w-full bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 transition duration-200">
            Login
         </button>
       </form>
    </div>
  );
}
