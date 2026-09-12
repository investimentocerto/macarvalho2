'use client';

import React, { useState, useMemo } from 'react';
import { Product } from '@/lib/types';
import { 
  Plus, 
  Download, 
  Search, 
  History, 
  GitFork, 
  Package, 
  Image as ImageIcon, 
  ExternalLink, 
  X,
  Pencil,
  Check 
} from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  selectedProduct?: Product | null;
  onSelectProduct: (product: Product) => void;
  onNavigateToBOM: (product?: Product) => void;
  onOpenImageModal: (product: Product) => void;
  onAddProduct: (newProd: Product) => void;
  onUpdateProduct: (updated: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onNavigateToBOM,
  onOpenImageModal,
  onAddProduct,
  onUpdateProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);

  // New product form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Shampoo em Barra');
  const [newStock, setNewStock] = useState('50');
  const [newMinStock, setNewMinStock] = useState('10');
  const [newPrice, setNewPrice] = useState('28.00');
  const [newUnit, setNewUnit] = useState('Barra (UN)');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // Edit product form state
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Shampoo em Barra');
  const [editStock, setEditStock] = useState('0');
  const [editMinStock, setEditMinStock] = useState('0');
  const [editPrice, setEditPrice] = useState('0.00');
  const [editUnit, setEditUnit] = useState('UN');
  const [editStatus, setEditStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditCode(prod.code);
    setEditName(prod.name);
    setEditCategory(prod.category);
    setEditStock(prod.stock.toString());
    setEditMinStock(prod.minStock.toString());
    setEditPrice(prod.price.toString());
    setEditUnit(prod.unit || 'UN');
    setEditStatus(prod.status || 'Ativo');
    setEditDescription(prod.description || '');
    setEditImageUrl(prod.imageUrl || '');
    setIsEditProductModalOpen(true);
  };

  const handleUpdateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim() || !editCode.trim()) return;

    const updated: Product = {
      ...editingProduct,
      code: editCode.trim().toUpperCase(),
      name: editName.trim(),
      category: editCategory,
      stock: Number(editStock) || 0,
      minStock: Number(editMinStock) || 0,
      price: Number(editPrice) || 0,
      unit: editUnit,
      status: editStatus,
      description: editDescription.trim(),
      imageUrl: editImageUrl.trim() || undefined,
    };

    onUpdateProduct(updated);
    if (selectedProduct && selectedProduct.id === updated.id) {
      onSelectProduct(updated);
    }
    setIsEditProductModalOpen(false);
    setEditingProduct(null);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter ? p.category.toLowerCase() === categoryFilter.toLowerCase() : true;
      const matchesStatus = statusFilter ? p.status.toLowerCase() === statusFilter.toLowerCase() : true;
      const matchesLowStock = lowStockOnly ? p.stock <= p.minStock : true;

      return matchesSearch && matchesCategory && matchesStatus && matchesLowStock;
    });
  }, [products, searchQuery, categoryFilter, statusFilter, lowStockOnly]);

  const handleExportCSV = () => {
    const headers = 'Código,Nome,Categoria,Estoque,EstoqueMinimo,Preco,Status\n';
    const rows = filteredProducts
      .map(p => `"${p.code}","${p.name}","${p.category}",${p.stock},${p.minStock},${p.price},"${p.status}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `produtos_macarvalho_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    const prod: Product = {
      id: `prod-${Date.now()}`,
      code: newCode.toUpperCase(),
      name: newName,
      category: newCategory,
      stock: Number(newStock) || 0,
      minStock: Number(newMinStock) || 0,
      price: Number(newPrice) || 0,
      unit: newUnit,
      status: 'Ativo',
      description: newDescription || 'Cosmético artesanal MaCarvalho.',
      createdAt: new Date().toLocaleDateString('pt-BR'),
      bomCost: Number(newPrice) * 0.35,
      laborCost: Number(newPrice) * 0.15,
      imageUrl: newImageUrl,
    };

    onAddProduct(prod);
    setIsNewProductModalOpen(false);
    onSelectProduct(prod);

    // Reset
    setNewCode('');
    setNewName('');
    setNewDescription('');
    setNewImageUrl('');
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1c1b]">Catálogo de Produtos</h1>
          <p className="text-xs sm:text-sm text-[#574335] mt-0.5">Gestão de cosméticos artesanais, estoque e custos de formulação.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btn-export-products"
            onClick={handleExportCSV}
            className="bg-[#e9e8e6] hover:bg-[#dec1af] text-[#1a1c1b] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            id="btn-new-product"
            onClick={() => setIsNewProductModalOpen(true)}
            className="bg-[#954a00] hover:bg-[#713700] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[580px]">
        {/* Left Panel: Product List & Filters */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 overflow-hidden">
          {/* Filters Bar */}
          <div className="p-3.5 bg-[#f4f3f1] flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-[#dec1af]/30">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#574335]/60" />
                <input
                  id="product-filter-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por código ou nome..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white text-xs text-[#1a1c1b] rounded-lg border border-[#dec1af]/60 focus:outline-none focus:ring-1 focus:ring-[#954a00]"
                />
              </div>

              <select
                id="product-filter-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white text-xs text-[#1a1c1b] py-1.5 px-3 rounded-lg border border-[#dec1af]/60 focus:outline-none focus:ring-1 focus:ring-[#954a00] cursor-pointer"
              >
                <option value="">Categoria: Todas</option>
                <option value="Shampoo em Barra">Shampoo em Barra</option>
                <option value="Condicionador em Barra">Condicionador em Barra</option>
                <option value="Cremes">Cremes</option>
                <option value="Aromatizadores & Velas">Aromatizadores & Velas</option>
              </select>

              <select
                id="product-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white text-xs text-[#1a1c1b] py-1.5 px-3 rounded-lg border border-[#dec1af]/60 focus:outline-none focus:ring-1 focus:ring-[#954a00] cursor-pointer"
              >
                <option value="">Status: Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>

            {/* Low Stock Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-8 h-4.5 rounded-full transition-colors relative ${lowStockOnly ? 'bg-[#954a00]' : 'bg-[#dec1af]'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${lowStockOnly ? 'left-4' : 'left-0.5'}`}></div>
              </div>
              <span className="text-xs font-semibold text-[#574335]">Estoque Baixo</span>
            </label>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center text-[#574335]">
                <Package className="w-12 h-12 text-[#dec1af] mb-2" />
                <h3 className="font-bold text-base text-[#1a1c1b]">Nenhum produto cadastrado ainda</h3>
                <p className="text-xs text-[#574335] max-w-sm mt-1 mb-4 leading-relaxed">
                  Comece agora criando seu primeiro produto artesanal (sabonetes, hidratantes, séruns, etc).
                </p>
                <button
                  onClick={() => setIsNewProductModalOpen(true)}
                  className="px-4 py-2 bg-[#954a00] hover:bg-[#713700] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeiro Cosmético
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#efeeec] sticky top-0 z-10 text-[#574335] uppercase tracking-wider font-semibold border-b border-[#dec1af]/40">
                  <tr>
                    <th className="py-2.5 px-4 w-24">Código</th>
                    <th className="py-2.5 px-4">Nome do Produto</th>
                    <th className="py-2.5 px-4 w-32">Categoria</th>
                    <th className="py-2.5 px-4 w-20 text-right">Estoque</th>
                    <th className="py-2.5 px-4 w-20 text-right">Mínimo</th>
                    <th className="py-2.5 px-4 w-28 text-right">Preço</th>
                    <th className="py-2.5 px-4 w-20 text-center">Status</th>
                    <th className="py-2.5 px-2 w-14 text-center">Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e8e6]">
                  {filteredProducts.map((p) => {
                    const isSelected = selectedProduct && selectedProduct.id === p.id;
                    const isCritical = p.stock <= p.minStock && p.status === 'Ativo';

                    return (
                      <tr
                        key={p.id}
                        id={`product-row-${p.code}`}
                        onClick={() => onSelectProduct(p)}
                        onDoubleClick={() => handleOpenEditProduct(p)}
                        className={`h-11 cursor-pointer transition-colors group ${
                          isSelected
                            ? 'bg-[#ffdcc6] hover:bg-[#ffb785]/80 text-[#301400]'
                            : p.status === 'Inativo'
                            ? 'bg-stone-50/70 hover:bg-stone-100 text-stone-400 opacity-75'
                            : 'hover:bg-[#f4f3f1] text-[#1a1c1b]'
                        }`}
                        title="Clique para selecionar ou duplo clique para editar"
                      >
                        <td className="px-4 font-bold">{p.code}</td>
                        <td className="px-4 font-medium truncate max-w-[200px]">
                          <div className="flex items-center gap-2">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-5 h-5 rounded object-cover border border-[#dec1af]/50 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded bg-amber-100 text-[#954a00] flex items-center justify-center shrink-0 text-[9px] font-bold">
                                MC
                              </div>
                            )}
                            <span className={p.status === 'Inativo' ? 'line-through' : ''}>
                              {p.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 text-[#574335]">{p.category}</td>
                        <td className={`px-4 text-right font-bold ${isCritical ? 'text-red-600' : ''}`}>
                          {p.stock}
                        </td>
                        <td className="px-4 text-right text-[#574335]">{p.minStock}</td>
                        <td className="px-4 text-right font-medium">
                          R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'Ativo' 
                              ? 'bg-[#9df897] text-[#002204]' 
                              : 'bg-stone-200 text-stone-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="p-1.5 text-[#574335] hover:text-[#954a00] hover:bg-white/80 rounded-lg transition-colors"
                            title="Editar produto"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer */}
          <div className="p-3 bg-[#f4f3f1] border-t border-[#dec1af]/40 flex items-center justify-between text-xs text-[#574335]">
            <span>Mostrando {filteredProducts.length} de {products.length} produtos</span>
            <span className="font-semibold text-[#1a1c1b]">MaCarvalho Cosméticos</span>
          </div>
        </div>

        {/* Right Panel: Product Details & Auto Pricing Engine */}
        <div 
          id="product-details-panel"
          className="w-full lg:w-[460px] xl:w-[480px] bg-white rounded-2xl shadow-md border border-[#dec1af]/40 overflow-hidden flex flex-col justify-between relative"
        >
          {selectedProduct ? (
            <>
              <div className="p-5 flex flex-col gap-5 flex-1 overflow-y-auto">
                {/* Detail Header */}
                <div className="flex justify-between items-start border-b border-[#dec1af]/30 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#954a00] uppercase tracking-wider">
                        {selectedProduct.code}
                      </span>
                      <span className="px-2 py-0.5 bg-[#9df897] text-[#002204] rounded-full text-[10px] font-bold">
                        {selectedProduct.status}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-[#1a1c1b] leading-snug">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-xs text-[#574335] mt-0.5">
                      Categoria: {selectedProduct.category} • Cadastrado em {selectedProduct.createdAt}
                    </p>
                  </div>

                  <button
                    id="btn-edit-product-image"
                    onClick={() => onOpenImageModal(selectedProduct)}
                    className="p-2 text-[#574335] hover:text-[#954a00] hover:bg-[#f4f3f1] rounded-xl transition-colors border border-[#dec1af]/40"
                    title="Adicionar imagem direta"
                  >
                    <ImageIcon className="w-5 h-5 text-[#f47d00]" />
                  </button>
                </div>

                {/* Direct Image Display */}
                {selectedProduct.imageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-[#dec1af]/50 bg-stone-50 group">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-36 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => onOpenImageModal(selectedProduct)}
                        className="px-3 py-1.5 bg-white text-[#954a00] text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Alterar Imagem
                      </button>
                    </div>
                  </div>
                )}

                {/* Basic Info Form */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[#574335]">Código</label>
                    <input
                      type="text"
                      value={selectedProduct.code}
                      readOnly
                      className="px-3 py-2 bg-[#f4f3f1] rounded-lg border border-[#dec1af]/40 text-[#1a1c1b] font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[#574335]">Unidade</label>
                    <input
                      type="text"
                      value={selectedProduct.unit}
                      readOnly
                      className="px-3 py-2 bg-[#f4f3f1] rounded-lg border border-[#dec1af]/40 text-[#1a1c1b] font-medium"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="font-semibold text-[#574335]">Descrição</label>
                    <textarea
                      rows={2}
                      value={selectedProduct.description}
                      readOnly
                      className="px-3 py-2 bg-[#f4f3f1] rounded-lg border border-[#dec1af]/40 text-[#1a1c1b] text-xs resize-none"
                    />
                  </div>
                </div>

                {/* Stock Level Card */}
                <div className="bg-[#faf9f7] rounded-xl p-3.5 flex items-center justify-between border border-[#dec1af]/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f47d00]/15 flex items-center justify-center text-[#954a00]">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#574335]">Estoque Atual</div>
                      <div className="text-xl font-bold text-[#1a1c1b]">
                        {selectedProduct.stock} <span className="text-xs font-normal text-[#574335]">{selectedProduct.unit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-[#574335]">Estoque Mínimo</div>
                    <div className="text-sm font-bold text-[#574335]">{selectedProduct.minStock} {selectedProduct.unit}</div>
                  </div>
                </div>

              </div>

              {/* Action Footer */}
              <div className="p-4 bg-[#efeeec] border-t border-[#dec1af]/40 flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEditProduct(selectedProduct)}
                    className="flex-1 bg-white hover:bg-stone-50 border border-[#dec1af] text-[#954a00] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    title="Editar informações cadastrais do produto"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar Produto
                  </button>
                  <button
                    id="btn-product-movements"
                    onClick={() => setIsMovementsModalOpen(true)}
                    className="flex-1 bg-white hover:bg-stone-50 border border-[#dec1af] text-[#1a1c1b] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <History className="w-3.5 h-3.5 text-[#574335]" />
                    Movimentações
                  </button>
                </div>
                <button
                  id="btn-product-view-bom"
                  onClick={() => onNavigateToBOM(selectedProduct)}
                  className="w-full bg-[#954a00] hover:bg-[#713700] text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <GitFork className="w-4 h-4" />
                  Ver Estrutura (BOM) & Roteiro
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#574335]">
              <div className="w-14 h-14 rounded-2xl bg-[#f4f3f1] border border-[#dec1af]/40 flex items-center justify-center text-[#954a00] mb-3">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-[#1a1c1b]">Nenhum Cosmético Selecionado</h3>
              <p className="text-xs text-[#574335] max-w-xs mt-1 mb-5 leading-relaxed">
                Cadastre um novo produto artesanal para gerenciar custos, fórmulas e preços de venda.
              </p>
              <button
                onClick={() => setIsNewProductModalOpen(true)}
                className="px-4 py-2.5 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Novo Produto
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Novo Produto */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Package className="w-5 h-5" /> Cadastrar Novo Produto - MaCarvalho
              </h3>
              <button
                onClick={() => setIsNewProductModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Código do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SAB-001"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg focus:ring-1 focus:ring-[#954a00]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Categoria *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg focus:ring-1 focus:ring-[#954a00] bg-white"
                  >
                    <option value="Shampoo em Barra">Shampoo em Barra</option>
                    <option value="Condicionador em Barra">Condicionador em Barra</option>
                    <option value="Cremes">Cremes</option>
                    <option value="Aromatizadores & Velas">Aromatizadores & Velas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Nome do Cosmético *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sabonete de Argila Branca & Mel 120g"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg focus:ring-1 focus:ring-[#954a00]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Preço Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Unidade</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="Ex: Barra (120g), Frasco 60ml"
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Descrição & Propriedades</label>
                <textarea
                  rows={2}
                  placeholder="Ingredientes ativos, aroma, propriedades fitoterápicas..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dec1af]/40">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="px-4 py-2 border border-[#dec1af] text-[#574335] font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movements Modal */}
      {isMovementsModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#dec1af] p-5">
            <div className="flex items-center justify-between border-b border-[#dec1af]/30 pb-3 mb-4">
              <h3 className="font-bold text-sm text-[#1a1c1b] flex items-center gap-2">
                <History className="w-4 h-4 text-[#954a00]" />
                Movimentações de {selectedProduct.code}
              </h3>
              <button onClick={() => setIsMovementsModalOpen(false)}>
                <X className="w-4 h-4 text-[#574335]" />
              </button>
            </div>
            <div className="p-6 text-center text-[#574335] text-xs">
              Nenhuma movimentação registrada para este item ainda.
            </div>
            <div className="mt-4 pt-3 border-t border-[#dec1af]/30 text-right">
              <button
                onClick={() => setIsMovementsModalOpen(false)}
                className="px-4 py-2 bg-[#954a00] text-white rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Produto */}
      {isEditProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-200" /> Editar Produto: {editingProduct.name}
              </h3>
              <button
                onClick={() => setIsEditProductModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Código do Produto *</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg focus:ring-1 focus:ring-[#954a00] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'Ativo' | 'Inativo')}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg focus:ring-1 focus:ring-[#954a00] bg-white font-bold"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-[#574335] mb-1">Nome do Cosmético *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg focus:ring-1 focus:ring-[#954a00] font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Categoria *</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg focus:ring-1 focus:ring-[#954a00] bg-white"
                >
                  <option value="Shampoo em Barra">Shampoo em Barra</option>
                  <option value="Sabonete Artesanal">Sabonete Artesanal</option>
                  <option value="Condicionador Sólido">Condicionador Sólido</option>
                  <option value="Hidratante Corporal">Hidratante Corporal</option>
                  <option value="Sérum Facial">Sérum Facial</option>
                  <option value="Óleo Essencial">Óleo Essencial</option>
                  <option value="Aromaterapia">Aromaterapia</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-bold text-[#954a00]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Unidade de Medida</label>
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  placeholder="Ex: Barra (120g), Frasco 60ml"
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">URL da Imagem do Produto</label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/foto-produto.png"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Descrição & Propriedades</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dec1af]/40">
                <button
                  type="button"
                  onClick={() => setIsEditProductModalOpen(false)}
                  className="px-4 py-2 border border-[#dec1af] text-[#574335] font-bold rounded-xl hover:bg-stone-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
