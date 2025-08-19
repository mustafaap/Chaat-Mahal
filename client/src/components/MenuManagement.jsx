import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConfirmationModal from './ConfirmationModal';
import '../styles/MenuManagement.css';

const MenuManagement = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    
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

    // Form state for adding/editing items
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        image: '',
        category: 'Chaat',
        description: '',
        otherOptions: [], // Only other options like No Onions, No Cilantro
        extraOptions: {}
    });

    const categories = ['All', 'Chaat', 'Wraps', 'Drinks'];

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const fetchMenuItems = async () => {
        try {
            const response = await axios.get('/api/menu');
            setMenuItems(response.data);
        } catch (error) {
            console.error('Error fetching menu items:', error);
            alert('Failed to load menu items. Please refresh the page.');
        } finally {
            setIsLoading(false);
        }
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

    const resetForm = () => {
        setFormData({
            name: '',
            price: '',
            image: '',
            category: 'Chaat',
            description: '',
            otherOptions: [],
            extraOptions: {}
        });
        setEditingItem(null);
        setShowAddForm(false);
    };

    const handleEdit = (item) => {
        // Parse existing options, excluding standard spice levels and premium options
        const standardSpiceLevels = ['No Spice', 'Mild', 'Spicy', 'Extra Spicy'];
        const existingOptions = item.options || [];
        
        // Filter out spice levels and premium options (those with (+$X) format)
        const otherOptions = existingOptions.filter(opt => 
            !standardSpiceLevels.includes(opt) && 
            !opt.match(/\(\+\$\d+(\.\d+)?\)$/)
        );

        setFormData({
            name: item.name,
            price: item.price.toString(),
            image: item.image,
            category: item.category,
            description: item.description,
            otherOptions: otherOptions,
            extraOptions: item.extraOptions || {}
        });
        setEditingItem(item);
        setShowAddForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.price || !formData.category) {
            alert('Please fill in all required fields (Name, Price, Category).');
            return;
        }

        // Automatically add appropriate spice levels based on category
        let standardOptions = [];
        
        if (formData.category === 'Chaat' || formData.category === 'Wraps') {
            standardOptions = ['No Spice', 'Mild', 'Spicy', 'Extra Spicy'];
        } else if (formData.category === 'Drinks') {
            // For drinks, use temperature or ice options instead of spice
            if (formData.name.toLowerCase().includes('lassi')) {
                standardOptions = ['Ice', 'No Ice'];
            } else if (formData.name.toLowerCase().includes('water')) {
                standardOptions = ['Cold', 'Room Temperature'];
            }
        }

        // Create premium options with price indicators for the options array
        const premiumOptionsForArray = Object.entries(formData.extraOptions).map(([option, price]) => {
            return `${option} (+$${price})`;
        });

        // Combine standard options, other options, and premium options
        const combinedOptions = [
            ...standardOptions,
            ...formData.otherOptions.filter(opt => opt.trim() !== ''),
            ...premiumOptionsForArray
        ];

        const itemData = {
            ...formData,
            price: parseFloat(formData.price),
            options: combinedOptions
        };

        // Remove otherOptions from the data sent to server (keep extraOptions)
        delete itemData.otherOptions;

        try {
            if (editingItem) {
                await axios.put(`/api/menu/${editingItem.id}`, itemData);
                setMenuItems(prev => prev.map(item => 
                    item.id === editingItem.id ? { ...item, ...itemData } : item
                ));
                alert('Menu item updated successfully!');
            } else {
                const response = await axios.post('/api/menu', itemData);
                setMenuItems(prev => [...prev, response.data]);
                alert('Menu item added successfully!');
            }
            resetForm();
        } catch (error) {
            console.error('Error saving menu item:', error);
            alert('Failed to save menu item. Please try again.');
        }
    };

    const handleDelete = (item) => {
        openModal({
            type: 'danger',
            title: 'Delete Menu Item',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone and will affect the customer menu immediately.`,
            confirmText: 'Delete Item',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/menu/${item.id}`);
                    setMenuItems(prev => prev.filter(menuItem => menuItem.id !== item.id));
                    alert('Menu item deleted successfully!');
                } catch (error) {
                    console.error('Error deleting menu item:', error);
                    alert('Failed to delete menu item. Please try again.');
                }
            }
        });
    };

    const filteredItems = selectedCategory === 'All' 
        ? menuItems 
        : menuItems.filter(item => item.category === selectedCategory);

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
                <h1>Menu Management</h1>
                <p className="menu-subtitle">Add, edit, and manage your restaurant's menu items</p>
                
                <div className="menu-management-actions">
                    <button 
                        className="add-item-btn"
                        onClick={() => setShowAddForm(true)}
                    >
                        <span className="btn-icon">➕</span>
                        Add New Item
                    </button>
                    
                    <select 
                        className="category-filter"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category} {category === 'All' ? 'Items' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="item-form-overlay">
                    <div className="item-form-container">
                        <div className="form-header">
                            <h2>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
                            <button className="form-close-btn" onClick={resetForm}>×</button>
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
                                        <option value="Chaat">Chaat</option>
                                        <option value="Wraps">Wraps</option>
                                        <option value="Drinks">Drinks</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="image">Image Path</label>
                                    <input
                                        type="text"
                                        id="image"
                                        name="image"
                                        value={formData.image}
                                        onChange={handleInputChange}
                                        placeholder="e.g., /images/pani-puri.jpg"
                                    />
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

                            {/* Spice Level Info */}
                            <div className="form-group full-width">
                                <div className="spice-level-info-box">
                                    <h4>🌶️ Spice Level Options (Automatic)</h4>
                                    <p>
                                        {formData.category === 'Chaat' || formData.category === 'Wraps' 
                                            ? 'This item will automatically include: No Spice, Mild, Spicy, Extra Spicy'
                                            : formData.category === 'Drinks'
                                            ? 'Drinks will automatically include appropriate temperature/ice options'
                                            : 'Select a category to see automatic options'
                                        }
                                    </p>
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
                                        <div key={index} className="extra-option-input-group"> {/* Use index as key instead of option */}
                                            <span className="premium-icon">💰</span>
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => {
                                                    const newOption = e.target.value;
                                                    setFormData(prev => {
                                                        const extraOptions = { ...prev.extraOptions };
                                                        // Remove old key
                                                        delete extraOptions[option];
                                                        // Add new key with same price
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
                                <button type="button" className="cancel-btn" onClick={resetForm}>
                                    Cancel
                                </button>
                                <button type="submit" className="save-btn">
                                    {editingItem ? 'Update Item' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Menu Items Grid */}
            <div className="menu-items-grid">
                {filteredItems.length === 0 ? (
                    <div className="empty-menu">
                        <p>No menu items found in this category.</p>
                        <button 
                            className="add-first-item-btn"
                            onClick={() => setShowAddForm(true)}
                        >
                            Add Your First Item
                        </button>
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className="menu-item-card">
                            <div className="item-image">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} />
                                ) : (
                                    <div className="placeholder-image">
                                        <span>📷</span>
                                        <p>No Image</p>
                                    </div>
                                )}
                                <div className="item-category-badge">{item.category}</div>
                            </div>
                            
                            <div className="item-details">
                                <h3 className="item-name">{item.name}</h3>
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