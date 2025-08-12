// Global state
let state = {
    items: [],
    categories: [],
    suppliers: [],
    movements: [],
    currentPage: 'dashboard',
    filters: {},
    pagination: { page: 1, limit: 10 }
};

// Storage Service (optimisé mobile)
const storageService = (() => {
    const saveToLocalStorage = (data) => {
        try {
            localStorage.setItem('fungistock_v1_db', JSON.stringify({
                version: 1,
                timestamp: new Date().toISOString(),
                ...data
            }));
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            ui.showToast('Erreur de sauvegarde', 'error');
            return false;
        }
    };

    const loadFromLocalStorage = () => {
        try {
            const data = localStorage.getItem('fungistock_v1_db');
            if (data) {
                const parsed = JSON.parse(data);
                return {
                    items: parsed.items || [],
                    categories: parsed.categories || [],
                    suppliers: parsed.suppliers || [],
                    movements: parsed.movements || []
                };
            }
        } catch (e) {
            console.error('Load error:', e);
        }
        return { items: [], categories: [], suppliers: [], movements: [] };
    };

    return {
        load: () => loadFromLocalStorage(),
        save: (data) => saveToLocalStorage(data),
        
        exportData: () => {
            try {
                const data = {
                    version: 1,
                    timestamp: new Date().toISOString(),
                    items: state.items,
                    categories: state.categories,
                    suppliers: state.suppliers,
                    movements: state.movements
                };
                
                const jsonData = JSON.stringify(data, null, 2);
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonData);
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", `fungistock-backup-${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                ui.showToast('Export réussi !');
            } catch (e) {
                console.error('Export error:', e);
                ui.showToast('Erreur lors de l\'export', 'error');
            }
        }
    };
})();

// Repository Service
const repo = (() => {
    const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

    return {
        // Categories
        getCategories: () => state.categories,
        getCategoryById: (id) => state.categories.find(c => c.id === id),
        addCategory: (category) => {
            const newCategory = { ...category, id: generateId(), createdAt: new Date().toISOString() };
            state.categories.push(newCategory);
            storageService.save(state);
            return newCategory;
        },
        updateCategory: (id, updates) => {
            const index = state.categories.findIndex(c => c.id === id);
            if (index !== -1) {
                state.categories[index] = { 
                    ...state.categories[index], 
                    ...updates, 
                    updatedAt: new Date().toISOString() 
                };
                storageService.save(state);
                return state.categories[index];
            }
            return null;
        },
        deleteCategory: (id) => {
            state.categories = state.categories.filter(c => c.id !== id);
            storageService.save(state);
        },

        // Suppliers
        getSuppliers: () => state.suppliers,
        getSupplierById: (id) => state.suppliers.find(s => s.id === id),
        addSupplier: (supplier) => {
            const newSupplier = { ...supplier, id: generateId(), createdAt: new Date().toISOString() };
            state.suppliers.push(newSupplier);
            storageService.save(state);
            return newSupplier;
        },
        updateSupplier: (id, updates) => {
            const index = state.suppliers.findIndex(s => s.id === id);
            if (index !== -1) {
                state.suppliers[index] = { 
                    ...state.suppliers[index], 
                    ...updates, 
                    updatedAt: new Date().toISOString() 
                };
                storageService.save(state);
                return state.suppliers[index];
            }
            return null;
        },
        deleteSupplier: (id) => {
            state.suppliers = state.suppliers.filter(s => s.id !== id);
            storageService.save(state);
        },

        // Items
        getItems: () => state.items,
        getItemById: (id) => state.items.find(i => i.id === id),
        addItem: (item) => {
            const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() };
            state.items.push(newItem);
            storageService.save(state);
            return newItem;
        },
        updateItem: (id, updates) => {
            const index = state.items.findIndex(i => i.id === id);
            if (index !== -1) {
                state.items[index] = { 
                    ...state.items[index], 
                    ...updates, 
                    updatedAt: new Date().toISOString() 
                };
                storageService.save(state);
                return state.items[index];
            }
            return null;
        },
        deleteItem: (id) => {
            state.items = state.items.filter(i => i.id !== id);
            storageService.save(state);
        },

        // Movements
        getMovements: () => state.movements,
        getMovementById: (id) => state.movements.find(m => m.id === id),
        addMovement: (movement) => {
            const newMovement = { 
                ...movement, 
                id: generateId(), 
                createdAt: new Date().toISOString() 
            };
            state.movements.push(newMovement);
            storageService.save(state);
            return newMovement;
        },
        updateMovement: (id, updates) => {
            const index = state.movements.findIndex(m => m.id === id);
            if (index !== -1) {
                state.movements[index] = { 
                    ...state.movements[index], 
                    ...updates, 
                    updatedAt: new Date().toISOString() 
                };
                storageService.save(state);
                return state.movements[index];
            }
            return null;
        },
        deleteMovement: (id) => {
            state.movements = state.movements.filter(m => m.id !== id);
            storageService.save(state);
        },

        // Calculations
        getCurrentStock: (itemId) => {
            return state.movements
                .filter(m => m.itemId === itemId)
                .reduce((stock, movement) => {
                    switch (movement.type) {
                        case 'IN':
                        case 'DON':
                            return stock + movement.qty;
                        case 'OUT':
                        case 'USE':
                        case 'LOST':
                            return stock - movement.qty;
                        default:
                            return stock;
                    }
                }, 0);
        },

        getTotalValue: () => {
            return state.items.reduce((total, item) => {
                const stock = repo.getCurrentStock(item.id);
                const price = item.defaultUnitPrice || 0;
                return total + (stock * price);
            }, 0);
        },

        getLowStockItems: () => {
            return state.items.filter(item => {
                const stock = repo.getCurrentStock(item.id);
                return stock < item.lowStockThreshold;
            }).sort((a, b) => {
                const stockA = repo.getCurrentStock(a.id);
                const stockB = repo.getCurrentStock(b.id);
                return stockA - stockB;
            });
        }
    };
})();

