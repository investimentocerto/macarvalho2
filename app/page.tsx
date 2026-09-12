'use client';

import React, { useState, useEffect } from 'react';
import { 
  ViewMode, 
  Product, 
  BOMComponent, 
  ProcessStepItem, 
  InventoryItem, 
  StockMovement, 
  ProductionOrder, 
  SaleRecord,
  ProductionProcess,
  Equipment
} from '@/lib/types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_BOM_COMPONENTS, 
  INITIAL_PROCESS_STEPS, 
  INITIAL_PRODUCTION_PROCESSES,
  INITIAL_EQUIPMENT,
  INITIAL_INVENTORY, 
  INITIAL_MOVEMENTS, 
  INITIAL_PRODUCTION_ORDERS, 
  INITIAL_SALES 
} from '@/lib/initial-data';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardView } from '@/components/DashboardView';
import { ProductsView } from '@/components/ProductsView';
import { BOMView } from '@/components/BOMView';
import { ProductionProcessesView } from '@/components/ProductionProcessesView';
import { InventoryView } from '@/components/InventoryView';
import { OperationalViews } from '@/components/OperationalViews';
import { IndustrialCostsView } from '@/components/IndustrialCostsView';
import { DirectImageModal } from '@/components/DirectImageModal';
import { SupabaseMigrationModal } from '@/components/SupabaseMigrationModal';
import { dbService } from '@/lib/db-service';
import { isSupabaseConfigured } from '@/lib/supabase';
import { CheckCircle2 } from 'lucide-react';

