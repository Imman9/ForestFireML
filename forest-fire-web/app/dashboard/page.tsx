'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserTable from '@/components/UserTable';
import SettingsForm from '@/components/SettingsForm';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic client-side protection
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
             <span className="text-gray-600">Welcome, {user.name}</span>
             <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:text-red-800 transition">Logout</button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto p-6 w-full">
         <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
               <button
                  onClick={() => setActiveTab('users')}
                  className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === 'users' 
                      ? 'border-orange-500 text-orange-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
               >
                  User Management
               </button>
               <button
                  onClick={() => setActiveTab('settings')}
                  className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === 'settings' 
                      ? 'border-orange-500 text-orange-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
               >
                  System Settings
               </button>
            </nav>
         </div>
         
         {activeTab === 'users' ? <UserTable /> : <SettingsForm />}
      </main>
    </div>
  );
}
