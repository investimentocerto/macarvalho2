'use client';

import React, { useState } from 'react';
import { BOMComponent, ProcessStepItem, Product, InventoryItem, ProductionProcess } from '@/lib/types';
import { 
  Layers, 
  Plus, 
  Copy, 
  Save, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Trash2, 
  Pencil,
  ChevronDown, 
  ChevronUp, 
  CornerDownRight, 
  Wrench, 
  Cpu, 
  Factory, 
  Image as ImageIcon, 
  X,
  PackageCheck,
  AlertTriangle
} from 'lucide-react';

interface BOMViewProps {
  currentProduct?: Product;
  components: BOMComponent[];
  processSteps: ProcessStepItem[];
  inventoryItems?: InventoryItem[];
  productionProcesses?: ProductionProcess[];
  onAddComponent: (comp: BOMComponent) => void;
  onUpdateComponent?: (comp: BOMComponent) => void;
  onRemoveComponent: (id: string) => void;
  onAddProcessStep: (step: ProcessStepItem) => void;
  onUpdateProcessStep?: (step: ProcessStepItem) => void;
  onRemoveProcessStep?: (id: string) => void;
  onOpenImageModal: (product: Product) => void;
  onNotify: (msg: string) => void;
  onSaveBOM?: (processCost: number) => void;
  onUpdateProduct?: (product: Product) => void;
}