export default function MaCarvalhoApp() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core ERP Entities State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(INITIAL_PRODUCTS[0] || null);
  const [bomComponents, setBomComponents] = useState<BOMComponent[]>(INITIAL_BOM_COMPONENTS);
  const [processSteps, setProcessSteps] = useState<ProcessStepItem[]>(INITIAL_PROCESS_STEPS);
  const [productionProcesses, setProductionProcesses] = useState<ProductionProcess[]>(INITIAL_PRODUCTION_PROCESSES);
  const [equipment, setEquipment] = useState<Equipment[]>(INITIAL_EQUIPMENT);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(INITIAL_PRODUCTION_ORDERS);
  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>(INITIAL_SALES);

  // Direct Image Modal State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalProduct, setImageModalProduct] = useState<Product | null>(null);

  // Supabase Migration Modal State
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Carregar dados remotos do Supabase ou localStorage
  useEffect(() => {
    // Sempre tentar carregar processos produtivos (mesmo offline/localStorage)
    dbService.fetchProductionProcesses().then((localProcs) => {
      if (localProcs && localProcs.length > 0) {
        setProductionProcesses(localProcs);
      }
    });
    dbService.fetchEquipment().then((items) => {
      if (items && items.length > 0) setEquipment(items);
    });

    if (!isSupabaseConfigured()) return;

    const loadRemoteData = async () => {
      try {
        const [remoteProds, remoteInv, remoteOps, remoteSales, remoteBom, remoteSteps, remoteMovements, remoteProcs, remoteEquipment] = await Promise.all([
          dbService.fetchProducts(),
          dbService.fetchInventory(),
          dbService.fetchProductionOrders(),
          dbService.fetchSales(),
          dbService.fetchBOMComponents(),
          dbService.fetchProcessSteps(),
          dbService.fetchStockMovements(),
          dbService.fetchProductionProcesses(),
          dbService.fetchEquipment(),
        ]);

        if (remoteProds && remoteProds.length > 0) {
          setProducts(remoteProds);
          setSelectedProduct(remoteProds[0]);
        }
        if (remoteInv && remoteInv.length > 0) setInventoryItems(remoteInv);
        if (remoteOps && remoteOps.length > 0) setProductionOrders(remoteOps);
        if (remoteSales && remoteSales.length > 0) setSalesRecords(remoteSales);
        if (remoteBom && remoteBom.length > 0) setBomComponents(remoteBom);
        if (remoteSteps && remoteSteps.length > 0) setProcessSteps(remoteSteps);
        if (remoteMovements && remoteMovements.length > 0) setStockMovements(remoteMovements);
        if (remoteProcs && remoteProcs.length > 0) setProductionProcesses(remoteProcs);
        if (remoteEquipment && remoteEquipment.length > 0) setEquipment(remoteEquipment);

        showNotification('Sincronizado com Supabase PostgreSQL!');
      } catch (err) {
        console.error('Falha ao sincronizar com Supabase:', err);
      }
    };

    loadRemoteData();
  }, []);

  // Critical stock count
  const criticalStockCount = inventoryItems.filter(
    (i) => i.status === 'Crítico' || i.status === 'Esgotado'
  ).length;

  // Active OPs count
  const activeOpCount = productionOrders.filter(
    (o) => o.status === 'Em Andamento'
  ).length;

  // Handler: Update product image
  const handleUpdateProductImage = (productId: string, newImageUrl: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updated = { ...p, imageUrl: newImageUrl };
          dbService.saveProduct(updated).catch(() => {});
          return updated;
        }
        return p;
      })
    );

    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct((prev) => (prev ? { ...prev, imageUrl: newImageUrl } : null));
    }

    showNotification('Foto do produto atualizada com sucesso!');
  };

  // Handler: Add new product
  const handleAddProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
    setSelectedProduct(newProd);
    dbService.saveProduct(newProd).catch(() => {});
    showNotification(`Cosmético ${newProd.code} cadastrado no catálogo!`);
  };

  // Handler: Update product
  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setSelectedProduct(updated);
    dbService.saveProduct(updated).catch(() => {});
    showNotification(`Cosmético ${updated.code} atualizado com sucesso!`);
  };

  // Handler: Add BOM component
  const handleAddBOMComponent = (item: BOMComponent) => {
    setBomComponents((prev) => {
      const updated = [...prev, item];
      if (selectedProduct) {
        const newBomCost = updated.reduce((acc, c) => acc + (c.totalCost || 0), 0);
        const updatedProd = { ...selectedProduct, bomCost: newBomCost };
        setSelectedProduct(updatedProd);
        setProducts((pList) => pList.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
        dbService.saveProduct(updatedProd).catch(() => {});
      }
      return updated;
    });
    dbService.saveBOMComponent(item).catch(() => {});
  };

  // Handler: Update BOM component
  const handleUpdateBOMComponent = (item: BOMComponent) => {
    setBomComponents((prev) => {
      const updated = prev.map((c) => (c.id === item.id ? item : c));
      if (selectedProduct) {
        const newBomCost = updated.reduce((acc, c) => acc + (c.totalCost || 0), 0);
        const updatedProd = { ...selectedProduct, bomCost: newBomCost };
        setSelectedProduct(updatedProd);
        setProducts((pList) => pList.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
        dbService.saveProduct(updatedProd).catch(() => {});
      }
      return updated;
    });
    dbService.saveBOMComponent(item).catch(() => {});
  };

  // Handler: Remove BOM component
  const handleRemoveBOMComponent = (id: string) => {
    setBomComponents((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (selectedProduct) {
        const newBomCost = updated.reduce((acc, c) => acc + (c.totalCost || 0), 0);
        const updatedProd = { ...selectedProduct, bomCost: newBomCost };
        setSelectedProduct(updatedProd);
        setProducts((pList) => pList.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
        dbService.saveProduct(updatedProd).catch(() => {});
      }
      return updated;
    });
    dbService.deleteBOMComponent(id).catch(() => {});
    showNotification('Insumo removido da fórmula.');
  };

  // Handler: Add Process Step
  const handleAddProcessStep = (step: ProcessStepItem) => {
    const stepForProduct: ProcessStepItem = {
      ...step,
      productId: selectedProduct?.id,
    };
    setProcessSteps((prev) => {
      const updated = [...prev, stepForProduct];
      if (selectedProduct) {
        const newOpCost = updated.reduce((acc, s) => acc + (s.cost || 0), 0);
        const updatedProd = { ...selectedProduct, laborCost: newOpCost };
        setSelectedProduct(updatedProd);
        setProducts((pList) => pList.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
        dbService.saveProduct(updatedProd).catch(() => {});
      }
      return updated;
    });
    dbService.saveProcessStep(stepForProduct).catch(() => {});
  };

  // Handler: Update Process Step
  const handleUpdateProcessStep = (step: ProcessStepItem) => {
    const stepForProduct: ProcessStepItem = {
      ...step,
      productId: step.productId || selectedProduct?.id,
    };
    setProcessSteps((prev) => {
      const updated = prev.map((s) => (s.id === stepForProduct.id ? stepForProduct : s));
      if (selectedProduct) {
        const newOpCost = updated.reduce((acc, s) => acc + (s.cost || 0), 0);
        const updatedProd = { ...selectedProduct, laborCost: newOpCost };
        setSelectedProduct(updatedProd);
        setProducts((pList) => pList.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
        dbService.saveProduct(updatedProd).catch(() => {});
      }
      return updated;
    });
    dbService.saveProcessStep(stepForProduct).catch(() => {});
  };

  // Handler: Remove Process Step
  const handleRemoveProcessStep = (id: string) => {
    setProcessSteps((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (selectedProduct) {
        const newOpCost = updated.reduce((acc, s) => acc + (s.cost || 0), 0);
        const updatedProd = { ...selectedProduct, laborCost: newOpCost };
        setSelectedProduct(updatedProd);
        setProducts((pList) => pList.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
        dbService.saveProduct(updatedProd).catch(() => {});
      }
      return updated;
    });
    dbService.deleteProcessStep(id).catch(() => {});
    showNotification('Etapa removida do roteiro.');
  };

  // Handlers: Production Processes (Centros de Custo)
  const handleAddProcess = (proc: ProductionProcess) => {
    setProductionProcesses((prev) => [proc, ...prev]);
    dbService.saveProductionProcess(proc).catch(() => {});
  };

  const handleUpdateProcess = (proc: ProductionProcess) => {
    setProductionProcesses((prev) => prev.map((p) => (p.id === proc.id ? proc : p)));
    dbService.saveProductionProcess(proc).catch(() => {});
  };

  const handleDeleteProcess = (id: string) => {
    setProductionProcesses((prev) => prev.filter((p) => p.id !== id));
    dbService.deleteProductionProcess(id).catch(() => {});
  };

  const handleAddEquipment = (item: Equipment) => {
    setEquipment((prev) => [item, ...prev]);
    dbService.saveEquipment(item).catch(() => {});
  };

  const handleUpdateEquipment = (item: Equipment) => {
    setEquipment((prev) => prev.map((current) => (current.id === item.id ? item : current)));
    dbService.saveEquipment(item).catch(() => {});
  };

  const handleDeleteEquipment = (id: string) => {
    setEquipment((prev) => prev.filter((item) => item.id !== id));
    dbService.deleteEquipment(id).catch(() => {});
  };

  // Handler: Save BOM costs to current product
  const handleSaveBOM = (processCost: number) => {
    if (selectedProduct) {
      const updatedProd = { ...selectedProduct, laborCost: processCost };
      setSelectedProduct(updatedProd);
      setProducts((pList) => pList.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
      dbService.saveProduct(updatedProd).catch(() => {});
    }
  };

  // Handler: Add inventory item
  const handleAddInventoryItem = (item: InventoryItem) => {
    setInventoryItems((prev) => [item, ...prev]);
    dbService.saveInventoryItem(item).catch(() => {});
  };

  // Handler: Update inventory item
  const handleUpdateInventoryItem = (updated: InventoryItem) => {
    setInventoryItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    dbService.saveInventoryItem(updated).catch(() => {});
  };

  // Handler: Add stock movement
  const handleAddMovement = (mov: StockMovement) => {
    setStockMovements((prev) => [mov, ...prev]);
    dbService.saveStockMovement(mov).catch(() => {});
  };

  // Handler: Update OP Status
  const handleUpdateOpStatus = (opId: string, newStatus: ProductionOrder['status']) => {
    setProductionOrders((prev) =>
      prev.map((op) => {
        if (op.id === opId) {
          const progress = newStatus === 'Concluída' ? 100 : op.progress;
          const updated = { ...op, status: newStatus, progress };
          dbService.saveProductionOrder(updated).catch(() => {});
          return updated;
        }
        return op;
      })
    );
    showNotification(`Status da OP atualizado para "${newStatus}"!`);
  };

  // Handler: Navigate to BOM from a selected product
  const handleNavigateToBOM = (prod?: Product) => {
    if (prod) {
      setSelectedProduct(prod);
    }
    setCurrentView('bom');
  };

  // Open Image Modal
  const handleOpenImageModal = (prod?: Product) => {
    setImageModalProduct(prod || selectedProduct || null);
    setIsImageModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1a1c1b] font-sans flex antialiased selection:bg-[#f47d00]/30 selection:text-[#954a00]">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        criticalStockCount={criticalStockCount}
        activeOpCount={activeOpCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenMigration={() => setIsMigrationModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-72 min-w-0 transition-all">
        {/* Fixed Header */}
        <Header
          currentView={currentView}
          globalSearch={globalSearch}
          onSearchChange={setGlobalSearch}
          notificationCount={criticalStockCount}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onOpenMigration={() => setIsMigrationModalOpen(true)}
        />

        {/* View Router */}
        <main className="flex-1 px-4 md:px-6 pt-20 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={(view) => setCurrentView(view)}
              productionOrders={productionOrders}
              salesRecords={salesRecords}
              productsCount={products.length}
              inventoryCount={inventoryItems.length}
            />
          )}

          {currentView === 'produtos' && (
            <ProductsView
              products={products}
              selectedProduct={selectedProduct || undefined}
              onSelectProduct={setSelectedProduct}
              onNavigateToBOM={handleNavigateToBOM}
              onOpenImageModal={(p) => handleOpenImageModal(p)}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
            />
          )}

          {currentView === 'bom' && (
            <BOMView
              currentProduct={selectedProduct || undefined}
              components={bomComponents}
              processSteps={processSteps}
              inventoryItems={inventoryItems}
              productionProcesses={productionProcesses}
              equipment={equipment}
              onAddComponent={handleAddBOMComponent}
              onUpdateComponent={handleUpdateBOMComponent}
              onRemoveComponent={handleRemoveBOMComponent}
              onAddProcessStep={handleAddProcessStep}
              onUpdateProcessStep={handleUpdateProcessStep}
              onRemoveProcessStep={handleRemoveProcessStep}
              onOpenImageModal={(p) => handleOpenImageModal(p)}
              onNotify={showNotification}
              onSaveBOM={handleSaveBOM}
              onUpdateProduct={handleUpdateProduct}
            />
          )}

          {currentView === 'processos' && (
            <ProductionProcessesView
              processes={productionProcesses}
              onAddProcess={handleAddProcess}
              onUpdateProcess={handleUpdateProcess}
              onDeleteProcess={handleDeleteProcess}
              equipment={equipment}
              onAddEquipment={handleAddEquipment}
              onUpdateEquipment={handleUpdateEquipment}
              onDeleteEquipment={handleDeleteEquipment}
              onNotify={showNotification}
            />
          )}

          {currentView === 'estoque' && (
            <InventoryView
              items={inventoryItems}
              movements={stockMovements}
              onNavigate={(view) => setCurrentView(view)}
              onAddItem={handleAddInventoryItem}
              onUpdateItem={handleUpdateInventoryItem}
              onAddMovement={handleAddMovement}
              onOpenImageModalForUrl={(_title, _url) => handleOpenImageModal()}
              onNotify={showNotification}
            />
          )}

          {currentView === 'custos-industriais' && (
            <IndustrialCostsView onNotify={showNotification} />
          )}

          {/* Operational Views (Ordens de Produção, Compras, Vendas) */}
          {(currentView === 'ordens-producao' ||
            currentView === 'compras' ||
            currentView === 'vendas') && (
            <OperationalViews
              view={currentView}
              productionOrders={productionOrders}
              salesRecords={salesRecords}
              onAddProductionOrder={(newOp) => {
                setProductionOrders((prev) => [newOp, ...prev]);
                dbService.saveProductionOrder(newOp).catch(() => {});
              }}
              onUpdateOpStatus={handleUpdateOpStatus}
              onAddSaleRecord={(newSale) => {
                setSalesRecords((prev) => [newSale, ...prev]);
                dbService.saveSale(newSale).catch(() => {});
              }}
              onNotify={showNotification}
            />
          )}
        </main>
      </div>

      {/* Direct Image Modal */}
      <DirectImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        selectedProduct={imageModalProduct}
        onUpdateProductImage={handleUpdateProductImage}
      />

      {/* Supabase Migration Modal */}
      <SupabaseMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        onNotify={showNotification}
      />

      {/* Floating Feedback Notification */}
      {toastMessage && (
        <div 
          id="system-notification-toast"
          className="fixed bottom-6 right-6 z-50 bg-[#1a1c1b] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 text-xs font-semibold animate-slideUp"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
