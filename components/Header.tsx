'use client';

import React from 'react';
import { ViewMode } from '@/lib/types';
import { Search, Bell, User, Home, ChevronRight, Menu } from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  globalSearch: string;
  onSearchChange: (value: string) => void;
  notificationCount: number;
  onToggleMobileSidebar: () => void;
  onOpenMigration?: () => void;
}

const VIEW_TITLES: Record<ViewMode, string> = {
  dashboard: 'Dashboard',
  produtos: 'Produtos',
  bom: 'Estrutura (BOM)',
  estoque: 'Controle de Estoque',
  compras: 'Compras',
  vendas: 'Vendas',
  'ordens-producao': 'Ordens de Produção',
  'custos-industriais': 'Custos Industriais',
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  globalSearch,
  onSearchChange,
  notificationCount,
  onToggleMobileSidebar,
  onOpenMigration,
}) => {
  return (
    <>
      <header 
        id="macarvalho-header"
        className="fixed top-0 left-0 md:left-72 right-0 h-16 bg-white/95 backdrop-blur-xl border-b border-[#dec1af]/40 z-40 flex items-center justify-between px-4 md:px-6 transition-all shadow-2xs"
      >
        {/* Left: Mobile Hamburger & Search */}
        <div className="flex items-center gap-3">
          <button
            id="btn-hamburger-menu"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-stone-100 text-[#574335]"
            title="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-[#574335]/60 pointer-events-none" />
            <input
              id="global-search-input"
              type="text"
              value={globalSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar produtos, insumos, lotes..."
              className="pl-10 pr-4 py-2 bg-[#f4f3f1] border border-[#dec1af]/60 rounded-xl w-52 sm:w-72 md:w-80 lg:w-96 text-xs sm:text-sm text-[#1a1c1b] placeholder:text-[#574335]/50 focus:outline-none focus:ring-2 focus:ring-[#954a00]/30 focus:border-[#954a00] transition-all"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Notifications */}
          <button 
            id="btn-header-notifications"
            className="relative p-2 rounded-full hover:bg-[#e9e8e6] text-[#574335] transition-colors"
            title={`${notificationCount} notificações`}
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-600 rounded-full animate-ping"></span>
            )}
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-600 rounded-full"></span>
            )}
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3 pl-2 sm:pl-4 border-l border-[#dec1af]/50">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-[#1a1c1b]">Gestão Artesanal</div>
              <div className="text-[11px] text-[#574335]">MaCarvalho</div>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#954a00] text-white flex items-center justify-center shadow-xs">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb Bar */}
      <div className="px-4 md:px-6 py-2 flex items-center gap-2 text-xs text-[#574335] mb-2">
        <Home className="w-3.5 h-3.5 text-[#574335]/70" />
        <ChevronRight className="w-3 h-3 text-[#574335]/50" />
        <span className="hover:text-[#954a00] font-medium">MaCarvalho</span>
        <ChevronRight className="w-3 h-3 text-[#574335]/50" />
        <span className="text-[#1a1c1b] font-bold">{VIEW_TITLES[currentView] || currentView}</span>
      </div>
    </>
  );
};