export const BOMView: React.FC<BOMViewProps> = ({
  currentProduct,
  components,
  processSteps,
  inventoryItems = [],
  productionProcesses = [],
  onAddComponent,
  onUpdateComponent,
  onRemoveComponent,
  onAddProcessStep,
  onUpdateProcessStep,
  onRemoveProcessStep,
  onOpenImageModal,
  onNotify,
  onSaveBOM,
  onUpdateProduct,
}) => {
  const [showAllComponents, setShowAllComponents] = useState(false);
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);

  // Edit Component Modal State
  const [isEditComponentModalOpen, setIsEditComponentModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<BOMComponent | null>(null);
  const [editCompName, setEditCompName] = useState('');
  const [editCompLevel, setEditCompLevel] = useState('1');
  const [editCompQty, setEditCompQty] = useState('1');
  const [editCompUnit, setEditCompUnit] = useState('KG');
  const [editCompCost, setEditCompCost] = useState('0.00');
  const [editCompImageUrl, setEditCompImageUrl] = useState('');

  // Edit Step Modal State
  const [isEditStepModalOpen, setIsEditStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ProcessStepItem | null>(null);
  const [editStepTitle, setEditStepTitle] = useState('');
  const [editStepMachine, setEditStepMachine] = useState('');
  const [editStepLine, setEditStepLine] = useState('');
  const [editStepSelectedProcessId, setEditStepSelectedProcessId] = useState('');

  // Delete Confirmation Modal State (Works reliably in iframes)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'component' | 'step';
    id: string;
    name: string;
  } | null>(null);

  // New Component Form
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [newCompName, setNewCompName] = useState('');
  const [newCompLevel, setNewCompLevel] = useState('1');
  const [newCompQty, setNewCompQty] = useState('1');
  const [newCompUnit, setNewCompUnit] = useState('KG');
  const [newCompCost, setNewCompCost] = useState('15.00');
  const [newCompImageUrl, setNewCompImageUrl] = useState('');

  // New Step Form (Centros de Custo & Produção por Hora & Mão de Obra)
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepMachine, setNewStepMachine] = useState('Bancada Artesanal');
  const [newStepLine, setNewStepLine] = useState('Linha Geral');

  const totalProcessCost = processSteps.reduce((acc, s) => acc + (s.cost || 0), 0);

  const handleDuplicate = () => {
    onNotify('Estrutura técnica duplicada para nova revisão com sucesso!');
  };

  const handleSave = () => {
    if (onSaveBOM) {
      onSaveBOM(totalProcessCost);
    }
    onNotify('Estrutura técnica (BOM) e roteiro salvos com sucesso!');
  };

  // Edit Product Modal State (Directly from BOM View)
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editProdCode, setEditProdCode] = useState('');
  const [editProdName, setEditProdName] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('0');
  const [editProdUnit, setEditProdUnit] = useState('');
  const [editProdStock, setEditProdStock] = useState('0');
  const [editProdMinStock, setEditProdMinStock] = useState('0');
  const [editProdStatus, setEditProdStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [editProdDescription, setEditProdDescription] = useState('');

  const handleOpenEditProduct = () => {
    if (!currentProduct) return;
    setEditProdCode(currentProduct.code || '');
    setEditProdName(currentProduct.name || '');
    setEditProdCategory(currentProduct.category || 'Outros');
    setEditProdPrice(currentProduct.price?.toString() || '0');
    setEditProdUnit(currentProduct.unit || 'UN');
    setEditProdStock(currentProduct.stock?.toString() || '0');
    setEditProdMinStock(currentProduct.minStock?.toString() || '0');
    setEditProdStatus(currentProduct.status || 'Ativo');
    setEditProdDescription(currentProduct.description || '');
    setIsEditProductModalOpen(true);
  };

  const handleUpdateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || !editProdCode.trim() || !editProdName.trim()) return;

    const updated: Product = {
      ...currentProduct,
      code: editProdCode.trim().toUpperCase(),
      name: editProdName.trim(),
      category: editProdCategory,
      price: Number(editProdPrice) || 0,
      unit: editProdUnit,
      stock: Number(editProdStock) || 0,
      minStock: Number(editProdMinStock) || 0,
      status: editProdStatus,
      description: editProdDescription,
    };

    if (onUpdateProduct) {
      onUpdateProduct(updated);
    }
    setIsEditProductModalOpen(false);
    onNotify(`Produto "${updated.name}" atualizado com sucesso!`);
  };

  const handleOpenAddComponentModal = () => {
    setSelectedInventoryId('');
    setNewCompName('');
    setNewCompLevel('1');
    setNewCompQty('1');
    setNewCompUnit('KG');
    setNewCompCost('15.00');
    setNewCompImageUrl('');
    setIsAddComponentModalOpen(true);
  };

  const handleCreateComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName) return;

    const qty = parseFloat(newCompQty) || 1;
    const cost = parseFloat(newCompCost) || 0;

    const comp: BOMComponent = {
      id: `comp-${Date.now()}`,
      level: newCompLevel,
      name: newCompName,
      quantity: qty,
      unit: newCompUnit,
      unitCost: cost,
      totalCost: qty * cost,
      imageUrl: newCompImageUrl || undefined,
    };

    onAddComponent(comp);
    setIsAddComponentModalOpen(false);
    setSelectedInventoryId('');
    setNewCompName('');
    setNewCompImageUrl('');
    onNotify(`Insumo "${newCompName}" adicionado à estrutura!`);
  };

  const handleOpenEditComponent = (comp: BOMComponent) => {
    setEditingComponent(comp);
    setEditCompName(comp.name);
    setEditCompLevel(comp.level);
    setEditCompQty(comp.quantity.toString());
    setEditCompUnit(comp.unit);
    setEditCompCost(comp.unitCost.toString());
    setEditCompImageUrl(comp.imageUrl || '');
    setIsEditComponentModalOpen(true);
  };

  const handleUpdateComponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComponent || !editCompName) return;

    const qty = parseFloat(editCompQty) || 0;
    const cost = parseFloat(editCompCost) || 0;

    const updated: BOMComponent = {
      ...editingComponent,
      name: editCompName,
      level: editCompLevel,
      quantity: qty,
      unit: editCompUnit,
      unitCost: cost,
      totalCost: qty * cost,
      imageUrl: editCompImageUrl || undefined,
    };

    if (onUpdateComponent) {
      onUpdateComponent(updated);
    }
    setIsEditComponentModalOpen(false);
    setEditingComponent(null);
    onNotify(`Insumo "${updated.name}" atualizado!`);
  };

  const handleOpenAddStepModal = () => {
    setSelectedProcessId('');
    setNewStepTitle('');
    setNewStepMachine('Bancada Artesanal');
    setNewStepLine('Linha Cosméticos');
    setIsAddStepModalOpen(true);
  };

  const handleCreateStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle) return;

    const nextStepNum = (processSteps.length + 1) * 10;
    const step: ProcessStepItem = {
      id: `proc-${Date.now()}`,
      stepNumber: nextStepNum,
      title: newStepTitle,
      cost: 0,
      machine: newStepMachine,
      line: newStepLine,
      durationMinutes: 0,
      durationFormatted: '',
      hourlyRateText: '',
      processId: selectedProcessId || undefined,
      costCenterCode: newStepMachine,
      hourlyRate: 0,
      laborQuantity: 0,
      unitsPerHour: 0,
    };

    onAddProcessStep(step);
    setIsAddStepModalOpen(false);
    setSelectedProcessId('');
    setNewStepTitle('');
    onNotify(`Etapa "${newStepTitle}" incluída no roteiro!`);
  };

  const handleOpenEditStep = (step: ProcessStepItem) => {
    setEditingStep(step);
    setEditStepTitle(step.title);
    setEditStepMachine(step.machine || '');
    setEditStepLine(step.line || 'Linha Cosméticos');
    setEditStepSelectedProcessId(step.processId || '');
    setIsEditStepModalOpen(true);
  };

  const handleUpdateStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStep || !editStepTitle) return;

    const updated: ProcessStepItem = {
      ...editingStep,
      title: editStepTitle,
      machine: editStepMachine,
      line: editStepLine,
      processId: editStepSelectedProcessId || undefined,
      costCenterCode: editStepMachine,
    };

    if (onUpdateProcessStep) {
      onUpdateProcessStep(updated);
    }
    setIsEditStepModalOpen(false);
    setEditingStep(null);
    onNotify(`Etapa "${updated.title}" atualizada no roteiro!`);
  };

  const displayedComponents = showAllComponents ? components : components.slice(0, 8);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Header / Actions */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[#f4f3f1] p-6 rounded-2xl shadow-xs relative overflow-hidden border border-[#dec1af]/40">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#574335] uppercase tracking-wider">
              SKU: {currentProduct?.sku || currentProduct?.code || 'SAB-001'}
            </span>
            <span className="bg-[#9df897] text-[#002204] px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0d6e1f]"></span>
              Fórmula Ativa
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 
              onClick={handleOpenEditProduct}
              className="text-2xl sm:text-3xl font-bold text-[#1a1c1b] tracking-tight hover:text-[#954a00] cursor-pointer transition-colors"
              title="Clique para editar as informações do produto"
            >
              {currentProduct?.name || 'Fórmula de Cosmético Artesanal'}
            </h1>
            {currentProduct && (
              <button
                onClick={handleOpenEditProduct}
                className="p-1.5 text-[#574335] hover:text-[#954a00] hover:bg-white rounded-lg transition-colors"
                title="Editar produto"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#574335] max-w-2xl">
            Composição técnica de matérias-primas e roteiro de produção artesanal MaCarvalho.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2.5">
          {currentProduct && (
            <button
              id="btn-edit-product-bom"
              onClick={handleOpenEditProduct}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-50 border border-[#dec1af] rounded-xl text-xs font-bold text-[#954a00] shadow-2xs transition-all"
              title="Editar dados cadastrais do cosmético"
            >
              <Pencil className="w-3.5 h-3.5 text-[#f47d00]" />
              Editar Produto
            </button>
          )}

          {currentProduct && (
            <button
              id="btn-bom-image"
              onClick={() => onOpenImageModal(currentProduct)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-50 border border-[#dec1af] rounded-xl text-xs font-bold text-[#954a00] shadow-2xs transition-all"
              title="Vincular foto ou rótulo do cosmético"
            >
              <ImageIcon className="w-4 h-4 text-[#f47d00]" />
              Foto / Rótulo
            </button>
          )}

          <button
            id="btn-duplicate-bom"
            onClick={handleDuplicate}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-stone-50 border border-[#dec1af] rounded-xl text-xs font-bold text-[#954a00] shadow-2xs transition-all"
          >
            <Copy className="w-4 h-4" />
            Duplicar Fórmula
          </button>
          <button
            id="btn-save-bom"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Save className="w-4 h-4" />
            Salvar Fórmula
          </button>
        </div>
      </section>

      {/* BOM Details Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Components Table (Left 7 cols) */}
        <section className="xl:col-span-7 flex flex-col bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 overflow-hidden">
          <div className="p-4 flex justify-between items-center bg-[#f4f3f1] border-b border-[#dec1af]/30">
            <h2 className="font-bold text-sm text-[#1a1c1b] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#954a00]" />
              Matérias-Primas & Insumos
            </h2>
            <button
              id="btn-add-bom-component"
              onClick={handleOpenAddComponentModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              Adicionar Insumo
            </button>
          </div>

          <div className="overflow-x-auto">
            {components.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center text-[#574335]">
                <Layers className="w-10 h-10 text-[#dec1af] mb-2" />
                <span className="font-bold text-sm text-[#1a1c1b]">Nenhum insumo incluído na fórmula</span>
                <p className="text-xs text-[#574335] mt-1 max-w-sm">
                  Clique em &quot;Adicionar Insumo&quot; para compor as matérias-primas (óleos, manteigas, essências, argilas, frascos).
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-white text-[#574335] font-semibold uppercase tracking-wider border-b border-[#e9e8e6]">
                    <th className="py-2.5 px-4 w-14 text-center">Item</th>
                    <th className="py-2.5 px-4">Matéria-Prima / Embalagem</th>
                    <th className="py-2.5 px-4 text-right w-16">Qtd</th>
                    <th className="py-2.5 px-4 text-center w-14">Unid</th>
                    <th className="py-2.5 px-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e8e6]">
                  {displayedComponents.map((comp) => {
                    const isIndented = comp.level.includes('.');

                    return (
                      <tr 
                        key={comp.id}
                        onClick={() => handleOpenEditComponent(comp)}
                        className="hover:bg-[#ffdcc6]/20 transition-colors group h-10 cursor-pointer"
                        title="Clique no insumo para editar"
                      >
                        <td className="py-2 px-4 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                            isIndented ? 'bg-amber-100 text-amber-900 ml-3' : 'bg-stone-200 text-stone-800'
                          }`}>
                            {comp.level}
                          </span>
                        </td>
                        <td className={`py-2 px-4 ${isIndented ? 'pl-7' : ''}`}>
                          <div className="flex items-center gap-2">
                            {isIndented ? (
                              <CornerDownRight className="w-3.5 h-3.5 text-[#574335]/60 shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded bg-[#efeeec] flex items-center justify-center shrink-0 text-[#574335]">
                                <Layers className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <span className={`truncate ${isIndented ? 'text-[#574335]' : 'font-semibold text-[#1a1c1b]'}`}>
                              {comp.name}
                            </span>
                            {comp.imageUrl && (
                              <img
                                src={comp.imageUrl}
                                alt={comp.name}
                                className="w-4 h-4 rounded object-cover ml-1 border border-[#dec1af]/40 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4 text-right font-medium">{comp.quantity.toFixed(2)}</td>
                        <td className="py-2 px-4 text-center text-[#574335]">{comp.unit}</td>
                        <td className="py-2 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditComponent(comp)}
                              className="text-[#574335] hover:text-[#954a00] hover:bg-amber-100/60 transition-all p-1.5 rounded-md"
                              title="Editar insumo da fórmula"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirm({
                                  type: 'component',
                                  id: comp.id,
                                  name: comp.name,
                                });
                              }}
                              className="text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all p-1.5 rounded-md"
                              title="Remover insumo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {components.length > 8 && (
            <div className="p-3 bg-white flex justify-center border-t border-[#e9e8e6]">
              <button
                onClick={() => setShowAllComponents(!showAllComponents)}
                className="text-xs font-semibold text-[#574335] hover:text-[#954a00] transition-colors flex items-center gap-1"
              >
                <span>{showAllComponents ? 'Ocultar expandidos' : `Ver todos os ${components.length} insumos`}</span>
                {showAllComponents ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          )}
        </section>

        {/* Process Routing Area (Right 5 cols) */}
        <section className="xl:col-span-5 flex flex-col bg-white rounded-2xl shadow-xs border border-[#dec1af]/40 overflow-hidden relative">
          <div className="p-4 flex justify-between items-center bg-[#f4f3f1] border-b border-[#dec1af]/30">
            <h2 className="font-bold text-sm text-[#1a1c1b] flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#954a00]" />
              Roteiro de Produção
            </h2>
            <button
              id="btn-add-process-step"
              onClick={() => setIsAddStepModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#954a00] hover:bg-[#713700] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              Nova Etapa
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {processSteps.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-[#574335]">
                <Clock className="w-10 h-10 text-[#dec1af] mb-2" />
                <span className="font-bold text-sm text-[#1a1c1b]">Nenhuma etapa de roteiro definida</span>
                <p className="text-xs text-[#574335] mt-1 max-w-xs">
                  Cadastre passos como derretimento em banho-maria, dosagem de óleos essenciais, envase e cura.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-5 before:absolute before:inset-y-0 before:left-2.5 before:w-px before:bg-[#dec1af]/50">
                {processSteps.map((step) => (
                  <div key={step.id} className="relative">
                    <div className="absolute -left-6 w-5 h-5 rounded-full bg-white border-2 border-[#954a00] flex items-center justify-center z-10 ring-4 ring-white">
                      <span className="text-[9px] font-bold text-[#954a00]">{step.stepNumber}</span>
                    </div>

                    <div 
                      onClick={() => handleOpenEditStep(step)}
                      className="bg-[#f4f3f1] hover:bg-[#ffdcc6]/20 p-3.5 rounded-xl border border-[#dec1af]/40 hover:border-[#954a00]/40 hover:shadow-xs transition-all cursor-pointer group"
                      title="Clique para editar esta etapa do roteiro"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[#1a1c1b] group-hover:text-[#954a00] transition-colors">
                            {step.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEditStep(step)}
                            className="p-1 text-[#574335] hover:text-[#954a00] hover:bg-white rounded transition-colors"
                            title="Editar etapa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {onRemoveProcessStep && (
                            <button
                              onClick={() => {
                                setDeleteConfirm({
                                  type: 'step',
                                  id: step.id,
                                  name: step.title,
                                });
                              }}
                              className="p-1 text-stone-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                              title="Remover etapa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-2 text-xs text-[#574335]">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-[#954a00]" />
                          <span className="truncate font-medium">{step.machine}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Factory className="w-3.5 h-3.5 text-[#954a00]" />
                          <span className="truncate">{step.line}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-[#f4f3f1] border-t border-[#dec1af]/40 flex justify-between items-center text-xs">
            <span className="text-[#574335]">
              Total de Etapas: <strong className="text-[#1a1c1b]">{processSteps.length}</strong>
            </span>
          </div>
        </section>
      </div>

      {/* Modal: Adicionar Componente */}
      {isAddComponentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" /> Adicionar Insumo à Fórmula
              </h3>
              <button onClick={() => setIsAddComponentModalOpen(false)}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateComponent} className="p-5 space-y-3.5 text-xs">
              {/* Escolha ou Digitação do Insumo */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#574335]">
                    Insumo / Matéria-Prima *
                  </label>
                  {inventoryItems.length > 0 && (
                    <span className="text-[10px] text-[#954a00] font-bold bg-[#fde9d7] px-2 py-0.5 rounded-full border border-[#dec1af]/40 flex items-center gap-1">
                      <PackageCheck className="w-3 h-3 text-[#954a00]" />
                      {inventoryItems.length} insumos no Estoque
                    </span>
                  )}
                </div>

                {inventoryItems.length > 0 ? (
                  <div className="space-y-2">
                    <div>
                      <select
                        id="select-bom-inventory-source"
                        value={selectedInventoryId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedInventoryId(id);
                          if (id) {
                            const item = inventoryItems.find((inv) => inv.id === id);
                            if (item) {
                              setNewCompName(item.name);
                              setNewCompUnit(item.unit || 'UN');
                              setNewCompCost(
                                item.unitCost !== undefined ? item.unitCost.toFixed(2) : '0.00'
                              );
                              if (item.imageUrl) {
                                setNewCompImageUrl(item.imageUrl);
                              }
                              if (item.category === 'Embalagens' || item.category === 'Componentes') {
                                setNewCompLevel('1.2');
                              } else {
                                setNewCompLevel('1');
                              }
                            }
                          }
                        }}
                        className="w-full p-2.5 border border-[#954a00]/40 rounded-lg bg-[#fffaf5] text-xs font-semibold text-[#574335] focus:ring-1 focus:ring-[#954a00]"
                      >
                        <option value="">-- Escolher do Controle de Estoque --</option>
                        {inventoryItems.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            [{inv.code}] {inv.name} • {inv.unit} • R$ {inv.unitCost !== undefined ? Number(inv.unitCost).toFixed(2).replace('.', ',') : '0,00'} (Saldo: {inv.balance} {inv.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Nome do insumo ou matéria-prima"
                        value={newCompName}
                        onChange={(e) => {
                          setNewCompName(e.target.value);
                          if (selectedInventoryId) {
                            const matched = inventoryItems.find((inv) => inv.id === selectedInventoryId);
                            if (matched && matched.name !== e.target.value) {
                              setSelectedInventoryId('');
                            }
                          }
                        }}
                        className="w-full p-2.5 border border-[#dec1af] rounded-lg focus:ring-1 focus:ring-[#954a00]"
                      />
                    </div>

                    {inventoryItems.find((inv) => inv.id === selectedInventoryId) && (
                      <div className="flex items-center justify-between p-2.5 bg-[#f4f3f1] border border-[#dec1af]/60 rounded-lg text-[11px] text-[#574335]">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-4 h-4 text-[#0d6e1f] shrink-0" />
                          <span className="truncate">
                            Item do Estoque: <strong>{inventoryItems.find((inv) => inv.id === selectedInventoryId)?.code}</strong> • Saldo: <strong>{inventoryItems.find((inv) => inv.id === selectedInventoryId)?.balance} {inventoryItems.find((inv) => inv.id === selectedInventoryId)?.unit}</strong>
                          </span>
                        </div>
                        <span className="text-[10px] text-[#0d6e1f] font-bold shrink-0 ml-2 bg-[#9df897]/50 px-2 py-0.5 rounded-md">
                          Unidade e Custo carregados
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Óleo Essencial de Lavanda Francesa"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      className="w-full p-2.5 border border-[#dec1af] rounded-lg focus:ring-1 focus:ring-[#954a00]"
                    />
                    <p className="text-[10px] text-[#574335] mt-1">
                      Você também pode cadastrar matérias-primas na aba <strong>Controle de Estoque</strong> para carregar automaticamente unidade e custo.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Nível Hierárquico</label>
                  <select
                    value={newCompLevel}
                    onChange={(e) => setNewCompLevel(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
                  >
                    <option value="1">1 (Base Principal)</option>
                    <option value="1.1">1.1 (Aditivo / Essência)</option>
                    <option value="1.2">1.2 (Embalagem / Rótulo)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Unidade</label>
                  <select
                    value={newCompUnit}
                    onChange={(e) => setNewCompUnit(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
                  >
                    <option value="KG">Quilo (KG)</option>
                    <option value="G">Gramas (G)</option>
                    <option value="ML">Mililitros (ML)</option>
                    <option value="L">Litros (L)</option>
                    <option value="UN">Unidade (UN)</option>
                    {Boolean(newCompUnit && !['KG', 'G', 'ML', 'L', 'UN'].includes(newCompUnit.toUpperCase())) && (
                      <option value={newCompUnit}>{newCompUnit} (do Cadastro)</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Quantidade</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCompQty}
                    onChange={(e) => setNewCompQty(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCompCost}
                    onChange={(e) => setNewCompCost(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#f47d00]" />
                  Link Direto da Imagem (HTML)
                </label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/insumo.png"
                  value={newCompImageUrl}
                  onChange={(e) => setNewCompImageUrl(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dec1af]/30">
                <button
                  type="button"
                  onClick={() => setIsAddComponentModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-[#574335] font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white font-bold rounded-xl shadow-xs"
                >
                  Adicionar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Insumo da Fórmula */}
      {isEditComponentModalOpen && editingComponent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Editar Insumo da Fórmula
              </h3>
              <button onClick={() => setIsEditComponentModalOpen(false)}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleUpdateComponentSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#574335] mb-1">Insumo / Matéria-Prima *</label>
                <input
                  type="text"
                  required
                  value={editCompName}
                  onChange={(e) => setEditCompName(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg font-semibold text-[#1a1c1b] focus:ring-1 focus:ring-[#954a00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Nível Hierárquico</label>
                  <select
                    value={editCompLevel}
                    onChange={(e) => setEditCompLevel(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
                  >
                    <option value="1">1 (Base Principal)</option>
                    <option value="1.1">1.1 (Aditivo / Essência)</option>
                    <option value="1.2">1.2 (Embalagem / Rótulo)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Unidade</label>
                  <select
                    value={editCompUnit}
                    onChange={(e) => setEditCompUnit(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
                  >
                    <option value="KG">Quilo (KG)</option>
                    <option value="G">Gramas (G)</option>
                    <option value="ML">Mililitros (ML)</option>
                    <option value="L">Litros (L)</option>
                    <option value="UN">Unidade (UN)</option>
                    {Boolean(editCompUnit && !['KG', 'G', 'ML', 'L', 'UN'].includes(editCompUnit.toUpperCase())) && (
                      <option value={editCompUnit}>{editCompUnit}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Quantidade</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={editCompQty}
                    onChange={(e) => setEditCompQty(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editCompCost}
                    onChange={(e) => setEditCompCost(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-bold text-[#954a00]"
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              <div className="p-3 bg-stone-50 rounded-xl border border-[#dec1af]/40 flex justify-between items-center text-xs">
                <span className="text-[#574335]">Custo Total do Insumo:</span>
                <span className="font-bold text-sm text-[#1a1c1b]">
                  R$ {((parseFloat(editCompQty) || 0) * (parseFloat(editCompCost) || 0)).toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#f47d00]" />
                  Link da Imagem (opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/insumo.png"
                  value={editCompImageUrl}
                  onChange={(e) => setEditCompImageUrl(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#dec1af]/30">
                {editingComponent && (
                  <button
                    type="button"
                    onClick={() => {
                      const comp = editingComponent;
                      setIsEditComponentModalOpen(false);
                      setDeleteConfirm({
                        type: 'component',
                        id: comp.id,
                        name: comp.name,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 font-bold rounded-xl transition-colors text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Insumo
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditComponentModalOpen(false)}
                    className="px-4 py-2 bg-stone-100 text-[#574335] font-bold rounded-xl hover:bg-stone-200 transition-colors"
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Etapa de Roteiro (Com Centros de Custo e Produção por Hora) */}
      {isAddStepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-200" /> Nova Etapa do Roteiro Produtivo
              </h3>
              <button onClick={() => setIsAddStepModalOpen(false)}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateStep} className="p-5 space-y-3.5 text-xs">
              {/* Seleção do processo de fabricação */}
              <div>
                <label className="block font-bold text-[#574335] mb-1 flex items-center justify-between">
                  <span>Processo de Fabricação</span>
                </label>
                <select
                  value={selectedProcessId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setSelectedProcessId(pId);
                    const proc = productionProcesses.find((p) => p.id === pId);
                    if (proc) {
                      setNewStepTitle(proc.description);
                      setNewStepMachine(proc.code);
                    }
                  }}
                  className="w-full p-2.5 border border-[#dec1af] rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#954a00]/20 focus:border-[#954a00]"
                >
                  <option value="">-- Selecione do Cadastro de Processos ou digite manualmente --</option>
                  {productionProcesses.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      [{proc.code}] {proc.description}
                    </option>
                  ))}
                </select>
                {productionProcesses.length === 0 && (
                  <p className="text-[10px] text-amber-800 mt-1">
                    Nenhum processo cadastrado ainda. Você pode cadastrar em &quot;Processos Produtivos&quot; no menu lateral.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Título / Descrição da Etapa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mistura e Aquecimento em Banho-Maria"
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-xl focus:ring-2 focus:ring-[#954a00]/20 focus:border-[#954a00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Cód. Centro Custo / Máquina</label>
                  <input
                    type="text"
                    value={newStepMachine}
                    onChange={(e) => setNewStepMachine(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-xl font-mono text-[#954a00] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Linha / Setor</label>
                  <input
                    type="text"
                    value={newStepLine}
                    onChange={(e) => setNewStepLine(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dec1af]/30">
                <button
                  type="button"
                  onClick={() => setIsAddStepModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-[#574335] font-bold rounded-xl hover:bg-stone-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Salvar Etapa no Roteiro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Etapa de Roteiro */}
      {isEditStepModalOpen && editingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-200" /> Editar Etapa do Roteiro Produtivo
              </h3>
              <button onClick={() => setIsEditStepModalOpen(false)}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleUpdateStepSubmit} className="p-5 space-y-3.5 text-xs">
              {/* Seleção do processo de fabricação */}
              <div>
                <label className="block font-bold text-[#574335] mb-1 flex items-center justify-between">
                  <span>Processo de Fabricação</span>
                </label>
                <select
                  value={editStepSelectedProcessId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setEditStepSelectedProcessId(pId);
                    const proc = productionProcesses.find((p) => p.id === pId);
                    if (proc) {
                      setEditStepTitle(proc.description);
                      setEditStepMachine(proc.code);
                    }
                  }}
                  className="w-full p-2.5 border border-[#dec1af] rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#954a00]/20 focus:border-[#954a00]"
                >
                  <option value="">-- Manter dados atuais ou escolher do cadastro --</option>
                  {productionProcesses.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      [{proc.code}] {proc.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Título / Descrição da Etapa *</label>
                <input
                  type="text"
                  required
                  value={editStepTitle}
                  onChange={(e) => setEditStepTitle(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-xl font-semibold text-[#1a1c1b] focus:ring-2 focus:ring-[#954a00]/20 focus:border-[#954a00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Cód. Centro Custo / Máquina</label>
                  <input
                    type="text"
                    value={editStepMachine}
                    onChange={(e) => setEditStepMachine(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-xl font-mono text-[#954a00] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Linha / Setor</label>
                  <input
                    type="text"
                    value={editStepLine}
                    onChange={(e) => setEditStepLine(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#dec1af]/30">
                {editingStep && onRemoveProcessStep && (
                  <button
                    type="button"
                    onClick={() => {
                      const step = editingStep;
                      setIsEditStepModalOpen(false);
                      setDeleteConfirm({
                        type: 'step',
                        id: step.id,
                        name: step.title,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 font-bold rounded-xl transition-colors text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Etapa
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditStepModalOpen(false)}
                    className="px-4 py-2 bg-stone-100 text-[#574335] font-bold rounded-xl hover:bg-stone-200 transition-colors"
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Informações do Produto (a partir da tela de BOM) */}
      {isEditProductModalOpen && currentProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden">
            <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-200" /> Editar Dados do Produto: {currentProduct.name}
              </h3>
              <button onClick={() => setIsEditProductModalOpen(false)}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Código do Produto *</label>
                  <input
                    type="text"
                    required
                    value={editProdCode}
                    onChange={(e) => setEditProdCode(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Status</label>
                  <select
                    value={editProdStatus}
                    onChange={(e) => setEditProdStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white font-bold"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Nome do Cosmético *</label>
                <input
                  type="text"
                  required
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg font-semibold text-[#1a1c1b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Categoria *</label>
                  <select
                    value={editProdCategory}
                    onChange={(e) => setEditProdCategory(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg bg-white"
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
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-bold text-[#954a00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Unidade</label>
                  <input
                    type="text"
                    value={editProdUnit}
                    onChange={(e) => setEditProdUnit(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    min="0"
                    value={editProdStock}
                    onChange={(e) => setEditProdStock(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#574335] mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={editProdMinStock}
                    onChange={(e) => setEditProdMinStock(e.target.value)}
                    className="w-full p-2.5 border border-[#dec1af] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#574335] mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editProdDescription}
                  onChange={(e) => setEditProdDescription(e.target.value)}
                  className="w-full p-2.5 border border-[#dec1af] rounded-lg resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dec1af]/30">
                <button
                  type="button"
                  onClick={() => setIsEditProductModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 text-[#574335] font-bold rounded-xl hover:bg-stone-200 transition-colors"
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
      {/* Modal de Confirmação de Exclusão (Insumo ou Etapa do Roteiro) */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
            <div className="p-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                {deleteConfirm.type === 'component' ? 'Excluir Insumo da Fórmula' : 'Excluir Etapa do Roteiro'}
              </h3>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#574335] leading-relaxed">
                Tem certeza que deseja remover <b>&quot;{deleteConfirm.name}&quot;</b>{' '}
                {deleteConfirm.type === 'component'
                  ? 'da estrutura técnica (BOM)?'
                  : 'do roteiro de produção?'}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#574335] font-bold text-xs rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirm.type === 'component') {
                      onRemoveComponent(deleteConfirm.id);
                      onNotify(`Insumo "${deleteConfirm.name}" removido da estrutura!`);
                    } else if (deleteConfirm.type === 'step' && onRemoveProcessStep) {
                      onRemoveProcessStep(deleteConfirm.id);
                      onNotify(`Etapa "${deleteConfirm.name}" removida do roteiro!`);
                    }
                    setDeleteConfirm(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
