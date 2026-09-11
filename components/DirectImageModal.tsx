'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import { 
  X, 
  Image as ImageIcon, 
  Check, 
  Link2
} from 'lucide-react';

interface DirectImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct?: Product | null;
  onUpdateProductImage?: (productId: string, newImageUrl: string) => void;
}

export const DirectImageModal: React.FC<DirectImageModalProps> = ({
  isOpen,
  onClose,
  selectedProduct,
  onUpdateProductImage,
}) => {
  const [testUrl, setTestUrl] = useState(
    selectedProduct?.imageUrl || ''
  );
  const [applySuccess, setApplySuccess] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const handleApplyToProduct = () => {
    if (selectedProduct && onUpdateProductImage && testUrl) {
      onUpdateProductImage(selectedProduct.id, testUrl);
      setApplySuccess(true);
      setTimeout(() => {
        setApplySuccess(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        id="product-photo-modal"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-5 bg-[#954a00] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ImageIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">
                Foto do Cosmético
              </h2>
              <p className="text-xs text-amber-100/80">
                {selectedProduct ? `${selectedProduct.code} - ${selectedProduct.name}` : 'Cadastrar ou alterar imagem'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs text-[#1a1c1b]">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#574335] mb-1.5">
              URL da Imagem
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-[#574335]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={testUrl}
                onChange={(e) => {
                  setTestUrl(e.target.value);
                  setImageError(false);
                }}
                placeholder="https://exemplo.com/foto-sabonete.png"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#dec1af] rounded-xl text-xs font-mono text-[#1a1c1b] focus:outline-none focus:ring-2 focus:ring-[#954a00]"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="flex flex-col items-center justify-center p-4 bg-[#faf9f7] rounded-xl border border-[#dec1af]/60 min-h-[180px] text-center">
            {testUrl ? (
              <div className="relative max-h-48 overflow-hidden rounded-lg border border-[#dec1af]/40">
                <img
                  src={testUrl}
                  alt="Prévia"
                  className="max-h-48 max-w-full object-contain rounded"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
                {imageError && (
                  <div className="p-3 text-red-700 bg-red-50 text-xs text-center rounded">
                    Não foi possível carregar a imagem deste link.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-[#574335]">
                <ImageIcon className="w-10 h-10 text-[#dec1af] mx-auto mb-2" />
                <span>Insira uma URL acima para visualizar a prévia</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#dec1af]/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 text-[#574335] font-bold rounded-xl"
            >
              Cancelar
            </button>
            {selectedProduct && onUpdateProductImage && (
              <button
                onClick={handleApplyToProduct}
                disabled={!testUrl || imageError}
                className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                {applySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Salvo!</span>
                  </>
                ) : (
                  <span>Vincular ao Produto</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
