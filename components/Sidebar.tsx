'use client';

import React, { useState } from 'react';
import { ViewMode } from '@/lib/types';
import { 
  LayoutDashboard, 
  Package, 
  GitFork, 
  Warehouse, 
  ShoppingCart, 
  Tag, 
  ClipboardList, 
  X,
  Sparkles,
  Factory,
  Calculator
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  criticalStockCount: number;
  activeOpCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenMigration?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  criticalStockCount,
  activeOpCount,
  isOpenMobile,
  onCloseMobile,
  onOpenMigration,
}) => {
  const [imgError, setImgError] = useState(false);

  const menuItems: { id: ViewMode; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'produtos', label: 'Produtos', icon: <Package className="w-5 h-5" /> },
    { id: 'bom', label: 'Estrutura (BOM)', icon: <GitFork className="w-5 h-5" /> },
    { id: 'processos', label: 'Processos Produtivos', icon: <Factory className="w-5 h-5" /> },
    { 
      id: 'estoque', 
      label: 'Controle de Estoque', 
      icon: <Warehouse className="w-5 h-5" />, 
      badge: criticalStockCount > 0 ? criticalStockCount : undefined,
      badgeColor: 'bg-red-500 text-white' 
    },
    { id: 'compras', label: 'Compras', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'vendas', label: 'Vendas', icon: <Tag className="w-5 h-5" /> },
    { id: 'custos-industriais', label: 'Custos Industriais', icon: <Calculator className="w-5 h-5" /> },
    { 
      id: 'ordens-producao', 
      label: 'Ordens de Produção', 
      icon: <ClipboardList className="w-5 h-5" />,
      badge: activeOpCount > 0 ? activeOpCount : undefined,
      badgeColor: 'bg-amber-400 text-stone-900 font-bold'
    },
  ];

  const handleItemClick = (id: ViewMode) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile} 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden animate-fadeIn"
        />
      )}

      <aside 
        id="macarvalho-sidebar" 
        className={`fixed left-0 top-0 h-full w-72 bg-[#954a00] text-white z-50 flex flex-col shadow-2xl select-none transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/15 bg-black/10">
          <div className="flex items-center gap-3">
            {/* Logo from user attachment */}
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-1 shadow-md border border-amber-200/50 shrink-0 overflow-hidden">
              {!imgError ? (
                <img 
                  src="/logo.png" 
                  alt="MaCarvalho Cosméticos Artesanais" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 text-[#954a00]">
                  <span className="font-serif font-bold text-sm leading-none">MC</span>
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                MaCarvalho
              </span>
              <span className="text-[10px] font-semibold text-amber-200/90 tracking-wider uppercase">
                Cosméticos Artesanais
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button 
            id="btn-close-sidebar-mobile"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1.5 text-sm font-medium">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-left ${
                  isActive
                    ? 'bg-[#f47d00] text-white font-semibold shadow-md shadow-orange-950/30'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? 'text-white' : 'text-white/75'}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${item.badgeColor || 'bg-white/20'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Subtle Brand Footer */}
        <div className="p-3.5 bg-black/20 border-t border-white/10 text-xs text-amber-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-medium text-[11px] tracking-wide">Produção & Gestão Artesanal</span>
          </div>
          <span className="text-[10px] text-white/60">MaCarvalho</span>
        </div>
      </aside>
    </>
  );
};
