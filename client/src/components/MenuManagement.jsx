import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConfirmationModal from './ConfirmationModal';
import '../styles/MenuManagement.css';
import '../styles/Toast.css';

const MenuManagement = ({ activeTab: propActiveTab }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [activeTab, setActiveTab] = useState(() => {
        return propActiveTab || localStorage.getItem('menuManagementTab') || 'items';
    }); // 'items' or 'categories'
    
    // Image upload states
    const [uploadedImage, setUploadedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    
    // Category management states
    const [categories, setCategories] = useState(['Chaat', 'Wraps', 'Drinks']);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [renamingCategory, setRenamingCategory] = useState('');
    const [movingItem, setMovingItem] = useState(null);
    const [targetCategory, setTargetCategory] = useState('');
    
    // Modal state
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: 'default',
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: null
    });

    // Toast notification state
    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success' // 'success', 'error', 'warning', 'info'
    });

    // Form state for adding/editing items
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        image: '',
        category: categories.length > 0 ? categories[0] : 'Chaat',
        description: '',
        otherOptions: [],
        extraOptions: {},
        noModal: false,
        active: true,
        includeSpice: false
    });

    // Show toast notification
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    const filterCategories = ['All', 'Available Only', 'Unavailable Only', ...categories];

    useEffect(() => {
        fetchMenuItems();
        loadCategories();
    }, []);

    useEffect(() => {
        if (propActiveTab) {
            setActiveTab(propActiveTab);
        }
    }, [propActiveTab]);

    useEffect(() => {
        if (!propActiveTab) {
            localStorage.setItem('menuManagementTab', activeTab);
        }
    }, [activeTab, propActiveTab]);

    // Prevent body scroll when modals are open
    useEffect(() => {
        if (showAddForm || movingItem) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showAddForm, movingItem]);

    const loadCategories = async () => {
        try {
            // Load categories from settings
            const settingsResponse = await axios.get('/api/settings');
            if (settingsResponse.data.categories && settingsResponse.data.categories.length > 0) {
                setCategories(settingsResponse.data.categories);
            } else {
                // Fallback: Extract unique categories from menu items
                const response = await axios.get('/api/menu?includeInactive=true');
                const items = response.data;
                const uniqueCategories = [...new Set(items.map(item => item.category))];
                if (uniqueCategories.length > 0) {
                    setCategories(uniqueCategories);
                    // Save to settings for future use
                    await axios.patch('/api/settings', { categories: uniqueCategories });
                }
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const fetchMenuItems = async () => {
        try {
            // Include inactive items for admin management
            const response = await axios.get('/api/menu?includeInactive=true');
            setMenuItems(response.data);
        } catch (error) {
            console.error('Error fetching menu items:', error);
            showToast('Failed to load menu items. Please refresh the page.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Image upload handling
    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'warning');
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image size should be less than 2MB', 'warning');
            return;
        }

        setIsUploadingImage(true);

        try {
            // Convert image to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setUploadedImage({ data: base64String });
                setImagePreview(base64String);
                setFormData(prev => ({ ...prev, image: base64String }));
                setIsUploadingImage(false);
            };
            reader.onerror = () => {
                showToast('Failed to read image file. Please try again.', 'error');
                setIsUploadingImage(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error processing image:', error);
            showToast('Failed to process image. Please try again.', 'error');
            setIsUploadingImage(false);
        }
    };

    const removeUploadedImage = () => {
        setUploadedImage(null);
        setImagePreview(null);
        setFormData(prev => ({ ...prev, image: '' }));
    };

    const openModal = (config) => {
        setModalState({
            isOpen: true,
            ...config
        });
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            type: 'default',
            title: '',
            message: '',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            onConfirm: null
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleOtherOptionChange = (index, value) => {
        setFormData(prev => ({
            ...prev,
            otherOptions: prev.otherOptions.map((option, i) => i === index ? value : option)
        }));
    };

    const addOtherOption = () => {
        setFormData(prev => ({
            ...prev,
            otherOptions: [...prev.otherOptions, '']
        }));
    };

    const removeOtherOption = (index) => {
        setFormData(prev => ({
            ...prev,
            otherOptions: prev.otherOptions.filter((_, i) => i !== index)
        }));
    };

    const handleExtraOptionChange = (option, price) => {
        setFormData(prev => ({
            ...prev,
            extraOptions: {
                ...prev.extraOptions,
                [option]: parseFloat(price) || 0
            }
        }));
    };

    const addExtraOption = () => {
        const newOption = `New Option ${Object.keys(formData.extraOptions).length + 1}`;
        setFormData(prev => ({
            ...prev,
            extraOptions: {
                ...prev.extraOptions,
                [newOption]: 0
            }
        }));
    };

    const removeExtraOption = (option) => {
        setFormData(prev => {
            const updated = { ...prev.extraOptions };
            delete updated[option];
            return {
                ...prev,
                extraOptions: updated
            };
        });
    };

    const resetForm = (isCancel = false) => {
        setFormData({
            name: '',
            price: '',
            image: '',
            category: categories.length > 0 ? categories[0] : 'Chaat',
            description: '',
            otherOptions: [],
            extraOptions: {},
            noModal: false,
            active: true,
            includeSpice: false
        });
        setEditingItem(null);
        setShowAddForm(false);
        setUploadedImage(null);
        setImagePreview(null);
    };

    // Opens the add form with a proper reset using the currently loaded categories
    const handleAddNew = () => {
        setFormData({
            name: '',
            price: '',
            image: '',
            category: categories.length > 0 ? categories[0] : 'Chaat',
            description: '',
            otherOptions: [],
            extraOptions: {},
            noModal: false,
            active: true,
            includeSpice: false
        });
        setEditingItem(null);
        setUploadedImage(null);
        setImagePreview(null);
        setShowAddForm(true);
    };

    const handleEdit = (item) => {
        const standardSpiceLevels = ['Mild', 'Medium', 'Spicy'];
        const existingOptions = item.options || [];
        
        const otherOptions = existingOptions.filter(opt => 
            !standardSpiceLevels.includes(opt) && 
            !opt.match(/\(\+\$\d+(\.\d+)?\)$/)
        );

        const hasSpice = existingOptions.some(opt => standardSpiceLevels.includes(opt));

        setFormData({
            name: item.name,
            price: item.price.toString(),
            image: item.image,
            category: item.category,
            description: item.description,
            otherOptions: otherOptions,
            extraOptions: item.extraOptions || {},
            noModal: item.noModal || false,
            active: item.active !== undefined ? item.active : true,
            includeSpice: hasSpice
        });
        
        // Set preview for existing image
        if (item.image) {
            setImagePreview(item.image);
        }
        
        setEditingItem(item);
        setShowAddForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.price || !formData.category) {
            showToast('Please fill in all required fields (Name, Price, Category).', 'warning');
            return;
        }

        let standardOptions = [];
        
        // Add spice levels only if explicitly enabled via toggle
        if (formData.includeSpice) {
            standardOptions = ['Mild', 'Medium', 'Spicy'];
        }
        
        // Create premium options array for the final options list
        const premiumOptionsForArray = Object.entries(formData.extraOptions).map(([option, price]) => {
            return `${option} (+$${price})`;
        });

        const combinedOptions = [
            ...standardOptions,
            ...formData.otherOptions.filter(opt => opt.trim() !== ''),
            ...premiumOptionsForArray
        ];

        const itemData = {
            ...formData,
            price: parseFloat(formData.price),
            options: combinedOptions,
            // Use default image if no image is provided
            image: formData.image || '/images/default-food.jpg'
        };

        delete itemData.otherOptions;
        delete itemData.includeSpice;

        try {
            if (editingItem) {
                const response = await axios.put(`/api/menu/${editingItem.id}`, itemData);
                setMenuItems(prev => prev.map(item => 
                    item.id === editingItem.id ? { ...item, ...itemData } : item
                ));
                showToast('Menu item updated successfully!', 'success');
            } else {
                const response = await axios.post('/api/menu', itemData);
                setMenuItems(prev => [...prev, response.data]);
                showToast('Menu item added successfully!', 'success');
            }
            
            // Clear uploaded image state after successful save
            setUploadedImage(null);
            resetForm(false);
        } catch (error) {
            console.error('Error saving menu item:', error);
            showToast('Failed to save menu item. Please try again.', 'error');
        }
    };

    const handleDelete = (item) => {
        openModal({
            type: 'danger',
            title: 'Delete Menu Item',
            message: `Are you sure you want to delete "${item.name}"? This will also delete its image and cannot be undone.`,
            confirmText: 'Delete Item',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/menu/${item.id}`);
                    setMenuItems(prev => prev.filter(menuItem => menuItem.id !== item.id));
                    showToast('Menu item and image deleted successfully!', 'success');
                } catch (error) {
                    console.error('Error deleting menu item:', error);
                    showToast('Failed to delete menu item. Please try again.', 'error');
                }
            }
        });
    };

    // Replace the toggleItemStatus function in MenuManagement.jsx
    const toggleItemStatus = async (item) => {
        const newStatus = !item.active;
        
        try {
            const response = await axios.put(`/api/menu/${item.id}`, {
                ...item,
                active: newStatus
            });
            
            setMenuItems(prev => prev.map(menuItem => 
                menuItem.id === item.id ? { ...menuItem, active: newStatus } : menuItem
            ));
            
            // Updated success message
            showToast(`Menu item is now ${newStatus ? 'available' : 'unavailable'} for customers!`, 'info');
        } catch (error) {
            console.error('Error updating item availability:', error);
            showToast('Failed to update item availability. Please try again.', 'error');
        }
    };

    // Update the filteredItems logic
    const filteredItems = (() => {
        let items = menuItems;
        
        // Filter by availability first
        if (selectedCategory === 'Available Only') {
            items = items.filter(item => item.active !== false);
        } else if (selectedCategory === 'Unavailable Only') {
            items = items.filter(item => item.active === false);
        } else if (selectedCategory !== 'All') {
            // Filter by category
            items = items.filter(item => item.category === selectedCategory);
        }
        
        return items;
    })();

    // Category Management Functions
    const handleAddCategory = () => {
        const trimmedName = newCategoryName.trim();
        
        if (!trimmedName) {
            showToast('Please enter a category name', 'warning');
            return;
        }
        
        if (categories.includes(trimmedName)) {
            showToast('This category already exists', 'warning');
            return;
        }
        
        openModal({
            type: 'success',
            title: 'Add New Category',
            message: `Are you sure you want to add the category "${trimmedName}"?`,
            confirmText: 'Add Category',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const newCategories = [...categories, trimmedName];
                setCategories(newCategories);
                setNewCategoryName('');
                
                try {
                    await axios.patch('/api/settings', { categories: newCategories });
                    showToast(`Category "${trimmedName}" added successfully!`, 'success');
                } catch (error) {
                    console.error('Error saving category:', error);
                    showToast('Category added locally but failed to save. Please try again.', 'warning');
                }
            }
        });
    };

    const handleRenameCategory = (oldName) => {
        setEditingCategory(oldName);
        setRenamingCategory(oldName);
    };

    const confirmRenameCategory = async () => {
        const trimmedName = renamingCategory.trim();
        
        if (!trimmedName) {
            showToast('Please enter a category name', 'warning');
            return;
        }
        
        if (categories.includes(trimmedName) && trimmedName !== editingCategory) {
            showToast('This category name already exists', 'warning');
            return;
        }

        openModal({
            type: 'warning',
            title: 'Rename Category',
            message: `Rename "${editingCategory}" to "${trimmedName}"? All items in this category will be updated.`,
            confirmText: 'Rename',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    // Update all items in this category
                    const itemsToUpdate = menuItems.filter(item => item.category === editingCategory);
                    
                    for (const item of itemsToUpdate) {
                        await axios.put(`/api/menu/${item.id}`, {
                            ...item,
                            category: trimmedName
                        });
                    }
                    
                    // Update categories list
                    const updatedCategories = categories.map(cat => cat === editingCategory ? trimmedName : cat);
                    setCategories(updatedCategories);
                    
                    // Save updated categories to backend
                    await axios.patch('/api/settings', { categories: updatedCategories });
                    
                    // Update local menu items
                    setMenuItems(prev => prev.map(item => 
                        item.category === editingCategory ? { ...item, category: trimmedName } : item
                    ));
                    
                    setEditingCategory(null);
                    setRenamingCategory('');
                    showToast(`Category renamed successfully!`, 'success');
                } catch (error) {
                    console.error('Error renaming category:', error);
                    showToast('Failed to rename category. Please try again.', 'error');
                }
            }
        });
    };

    const handleDeleteCategory = (categoryName) => {
        const itemsInCategory = menuItems.filter(item => item.category === categoryName);
        
        if (itemsInCategory.length > 0) {
            openModal({
                type: 'danger',
                title: 'Cannot Delete Category',
                message: `This category contains ${itemsInCategory.length} item(s). Please move or delete all items first before deleting the category.`,
                confirmText: 'OK',
                cancelText: null,
                onConfirm: () => {}
            });
            return;
        }

        openModal({
            type: 'danger',
            title: 'Delete Category',
            message: `Are you sure you want to delete the category "${categoryName}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const updatedCategories = categories.filter(cat => cat !== categoryName);
                setCategories(updatedCategories);
                
                try {
                    await axios.patch('/api/settings', { categories: updatedCategories });
                    showToast(`Category "${categoryName}" deleted successfully!`, 'success');
                } catch (error) {
                    console.error('Error deleting category:', error);
                    showToast('Category deleted locally but failed to save. Please try again.', 'warning');
                }
            }
        });
    };

    const handleMoveCategoryUp = async (categoryName) => {
        const index = categories.indexOf(categoryName);
        if (index <= 0) return; // Already at the top
        
        const newCategories = [...categories];
        [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
        
        setCategories(newCategories);
        
        try {
            await axios.patch('/api/settings', { categories: newCategories });
            showToast('Category order updated', 'success');
        } catch (error) {
            console.error('Error updating category order:', error);
            showToast('Failed to save category order', 'error');
        }
    };

    const handleMoveCategoryDown = async (categoryName) => {
        const index = categories.indexOf(categoryName);
        if (index >= categories.length - 1) return; // Already at the bottom
        
        const newCategories = [...categories];
        [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
        
        setCategories(newCategories);
        
        try {
            await axios.patch('/api/settings', { categories: newCategories });
            showToast('Category order updated', 'success');
        } catch (error) {
            console.error('Error updating category order:', error);
            showToast('Failed to save category order', 'error');
        }
    };

    const handleMoveItem = (item) => {
        setMovingItem(item);
        setTargetCategory(item.category);
    };

    const handleMoveItemUp = async (item, categoryItems) => {
        const currentIndex = categoryItems.findIndex(i => i.id === item.id);
        if (currentIndex <= 0) return; // Already at top
        
        const itemAbove = categoryItems[currentIndex - 1];
        
        try {
            // Swap order values
            await axios.put(`/api/menu/${item.id}`, {
                ...item,
                order: currentIndex - 1
            });
            
            await axios.put(`/api/menu/${itemAbove.id}`, {
                ...itemAbove,
                order: currentIndex
            });
            
            // Update local state
            setMenuItems(prev => prev.map(menuItem => {
                if (menuItem.id === item.id) return { ...menuItem, order: currentIndex - 1 };
                if (menuItem.id === itemAbove.id) return { ...menuItem, order: currentIndex };
                return menuItem;
            }));
            
            showToast('Item order updated', 'success');
        } catch (error) {
            console.error('Error updating item order:', error);
            showToast('Failed to update item order', 'error');
        }
    };

    const handleMoveItemDown = async (item, categoryItems) => {
        const currentIndex = categoryItems.findIndex(i => i.id === item.id);
        if (currentIndex >= categoryItems.length - 1) return; // Already at bottom
        
        const itemBelow = categoryItems[currentIndex + 1];
        
        try {
            // Swap order values
            await axios.put(`/api/menu/${item.id}`, {
                ...item,
                order: currentIndex + 1
            });
            
            await axios.put(`/api/menu/${itemBelow.id}`, {
                ...itemBelow,
                order: currentIndex
            });
            
            // Update local state
            setMenuItems(prev => prev.map(menuItem => {
                if (menuItem.id === item.id) return { ...menuItem, order: currentIndex + 1 };
                if (menuItem.id === itemBelow.id) return { ...menuItem, order: currentIndex };
                return menuItem;
            }));
            
            showToast('Item order updated', 'success');
        } catch (error) {
            console.error('Error updating item order:', error);
            showToast('Failed to update item order', 'error');
        }
    };

    const confirmMoveItem = async () => {
        if (!movingItem || !targetCategory) return;
        
        if (targetCategory === movingItem.category) {
            showToast('Item is already in this category', 'info');
            return;
        }

        try {
            await axios.put(`/api/menu/${movingItem.id}`, {
                ...movingItem,
                category: targetCategory
            });
            
            setMenuItems(prev => prev.map(item => 
                item.id === movingItem.id ? { ...item, category: targetCategory } : item
            ));
            
            setMovingItem(null);
            setTargetCategory('');
            showToast(`"${movingItem.name}" moved to ${targetCategory} successfully!`, 'success');
        } catch (error) {
            console.error('Error moving item:', error);
            showToast('Failed to move item. Please try again.', 'error');
        }
    };

    const handleDeleteItemFromCategory = (item) => {
        openModal({
            type: 'danger',
            title: 'Delete Item',
            message: `Are you sure you want to delete "${item.name}" from ${item.category}? This will permanently delete the item.`,
            confirmText: 'Delete Item',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/menu/${item.id}`);
                    setMenuItems(prev => prev.filter(menuItem => menuItem.id !== item.id));
                    showToast('Item deleted successfully!', 'success');
                } catch (error) {
                    console.error('Error deleting item:', error);
                    showToast('Failed to delete item. Please try again.', 'error');
                }
            }
        });
    };

    if (isLoading) {
        return (
            <div className="menu-management-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading menu items...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="menu-management-container">
            <div className="menu-management-header">
                <h2>{activeTab === 'items' ? '🍽️ Menu Items' : '🗂️ Category Management'}</h2>
                <p className="menu-subtitle">
                    {activeTab === 'items' 
                        ? 'Add, edit, or remove menu items and manage their availability' 
                        : 'Add, rename, or delete categories. Organize items between categories.'}
                </p>
                
                {/* Tab Navigation - Only show if not controlled by props */}
                {!propActiveTab && (
                    <div className="tab-navigation">
                        <button 
                            className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`}
                            onClick={() => setActiveTab('items')}
                        >
                            📋 Menu Items
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                            onClick={() => setActiveTab('categories')}
                        >
                            🗂️ Categories
                        </button>
                    </div>
                )}

                {/* Items Tab Actions */}
                {activeTab === 'items' && (
                    <div className="menu-management-actions">
                        <button 
                            className="add-item-btn"
                            onClick={handleAddNew}
                        >
                            <span className="btn-icon">➕</span>
                            Add New Item
                        </button>
                        
                        <select 
                            className="category-filter"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {filterCategories.map(category => (
                                <option key={category} value={category}>
                                    {category} {category === 'All' ? 'Items' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Categories Tab Content */}
            {activeTab === 'categories' && (
                <div className="categories-management-section">
                    {/* Add New Category */}
                    <div className="add-category-section">
                        <div className="add-category-card">
                            <h3>➕ Add New Category</h3>
                            <div className="add-category-form">
                                <input
                                    type="text"
                                    className="category-input"
                                    placeholder="Enter category name (e.g., Desserts, Appetizers)"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                                />
                                <button 
                                    className="add-category-btn"
                                    onClick={handleAddCategory}
                                >
                                    Add Category
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Existing Categories */}
                    <div className="categories-grid">
                        {categories.map(category => {
                            const categoryItems = menuItems
                                .filter(item => item.category === category)
                                .sort((a, b) => (a.order || 0) - (b.order || 0));
                            const availableItems = categoryItems.filter(item => item.active !== false);
                            const unavailableItems = categoryItems.filter(item => item.active === false);

                            return (
                                <div key={category} className="category-card">
                                    <div className="category-card-header">
                                        <div className="category-count-badge">
                                            {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                                        </div>
                                        
                                        {editingCategory === category ? (
                                            <div className="category-title-section">
                                                <div className="rename-input-group">
                                                    <input
                                                        type="text"
                                                        className="rename-input"
                                                        value={renamingCategory}
                                                        onChange={(e) => setRenamingCategory(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && confirmRenameCategory()}
                                                        autoFocus
                                                    />
                                                    <button 
                                                        className="confirm-rename-btn"
                                                        onClick={confirmRenameCategory}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button 
                                                        className="cancel-rename-btn"
                                                        onClick={() => {
                                                            setEditingCategory(null);
                                                            setRenamingCategory('');
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <h3 className="category-name">{category}</h3>
                                        )}
                                        
                                        {editingCategory !== category && (
                                            <div className="category-actions">
                                                <button 
                                                    className="move-category-btn"
                                                    onClick={() => handleMoveCategoryUp(category)}
                                                    disabled={categories.indexOf(category) === 0}
                                                    title="Move category up"
                                                >
                                                    ⬆️
                                                </button>
                                                <button 
                                                    className="move-category-btn"
                                                    onClick={() => handleMoveCategoryDown(category)}
                                                    disabled={categories.indexOf(category) === categories.length - 1}
                                                    title="Move category down"
                                                >
                                                    ⬇️
                                                </button>
                                                <button 
                                                    className="rename-category-btn"
                                                    onClick={() => handleRenameCategory(category)}
                                                    title="Rename category"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    className="delete-category-btn"
                                                    onClick={() => handleDeleteCategory(category)}
                                                    title="Delete category"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="category-stats">
                                        <div className="stat-item available">
                                            <span className="stat-icon">✅</span>
                                            <span>{availableItems.length} Available</span>
                                        </div>
                                        <div className="stat-item unavailable">
                                            <span className="stat-icon">❌</span>
                                            <span>{unavailableItems.length} Unavailable</span>
                                        </div>
                                    </div>

                                    {/* Add Item to Category Button */}
                                    <button 
                                        className="add-item-to-category-btn"
                                        onClick={() => {
                                            setFormData({
                                                ...formData,
                                                category: category,
                                                name: '',
                                                price: '',
                                                description: '',
                                                otherOptions: [],
                                                extraOptions: {},
                                                noModal: false,
                                                active: true,
                                                includeSpice: false
                                            });
                                            setImagePreview(null);
                                            setUploadedImage(null);
                                            setShowAddForm(true);
                                        }}
                                        title={`Add new item to ${category}`}
                                    >
                                        ➕ Add Item to {category}
                                    </button>

                                    {/* Items in Category */}
                                    <div className="category-items-list">
                                        {categoryItems.length === 0 ? (
                                            <div className="empty-category">
                                                <p>No items in this category</p>
                                            </div>
                                        ) : (
                                            categoryItems.map(item => (
                                                <div 
                                                    key={item.id} 
                                                    className={`category-item ${!item.active ? 'inactive-item' : ''}`}
                                                >
                                                    <div className="item-info">
                                                        <img 
                                                            src={item.image || '/images/default-food.jpg'} 
                                                            alt={item.name}
                                                            className="item-thumbnail"
                                                        />
                                                        <div className="item-details">
                                                            <span className="item-name-mini">{item.name} - </span>
                                                            <span className="item-price-mini">${item.price}</span>
                                                        </div>
                                                        <button
                                                            className={`status-toggle-mini-btn ${item.active ? 'active-mini' : 'inactive-mini'}`}
                                                            onClick={() => toggleItemStatus(item)}
                                                            title={item.active ? 'Click to make unavailable' : 'Click to make available'}
                                                        >
                                                            {item.active ? '✓' : '✕'}
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="item-mini-actions">
                                                        <button 
                                                            className="move-order-btn"
                                                            onClick={() => handleMoveItemUp(item, categoryItems)}
                                                            disabled={categoryItems.indexOf(item) === 0}
                                                            title="Move item up"
                                                        >
                                                            ⬆️
                                                        </button>
                                                        <button 
                                                            className="move-order-btn"
                                                            onClick={() => handleMoveItemDown(item, categoryItems)}
                                                            disabled={categoryItems.indexOf(item) === categoryItems.length - 1}
                                                            title="Move item down"
                                                        >
                                                            ⬇️
                                                        </button>
                                                        <button 
                                                            className="move-item-btn"
                                                            onClick={() => handleMoveItem(item)}
                                                            title="Move to another category"
                                                        >
                                                            ↔️
                                                        </button>
                                                        <button 
                                                            className="edit-item-mini-btn"
                                                            onClick={() => handleEdit(item)}
                                                            title="Edit item"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button 
                                                            className="delete-item-mini-btn"
                                                            onClick={() => handleDeleteItemFromCategory(item)}
                                                            title="Delete item"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Move Item Modal */}
                    {movingItem && (
                        <div className="move-item-overlay">
                            <div className="move-item-modal">
                                <div className="move-modal-header">
                                    <h3>Move Item to Category</h3>
                                    <button 
                                        className="close-move-modal"
                                        onClick={() => {
                                            setMovingItem(null);
                                            setTargetCategory('');
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <div className="move-modal-content">
                                    <div className="moving-item-preview">
                                        <img 
                                            src={movingItem.image || '/images/default-food.jpg'} 
                                            alt={movingItem.name}
                                        />
                                        <div>
                                            <h4>{movingItem.name}</h4>
                                            <p>Current category: <strong>{movingItem.category}</strong></p>
                                        </div>
                                    </div>

                                    <div className="target-category-selector">
                                        <label>Move to:</label>
                                        <select
                                            className="target-category-select"
                                            value={targetCategory}
                                            onChange={(e) => setTargetCategory(e.target.value)}
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="move-modal-actions">
                                        <button 
                                            className="cancel-move-btn"
                                            onClick={() => {
                                                setMovingItem(null);
                                                setTargetCategory('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            className="confirm-move-btn"
                                            onClick={confirmMoveItem}
                                        >
                                            Move Item
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="item-form-overlay">
                    <div className="item-form-container">
                        <div className="form-header">
                            <h2>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
                            <button className="form-close-btn" onClick={() => resetForm(true)}>×</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="item-form">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="name">Item Name *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Pani Puri"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="price">Price ($) *</label>
                                    <input
                                        type="number"
                                        id="price"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 8.99"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="category">Category *</label>
                                    <select
                                        id="category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Image Upload Section */}
                                <div className="form-group">
                                    <label htmlFor="image">Item Image</label>
                                    <div className="image-upload-container">
                                        <input
                                            type="file"
                                            id="image"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="image-upload-input"
                                        />
                                        
                                        {isUploadingImage && (
                                            <div className="upload-progress">
                                                <div className="upload-spinner"></div>
                                                <span>Uploading image...</span>
                                            </div>
                                        )}
                                        
                                        {imagePreview && (
                                            <div className="image-preview-container">
                                                <img 
                                                    src={imagePreview} 
                                                    alt="Preview" 
                                                    className="image-preview"
                                                />
                                                <button
                                                    type="button"
                                                    className="remove-image-btn"
                                                    onClick={removeUploadedImage}
                                                    title="Remove image"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                        
                                        <div className="image-upload-info">
                                            <p>Upload a high-quality image (max 2MB)</p>
                                            <p>Supported formats: JPG, PNG, GIF</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Describe the dish..."
                                    rows="3"
                                />
                            </div>

                            {/* Spice Level Toggle */}
                            <div className="form-group full-width">
                                <div className="spice-level-info-box">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h4 style={{ margin: 0 }}>🌶️ Spice Level Slider</h4>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                                                {formData.includeSpice
                                                    ? 'Customer will see Mild / Medium / Spicy options'
                                                    : 'No spice slider — customer will not be asked about spice'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, includeSpice: !prev.includeSpice }))}
                                            style={{
                                                padding: '8px 18px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.9rem',
                                                background: formData.includeSpice ? '#e53e3e' : '#48bb78',
                                                color: '#fff',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {formData.includeSpice ? '✕ Remove Spice Slider' : '+ Add Spice Slider'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Available for Customers toggle */}
                            <div className="form-group full-width">
                                <div className="spice-level-info-box">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h4 style={{ margin: 0 }}>✅ Available for Customers</h4>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                                                {formData.active
                                                    ? 'Item is visible and orderable in the customer menu'
                                                    : 'Item is hidden from customers (not deleted)'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                                            style={{
                                                padding: '8px 18px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.9rem',
                                                background: formData.active ? '#e53e3e' : '#48bb78',
                                                color: '#fff',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {formData.active ? '✕ Make Unavailable' : '+ Make Available'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* No Options Modal toggle */}
                            <div className="form-group full-width">
                                <div className="spice-level-info-box">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h4 style={{ margin: 0 }}>🚫 No Options Modal</h4>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                                                {formData.noModal
                                                    ? 'Item adds directly to cart — no options popup shown'
                                                    : 'Item will show an options popup before adding to cart'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, noModal: !prev.noModal }))}
                                            style={{
                                                padding: '8px 18px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.9rem',
                                                background: formData.noModal ? '#e53e3e' : '#48bb78',
                                                color: '#fff',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {formData.noModal ? '✕ Disable No-Modal' : '+ Enable No-Modal'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label>Additional Customization Options</label>
                                <div className="other-options-info">
                                    <p>Add other customization options (No Onions, No Cilantro, etc.)</p>
                                </div>
                                <div className="options-container other-options">
                                    {formData.otherOptions.map((option, index) => (
                                        <div key={index} className="option-input-group other-option-group">
                                            <span className="option-icon">⚙️</span>
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleOtherOptionChange(index, e.target.value)}
                                                placeholder="e.g., No Onions"
                                            />
                                            <button
                                                type="button"
                                                className="remove-option-btn"
                                                onClick={() => removeOtherOption(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="add-option-btn other-add-btn"
                                        onClick={addOtherOption}
                                    >
                                        ⚙️ Add Customization Option
                                    </button>
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label>Premium Options (with extra cost)</label>
                                <div className="premium-options-info">
                                    <p>Add premium options that cost extra (Extra Meat, Extra Cheese, etc.)</p>
                                </div>
                                <div className="extra-options-container">
                                    {Object.entries(formData.extraOptions).map(([option, price], index) => (
                                        <div key={index} className="extra-option-input-group">
                                            <span className="premium-icon">💰</span>
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => {
                                                    const newOption = e.target.value;
                                                    setFormData(prev => {
                                                        const extraOptions = { ...prev.extraOptions };
                                                        delete extraOptions[option];
                                                        if (newOption.trim()) {
                                                            extraOptions[newOption] = price;
                                                        }
                                                        return {
                                                            ...prev,
                                                            extraOptions
                                                        };
                                                    });
                                                }}
                                                placeholder="e.g., Extra Meat"
                                            />
                                            <input
                                                type="number"
                                                value={price}
                                                onChange={(e) => {
                                                    const newPrice = parseFloat(e.target.value) || 0;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        extraOptions: {
                                                            ...prev.extraOptions,
                                                            [option]: newPrice
                                                        }
                                                    }));
                                                }}
                                                placeholder="Extra cost"
                                                step="0.5"
                                                min="0"
                                            />
                                            <button
                                                type="button"
                                                className="remove-option-btn"
                                                onClick={() => removeExtraOption(option)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="add-option-btn premium-add-btn"
                                        onClick={() => {
                                            const newKey = ``;
                                            setFormData(prev => ({
                                                ...prev,
                                                extraOptions: {
                                                    ...prev.extraOptions,
                                                    [newKey]: 0
                                                }
                                            }));
                                        }}
                                    >
                                        💰 Add Premium Option
                                    </button>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => resetForm(true)}>
                                    Cancel
                                </button>
                                <button type="submit" className="save-btn" disabled={isUploadingImage}>
                                    {editingItem ? 'Update Item' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Menu Items Grid - Only show on items tab */}
            {activeTab === 'items' && (
                <div className="menu-items-grid">
                {filteredItems.length === 0 ? (
                    <div className="empty-menu">
                        <p>No menu items found in this category.</p>
                        <button 
                            className="add-first-item-btn"
                            onClick={handleAddNew}
                        >
                            Add Your First Item
                        </button>
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className={`menu-item-card ${!item.active ? 'inactive' : ''}`}>
                            <div className="item-image">
                                {!item.active && <div className="inactive-overlay"></div>}
                                {item.image && item.image !== '/images/default-food.jpg' ? (
                                    <img src={item.image} alt={item.name} />
                                ) : (
                                    <div className="placeholder-image">
                                        <img 
                                            src="/images/default-food.jpg" 
                                            alt="Default food image" 
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                opacity: '0.7'
                                            }}
                                        />
                                        <div className="placeholder-overlay">
                                            <span>📷</span>
                                            <p>Default Image</p>
                                        </div>
                                    </div>
                                )}
                                <div className="item-category-badge">{item.category}</div>
                            </div>
                            
                            <div className="menu-item-details">
                                <h3 className="item-name">
                                    {item.name} 
                                    <span style={{ 
                                        color: item.active ? '#28a745' : '#dc3545', 
                                        fontSize: '0.8rem',
                                        marginLeft: '8px'
                                    }}>
                                        {item.active ? '(Available)' : '(Unavailable)'}
                                    </span>
                                </h3>
                                <p className="item-description">{item.description}</p>
                                <div className="item-price">${item.price}</div>
                                
                                {item.options && item.options.length > 0 && (
                                    <div className="item-options">
                                        <strong>Options:</strong> {item.options.join(', ')}
                                    </div>
                                )}
                                
                                {item.extraOptions && Object.keys(item.extraOptions).length > 0 && (
                                    <div className="item-extra-options">
                                        <strong>Premium:</strong> {
                                            Object.entries(item.extraOptions).map(([opt, price]) => 
                                                `${opt} (+$${price})`
                                            ).join(', ')
                                        }
                                    </div>
                                )}

                                {/* Quick Availability Toggle */}
                                <button
                                    className={`status-toggle-btn ${item.active ? 'deactivate' : 'activate'}`}
                                    onClick={() => toggleItemStatus(item)}
                                    title={item.active ? 'Click to make unavailable' : 'Click to make available'}
                                >
                                    {item.active ? '🔴 Make Unavailable' : '🟢 Make Available'}
                                </button>
                            </div>
                            
                            <div className="item-actions">
                                <button 
                                    className="edit-btn"
                                    onClick={() => handleEdit(item)}
                                >
                                    ✏️ Edit
                                </button>
                                <button 
                                    className="delete-btn"
                                    onClick={() => handleDelete(item)}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            )}

            {/* Toast Notification */}
            {toast.show && (
                <div className={`toast-notification toast-${toast.type}`}>
                    <div className="toast-icon">
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'error' && '✕'}
                        {toast.type === 'warning' && '⚠'}
                        {toast.type === 'info' && 'ℹ'}
                    </div>
                    <div className="toast-message">{toast.message}</div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                message={modalState.message}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
                type={modalState.type}
            />
        </div>
    );
};

export default MenuManagement;