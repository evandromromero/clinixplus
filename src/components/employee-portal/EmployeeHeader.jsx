import React from 'react';
import { LogOut, User } from 'lucide-react';

export default function EmployeeHeader({ employee, onLogout }) {
  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm py-4 mb-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-blue-700" />
          <span className="font-semibold text-blue-900">{employee?.name || 'Funcionário'}</span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-800"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </header>
  );
}