// UI Service (optimisé mobile)
const ui = (() => {
    let currentEditingId = null;

    const showToast = (message, type = 'success') => {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `toast ${type}`;
            // Force reflow
            toast.offsetHeight;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined || isNaN(value)) return '0€';
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '-';
        }
    };

    const getTypeLabel = (type) => {
        const labels = {
            'IN': 'Entrée',
            'OUT': 'Sortie', 
            'USE': 'Utilisation',
            'LOST': 'Perte',
            'DON': 'Don'
        };
        return labels[type] || type;
    };

    const getTypeBadge = (type) => {
        const colors = {
            'IN': '#28a745',
            'OUT': '#dc3545',
            'USE': '#6f42c1',
            'LOST': '#fd7e14',
            'DON': '#17a2b8'
        };
        return `<span class="type-badge" style="background: ${colors[type] || '#6c757d'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${getTypeLabel(type)}</span>`;
    };

    const closeSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sidebar) sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        document.body.style.overflow = '';
    };

    return {
        showToast,

        toggleSidebar: () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            
            if (!sidebar) {
                console.error('Sidebar not found');
                return;
            }
            
            const isOpen = sidebar.classList.contains('show');
            
            if (isOpen) {
                // Fermer
                sidebar.classList.remove('show');
                if (overlay) overlay.classList.remove('show');
                document.body.style.overflow = '';
            } else {
                // Ouvrir
                sidebar.classList.add('show');
                if (overlay) overlay.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        },

        switchPage: (pageId) => {
            // Fermer la sidebar sur mobile
            closeSidebar();
            
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });

            // Remove active from nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });

            // Show selected page
            const targetPage = document.getElementById(pageId);
            const targetNav = document.querySelector(`[data-page="${pageId}"]`);
            
            if (targetPage) {
                targetPage.classList.add('active');
                // Scroll to top
                window.scrollTo(0, 0);
            }
            if (targetNav) targetNav.classList.add('active');

            state.currentPage = pageId;

            // Refresh data for the page
            setTimeout(() => {
                switch (pageId) {
                    case 'dashboard':
                        ui.refreshDashboard();
                        break;
                    case 'movements':
                        ui.refreshMovements();
                        break;
                    case 'items':
                        ui.refreshItems();
                        break;
                    case 'categories':
                        ui.refreshCategories();
                        break;
                    case 'suppliers':
                        ui.refreshSuppliers();
                        break;
                    case 'settings':
                        // Settings page doesn't need refresh
                        break;
                }
            }, 100);
        },

        refreshAll: () => {
            ui.populateSelects();
            switch (state.currentPage) {
                case 'dashboard':
                    ui.refreshDashboard();
                    break;
                case 'movements':
                    ui.refreshMovements();
                    break;
                case 'items':
                    ui.refreshItems();
                    break;
                case 'categories':
                    ui.refreshCategories();
                    break;
                case 'suppliers':
                    ui.refreshSuppliers();
                    break;
            }
        },

        refreshDashboard: () => {
            // Update stats
            const totalItemsEl = document.getElementById('totalItems');
            const totalStockEl = document.getElementById('totalStock');
            const totalValueEl = document.getElementById('totalValue');
            const lowStockAlertsEl = document.getElementById('lowStockAlerts');

            if (totalItemsEl) totalItemsEl.textContent = state.items.length;
            
            const totalStock = state.items.reduce((sum, item) => sum + repo.getCurrentStock(item.id), 0);
            if (totalStockEl) totalStockEl.textContent = Math.round(totalStock);
            
            if (totalValueEl) totalValueEl.textContent = formatCurrency(repo.getTotalValue());
            
            const lowStockItems = repo.getLowStockItems();
            if (lowStockAlertsEl) lowStockAlertsEl.textContent = lowStockItems.length;

            // Update low stock table
            const tbody = document.getElementById('lowStockTable');
            if (tbody) {
                tbody.innerHTML = '';

                if (lowStockItems.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucun article en stock bas</td></tr>';
                } else {
                    lowStockItems.slice(0, 10).forEach(item => {
                        const category = repo.getCategoryById(item.categoryId);
                        const stock = repo.getCurrentStock(item.id);
                        const row = document.createElement('tr');
                        row.className = 'alert-row';
                        row.innerHTML = `
                            <td>${item.name}</td>
                            <td>${stock} ${item.unit}</td>
                            <td>${item.lowStockThreshold} ${item.unit}</td>
                        `;
                        tbody.appendChild(row);
                    });
                }
            }
        },

        refreshMovements: () => {
            const tbody = document.getElementById('movementsTable');
            if (!tbody) return;

            tbody.innerHTML = '';

            let movements = [...state.movements];

            // Apply filters
            if (state.filters.type) {
                movements = movements.filter(m => m.type === state.filters.type);
            }

            // Sort by date desc
            movements.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));

            // Pagination pour mobile
            const { page, limit } = state.pagination;
            const start = (page - 1) * limit;
            const paginatedMovements = movements.slice(start, start + limit);

            if (paginatedMovements.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun mouvement trouvé</td></tr>';
            } else {
                paginatedMovements.forEach(movement => {
                    const item = repo.getItemById(movement.itemId);
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="font-size: 12px;">${formatDate(movement.dateISO)}</td>
                        <td>${getTypeBadge(movement.type)}</td>
                        <td style="font-weight: 500;">${item ? item.name : 'Article supprimé'}</td>
                        <td>${movement.qty} ${movement.unit}</td>
                        <td class="actions">
                            <button class="btn btn-small btn-secondary" onclick="ui.editMovement('${movement.id}')">✏️</button>
                            <button class="btn btn-small btn-danger" onclick="ui.deleteMovement('${movement.id}')">🗑️</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }

            ui.updatePagination('movementsPagination', movements.length);
        },

        refreshItems: () => {
            const tbody = document.getElementById('itemsTable');
            if (!tbody) return;

            tbody.innerHTML = '';

            if (state.items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucun article trouvé</td></tr>';
            } else {
                state.items.forEach(item => {
                    const stock = repo.getCurrentStock(item.id);
                    const isLowStock = stock < item.lowStockThreshold;
                    const row = document.createElement('tr');
                    if (isLowStock) row.className = 'alert-row';
                    row.innerHTML = `
                        <td style="font-weight: 500;">${item.name}</td>
                        <td style="font-weight: 600; color: ${isLowStock ? '#DC3545' : '#28a745'};">${stock} ${item.unit}</td>
                        <td>${item.unit}</td>
                        <td class="actions">
                            <button class="btn btn-small btn-secondary" onclick="ui.editItem('${item.id}')">✏️</button>
                            <button class="btn btn-small btn-danger" onclick="ui.deleteItem('${item.id}')">🗑️</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        },

        refreshCategories: () => {
            const tbody = document.getElementById('categoriesTable');
            if (!tbody) return;

            tbody.innerHTML = '';

            if (state.categories.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2" class="empty-state">Aucune catégorie trouvée</td></tr>';
            } else {
                state.categories.forEach(category => {
                    const itemCount = state.items.filter(item => item.categoryId === category.id).length;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <div style="font-weight: 500;">${category.name}</div>
                            <div style="font-size: 12px; color: #666;">${itemCount} article(s)</div>
                        </td>
                        <td class="actions">
                            <button class="btn btn-small btn-secondary" onclick="ui.editCategory('${category.id}')">✏️</button>
                            <button class="btn btn-small btn-danger" onclick="ui.deleteCategory('${category.id}')">🗑️</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        },

        refreshSuppliers: () => {
            const tbody = document.getElementById('suppliersTable');
            if (!tbody) return;

            tbody.innerHTML = '';

            if (state.suppliers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucun fournisseur trouvé</td></tr>';
            } else {
                state.suppliers.forEach(supplier => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="font-weight: 500;">${supplier.name}</td>
                        <td style="font-size: 12px; color: #999;">${supplier.contact || '-'}</td>
                        <td class="actions">
                            <button class="btn btn-small btn-secondary" onclick="ui.editSupplier('${supplier.id}')">✏️</button>
                            <button class="btn btn-small btn-danger" onclick="ui.deleteSupplier('${supplier.id}')">🗑️</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        },

        updatePagination: (containerId, totalItems) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            const { page, limit } = state.pagination;
            const totalPages = Math.ceil(totalItems / limit);

            container.innerHTML = '';

            if (totalPages <= 1) return;

            // Previous button
            if (page > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.textContent = '← Précédent';
                prevBtn.onclick = () => {
                    state.pagination.page--;
                    ui.refreshMovements();
                };
                container.appendChild(prevBtn);
            }

            // Page indicator
            const pageInfo = document.createElement('span');
            pageInfo.textContent = `Page ${page}/${totalPages}`;
            container.appendChild(pageInfo);

            // Next button
            if (page < totalPages) {
                const nextBtn = document.createElement('button');
                nextBtn.textContent = 'Suivant →';
                nextBtn.onclick = () => {
                    state.pagination.page++;
                    ui.refreshMovements();
                };
                container.appendChild(nextBtn);
            }
        },

        populateSelects: () => {
            // Categories
            const categorySelects = [
                document.getElementById('itemCategory'),
                document.getElementById('filterCategory')
            ];
            
            categorySelects.forEach(select => {
                if (!select) return;
                const currentValue = select.value;
                const options = select.querySelectorAll('option:not([value=""])');
                options.forEach(option => option.remove());
                
                state.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
                
                select.value = currentValue;
            });

            // Suppliers
            const supplierSelects = [
                document.getElementById('movementSupplier'),
                document.getElementById('filterSupplier')
            ];
            
            supplierSelects.forEach(select => {
                if (!select) return;
                const currentValue = select.value;
                const options = select.querySelectorAll('option:not([value=""])');
                options.forEach(option => option.remove());
                
                state.suppliers.forEach(supplier => {
                    const option = document.createElement('option');
                    option.value = supplier.id;
                    option.textContent = supplier.name;
                    select.appendChild(option);
                });
                
                select.value = currentValue;
            });

            // Items
            const itemSelect = document.getElementById('movementItem');
            if (itemSelect) {
                const currentValue = itemSelect.value;
                const options = itemSelect.querySelectorAll('option:not([value=""])');
                options.forEach(option => option.remove());
                
                state.items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item.name;
                    itemSelect.appendChild(option);
                });
                
                itemSelect.value = currentValue;
            }
        },

        // Movement Modal Functions
        showMovementModal: (movementId = null) => {
            currentEditingId = movementId;
            const modal = document.getElementById('movementModal');
            if (!modal) return;
            
            const title = modal.querySelector('.modal-title');
            
            if (movementId) {
                const movement = repo.getMovementById(movementId);
                if (movement && title) {
                    title.textContent = 'Modifier le mouvement';
                    const dateEl = document.getElementById('movementDate');
                    if (dateEl) dateEl.value = movement.dateISO.slice(0, 16);
                    const typeEl = document.getElementById('movementType');
                    if (typeEl) typeEl.value = movement.type;
                    const itemEl = document.getElementById('movementItem');
                    if (itemEl) itemEl.value = movement.itemId;
                    const supplierEl = document.getElementById('movementSupplier');
                    if (supplierEl) supplierEl.value = movement.supplierId || '';
                    const qtyEl = document.getElementById('movementQty');
                    if (qtyEl) qtyEl.value = movement.qty;
                    const priceEl = document.getElementById('movementPrice');
                    if (priceEl) priceEl.value = movement.unitPrice || '';
                    const reasonEl = document.getElementById('movementReason');
                    if (reasonEl) reasonEl.value = movement.reason || '';
                }
            } else {
                if (title) title.textContent = 'Ajouter un mouvement';
                const form = document.getElementById('movementForm');
                if (form) form.reset();
                const dateEl = document.getElementById('movementDate');
                if (dateEl) dateEl.value = new Date().toISOString().slice(0, 16);
            }
            
            ui.populateSelects();
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        hideMovementModal: () => {
            const modal = document.getElementById('movementModal');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
            currentEditingId = null;
        },

        saveMovement: () => {
            const form = document.getElementById('movementForm');
            if (!form || !form.checkValidity()) {
                if (form) form.reportValidity();
                return;
            }

            const itemIdEl = document.getElementById('movementItem');
            const itemId = itemIdEl ? itemIdEl.value : '';
            const item = repo.getItemById(itemId);
            
            if (!item) {
                ui.showToast('Article non trouvé', 'error');
                return;
            }

            const dateEl = document.getElementById('movementDate');
            const typeEl = document.getElementById('movementType');
            const supplierEl = document.getElementById('movementSupplier');
            const qtyEl = document.getElementById('movementQty');
            const priceEl = document.getElementById('movementPrice');
            const reasonEl = document.getElementById('movementReason');

            const movement = {
                dateISO: (dateEl ? dateEl.value : new Date().toISOString().slice(0, 16)) + ':00',
                type: typeEl ? typeEl.value : 'IN',
                itemId: itemId,
                categoryId: item.categoryId,
                supplierId: (supplierEl && supplierEl.value) ? supplierEl.value : null,
                qty: parseFloat(qtyEl ? qtyEl.value : 0),
                unit: item.unit,
                unitPrice: parseFloat(priceEl ? priceEl.value : 0) || null,
                reason: reasonEl ? reasonEl.value : null
            };

            try {
                if (currentEditingId) {
                    repo.updateMovement(currentEditingId, movement);
                    ui.showToast('Mouvement modifié !');
                } else {
                    repo.addMovement(movement);
                    ui.showToast('Mouvement ajouté !');
                }
                
                ui.hideMovementModal();
                ui.refreshAll();
            } catch (error) {
                console.error('Save movement error:', error);
                ui.showToast('Erreur lors de la sauvegarde', 'error');
            }
        },

        editMovement: (id) => {
            ui.showMovementModal(id);
        },

        deleteMovement: (id) => {
            if (confirm('Supprimer ce mouvement ?')) {
                try {
                    repo.deleteMovement(id);
                    ui.showToast('Mouvement supprimé');
                    ui.refreshAll();
                } catch (error) {
                    ui.showToast('Erreur lors de la suppression', 'error');
                }
            }
        },

        // Item Modal Functions
        showItemModal: (itemId = null) => {
            currentEditingId = itemId;
            const modal = document.getElementById('itemModal');
            if (!modal) return;
            
            const title = modal.querySelector('.modal-title');
            
            if (itemId) {
                const item = repo.getItemById(itemId);
                if (item && title) {
                    title.textContent = 'Modifier l\'article';
                    const nameEl = document.getElementById('itemName');
                    if (nameEl) nameEl.value = item.name;
                    const categoryEl = document.getElementById('itemCategory');
                    if (categoryEl) categoryEl.value = item.categoryId;
                    const unitEl = document.getElementById('itemUnit');
                    if (unitEl) unitEl.value = item.unit;
                    const thresholdEl = document.getElementById('itemThreshold');
                    if (thresholdEl) thresholdEl.value = item.lowStockThreshold;
                    const priceEl = document.getElementById('itemPrice');
                    if (priceEl) priceEl.value = item.defaultUnitPrice || '';
                    const notesEl = document.getElementById('itemNotes');
                    if (notesEl) notesEl.value = item.notes || '';
                }
            } else {
                if (title) title.textContent = 'Ajouter un article';
                const form = document.getElementById('itemForm');
                if (form) form.reset();
            }
            
            ui.populateSelects();
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        hideItemModal: () => {
            const modal = document.getElementById('itemModal');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
            currentEditingId = null;
        },

        saveItem: () => {
            const form = document.getElementById('itemForm');
            if (!form || !form.checkValidity()) {
                if (form) form.reportValidity();
                return;
            }

            const nameEl = document.getElementById('itemName');
            const categoryEl = document.getElementById('itemCategory');
            const unitEl = document.getElementById('itemUnit');
            const thresholdEl = document.getElementById('itemThreshold');
            const priceEl = document.getElementById('itemPrice');
            const notesEl = document.getElementById('itemNotes');

            const item = {
                name: nameEl ? nameEl.value : '',
                categoryId: categoryEl ? categoryEl.value : '',
                unit: unitEl ? unitEl.value : '',
                lowStockThreshold: parseFloat(thresholdEl ? thresholdEl.value : 0),
                defaultUnitPrice: parseFloat(priceEl ? priceEl.value : 0) || null,
                notes: notesEl ? notesEl.value : null
            };

            try {
                if (currentEditingId) {
                    repo.updateItem(currentEditingId, item);
                    ui.showToast('Article modifié !');
                } else {
                    repo.addItem(item);
                    ui.showToast('Article ajouté !');
                }
                
                ui.hideItemModal();
                ui.refreshAll();
            } catch (error) {
                console.error('Save item error:', error);
                ui.showToast('Erreur lors de la sauvegarde', 'error');
            }
        },

        editItem: (id) => {
            ui.showItemModal(id);
        },

        deleteItem: (id) => {
            if (confirm('Supprimer cet article ?')) {
                try {
                    repo.deleteItem(id);
                    ui.showToast('Article supprimé');
                    ui.refreshAll();
                } catch (error) {
                    ui.showToast('Erreur lors de la suppression', 'error');
                }
            }
        },

        // Category Modal Functions
        showCategoryModal: (categoryId = null) => {
            currentEditingId = categoryId;
            const modal = document.getElementById('categoryModal');
            if (!modal) return;
            
            const title = modal.querySelector('.modal-title');
            
            if (categoryId) {
                const category = repo.getCategoryById(categoryId);
                if (category && title) {
                    title.textContent = 'Modifier la catégorie';
                    const nameEl = document.getElementById('categoryName');
                    if (nameEl) nameEl.value = category.name;
                }
            } else {
                if (title) title.textContent = 'Ajouter une catégorie';
                const form = document.getElementById('categoryForm');
                if (form) form.reset();
            }
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        hideCategoryModal: () => {
            const modal = document.getElementById('categoryModal');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
            currentEditingId = null;
        },

        saveCategory: () => {
            const form = document.getElementById('categoryForm');
            if (!form || !form.checkValidity()) {
                if (form) form.reportValidity();
                return;
            }

            const nameEl = document.getElementById('categoryName');
            const category = {
                name: nameEl ? nameEl.value : ''
            };

            try {
                if (currentEditingId) {
                    repo.updateCategory(currentEditingId, category);
                    ui.showToast('Catégorie modifiée !');
                } else {
                    repo.addCategory(category);
                    ui.showToast('Catégorie ajoutée !');
                }
                
                ui.hideCategoryModal();
                ui.refreshAll();
            } catch (error) {
                console.error('Save category error:', error);
                ui.showToast('Erreur lors de la sauvegarde', 'error');
            }
        },

        editCategory: (id) => {
            ui.showCategoryModal(id);
        },

        deleteCategory: (id) => {
            // Check if category is used
            const itemsUsingCategory = state.items.filter(item => item.categoryId === id);
            if (itemsUsingCategory.length > 0) {
                ui.showToast(`Impossible de supprimer: ${itemsUsingCategory.length} article(s) utilisent cette catégorie`, 'error');
                return;
            }

            if (confirm('Supprimer cette catégorie ?')) {
                try {
                    repo.deleteCategory(id);
                    ui.showToast('Catégorie supprimée');
                    ui.refreshAll();
                } catch (error) {
                    ui.showToast('Erreur lors de la suppression', 'error');
                }
            }
        },

        // Supplier Modal Functions
        showSupplierModal: (supplierId = null) => {
            currentEditingId = supplierId;
            const modal = document.getElementById('supplierModal');
            if (!modal) return;
            
            const title = modal.querySelector('.modal-title');
            
            if (supplierId) {
                const supplier = repo.getSupplierById(supplierId);
                if (supplier && title) {
                    title.textContent = 'Modifier le fournisseur';
                    const nameEl = document.getElementById('supplierName');
                    if (nameEl) nameEl.value = supplier.name;
                    const contactEl = document.getElementById('supplierContact');
                    if (contactEl) contactEl.value = supplier.contact || '';
                    const notesEl = document.getElementById('supplierNotes');
                    if (notesEl) notesEl.value = supplier.notes || '';
                }
            } else {
                if (title) title.textContent = 'Ajouter un fournisseur';
                const form = document.getElementById('supplierForm');
                if (form) form.reset();
            }
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        hideSupplierModal: () => {
            const modal = document.getElementById('supplierModal');
            if (modal) modal.classList.remove('active');
            document.body.style.overflow = '';
            currentEditingId = null;
        },

        saveSupplier: () => {
            const form = document.getElementById('supplierForm');
            if (!form || !form.checkValidity()) {
                if (form) form.reportValidity();
                return;
            }

            const nameEl = document.getElementById('supplierName');
            const contactEl = document.getElementById('supplierContact');
            const notesEl = document.getElementById('supplierNotes');

            const supplier = {
                name: nameEl ? nameEl.value : '',
                contact: contactEl ? contactEl.value : null,
                notes: notesEl ? notesEl.value : null
            };

            try {
                if (currentEditingId) {
                    repo.updateSupplier(currentEditingId, supplier);
                    ui.showToast('Fournisseur modifié !');
                } else {
                    repo.addSupplier(supplier);
                    ui.showToast('Fournisseur ajouté !');
                }
                
                ui.hideSupplierModal();
                ui.refreshAll();
            } catch (error) {
                console.error('Save supplier error:', error);
                ui.showToast('Erreur lors de la sauvegarde', 'error');
            }
        },

        editSupplier: (id) => {
            ui.showSupplierModal(id);
        },

        deleteSupplier: (id) => {
            if (confirm('Supprimer ce fournisseur ?')) {
                try {
                    repo.deleteSupplier(id);
                    ui.showToast('Fournisseur supprimé');
                    ui.refreshAll();
                } catch (error) {
                    ui.showToast('Erreur lors de la suppression', 'error');
                }
            }
        }
    };
})();

// Exports Service (simplifié pour mobile)
const exports = (() => {
    return {
        exportCSV: () => {
            ui.showToast('Utilisez "Exporter les données" dans les Paramètres', 'error');
        },
        exportPDF: () => {
            ui.showToast('Export PDF non disponible en mode mobile', 'error');
        }
    };
})();

// Seed Data Function
const seedData = () => {
    if (confirm('Charger les données de démonstration ? Cela remplacera toutes les données existantes.')) {
        try {
            // Clear existing data
            state.items = [];
            state.categories = [];
            state.suppliers = [];
            state.movements = [];

            // Categories
            const categories = [
                repo.addCategory({ name: 'Pellets paille' }),
                repo.addCategory({ name: 'Sacs PP' }),
                repo.addCategory({ name: 'Filtres' }),
                repo.addCategory({ name: 'Consommables' })
            ];

            // Suppliers
            const suppliers = [
                repo.addSupplier({ 
                    name: 'Normandie Pellets', 
                    contact: 'contact@normandie-pellets.fr',
                    notes: 'Fournisseur principal de pellets'
                }),
                repo.addSupplier({ 
                    name: 'MycoSupply', 
                    contact: '+33 1 23 45 67 89',
                    notes: 'Matériel et consommables'
                })
            ];

            // Items
            const items = [
                repo.addItem({
                    name: 'Pellets paille bio',
                    categoryId: categories[0].id,
                    unit: 'kg',
                    lowStockThreshold: 50,
                    defaultUnitPrice: 0.85,
                    notes: 'Substrat principal pour pleurotes'
                }),
                repo.addItem({
                    name: 'Sacs 3kg',
                    categoryId: categories[1].id,
                    unit: 'pcs',
                    lowStockThreshold: 100,
                    defaultUnitPrice: 0.12,
                    notes: 'Sacs polypropylène pour conditionnement'
                }),
                repo.addItem({
                    name: 'Filtres 0.22µm',
                    categoryId: categories[2].id,
                    unit: 'pcs',
                    lowStockThreshold: 50,
                    defaultUnitPrice: 1.20,
                    notes: 'Filtres stérilisants pour culture'
                }),
                repo.addItem({
                    name: 'Gants nitrile',
                    categoryId: categories[3].id,
                    unit: 'boîte',
                    lowStockThreshold: 5,
                    defaultUnitPrice: 8.50,
                    notes: 'Protection individuelle'
                })
            ];

            // Movements
            const now = new Date();
            const movements = [
                {
                    dateISO: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    type: 'IN',
                    itemId: items[0].id,
                    categoryId: categories[0].id,
                    supplierId: suppliers[0].id,
                    qty: 200,
                    unit: 'kg',
                    unitPrice: 0.85,
                    reason: 'Commande mensuelle'
                },
                {
                    dateISO: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    type: 'IN',
                    itemId: items[1].id,
                    categoryId: categories[1].id,
                    supplierId: suppliers[1].id,
                    qty: 500,
                    unit: 'pcs',
                    unitPrice: 0.12,
                    reason: 'Réapprovisionnement'
                },
                {
                    dateISO: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    type: 'USE',
                    itemId: items[0].id,
                    categoryId: categories[0].id,
                    supplierId: null,
                    qty: 45,
                    unit: 'kg',
                    unitPrice: null,
                    reason: 'Production pleurotes lot #123'
                },
                {
                    dateISO: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    type: 'OUT',
                    itemId: items[1].id,
                    categoryId: categories[1].id,
                    supplierId: null,
                    qty: 50,
                    unit: 'pcs',
                    unitPrice: null,
                    reason: 'Livraison client'
                },
                {
                    dateISO: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    type: 'LOST',
                    itemId: items[2].id,
                    categoryId: categories[2].id,
                    supplierId: null,
                    qty: 2,
                    unit: 'pcs',
                    unitPrice: null,
                    reason: 'Défaut qualité'
                }
            ];

            movements.forEach(movement => {
                repo.addMovement(movement);
            });

            ui.showToast('Données de démonstration chargées avec succès !');
            ui.refreshAll();
        } catch (error) {
            console.error('Seed data error:', error);
            ui.showToast('Erreur lors du chargement des données', 'error');
        }
    }
};

// Application Initialization
const initApp = () => {
    try {
        console.log('Initializing Fungistock V1...');
        
        // Load data
        const data = storageService.load();
        Object.assign(state, data);
        console.log('Data loaded:', state);

        // Setup filters
        const filterType = document.getElementById('filterType');
        if (filterType) {
            filterType.addEventListener('change', () => {
                state.filters.type = filterType.value;
                state.pagination.page = 1;
                ui.refreshMovements();
            });
        }

        // Close modals when clicking backdrop
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Initialize UI
        ui.populateSelects();
        ui.switchPage('dashboard'); // Start with dashboard
        
        console.log('Fungistock V1 mobile initialized successfully');
        ui.showToast('Application initialisée !');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        ui.showToast('Erreur lors de l\'initialisation', 'error');
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Global functions (exposed for onclick handlers)
window.ui = ui;
window.storageService = storageService;
window.exports = exports;
window.seedData = seedData;