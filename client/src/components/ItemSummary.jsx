import React, { useState } from 'react';
import '../styles/ItemSummary.css';

const ItemSummary = ({ orders }) => {
    const [expandedItem, setExpandedItem] = useState(null);

    // Calculate item totals and track which are pending only
    const calculateItemSummary = () => {
        const itemSummary = {};
        const itemFirstOrderTime = {}; // Track when each item was first ordered
        const variantFirstOrderTime = {}; // Track when each variant was first ordered

        orders.forEach(order => {
            if (order.status === 'Pending') {
                const orderTime = new Date(order.createdAt);
                
                order.items.forEach(itemString => {
                    const parts = itemString.split(' (');
                    const itemName = parts[0];
                    const options = parts[1] ? parts[1].replace(')', '') : '';
                    
                    // Skip items that are already given
                    const isGiven = order.givenItems?.[itemString] || false;
                    if (isGiven) return;
                    
                    if (!itemSummary[itemName]) {
                        itemSummary[itemName] = {
                            pending: 0,
                            variants: {}
                        };
                        itemFirstOrderTime[itemName] = orderTime; // Set first order time
                        variantFirstOrderTime[itemName] = {}; // Initialize variant tracking for this item
                    } else {
                        // Update to earliest order time if this order is older
                        if (orderTime < itemFirstOrderTime[itemName]) {
                            itemFirstOrderTime[itemName] = orderTime;
                        }
                    }

                    // Track variants (different option combinations)
                    const variantKey = options || 'No options';
                    if (!itemSummary[itemName].variants[variantKey]) {
                        itemSummary[itemName].variants[variantKey] = {
                            pending: 0
                        };
                        variantFirstOrderTime[itemName][variantKey] = orderTime; // Set first order time for this variant
                    } else {
                        // Update to earliest order time for this variant if this order is older
                        if (orderTime < variantFirstOrderTime[itemName][variantKey]) {
                            variantFirstOrderTime[itemName][variantKey] = orderTime;
                        }
                    }

                    // Update pending counts only
                    itemSummary[itemName].pending++;
                    itemSummary[itemName].variants[variantKey].pending++;
                });
            }
        });

        // Add first order time to the summary for sorting
        Object.keys(itemSummary).forEach(itemName => {
            itemSummary[itemName].firstOrderTime = itemFirstOrderTime[itemName];
            
            // Add first order time for each variant
            Object.keys(itemSummary[itemName].variants).forEach(variantKey => {
                itemSummary[itemName].variants[variantKey].firstOrderTime = variantFirstOrderTime[itemName][variantKey];
            });
        });

        return itemSummary;
    };

    const itemSummary = calculateItemSummary();

    const toggleExpanded = (itemName) => {
        setExpandedItem(expandedItem === itemName ? null : itemName);
    };

    return (
        <div className="item-summary-container">
            <h2 className="summary-title">Items to Prepare</h2>
            <div className="summary-grid">
                {Object.entries(itemSummary)
                    .filter(([, data]) => data.pending > 0) // Only show items with pending count
                    .sort(([, a], [, b]) => new Date(a.firstOrderTime) - new Date(b.firstOrderTime)) // Sort by oldest first
                    .map(([itemName, data]) => (
                        <div key={itemName} className="summary-card">
                            <div 
                                className="summary-header"
                                onClick={() => toggleExpanded(itemName)}
                            >
                                <div className="item-info">
                                    <h3 className="item-name">{itemName}</h3>
                                    <div className="item-count">
                                        <span className="pending-count">{data.pending}</span>
                                    </div>
                                </div>
                                {/* Remove the expand button completely - just show count */}
                            </div>

                            {expandedItem === itemName && (
                                <div className="variants-container">
                                    <h4>Options:</h4>
                                    {Object.entries(data.variants)
                                        .filter(([, counts]) => counts.pending > 0)
                                        .sort(([, a], [, b]) => new Date(a.firstOrderTime) - new Date(b.firstOrderTime)) // Sort variants by oldest first
                                        .map(([variant, counts]) => (
                                        <div key={variant} className="variant-row">
                                            <div className="variant-info">
                                                <span className="variant-name">
                                                    {variant === 'No options' ? 'Standard' : variant}
                                                </span>
                                                <span className="variant-count">
                                                    {counts.pending}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
            </div>
            {Object.keys(itemSummary).length === 0 && (
                <div className="no-items">All items prepared! 🎉</div>
            )}
        </div>
    );
};

export default ItemSummary;