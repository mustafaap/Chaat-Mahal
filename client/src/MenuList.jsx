import React from 'react';

const MenuList = ({ menuItems, onSelectItem }) => {
    return (
        <div>
            <h2>Menu</h2>
            <ul>
                {menuItems.map((item) => (
                    <li key={item.id}>
                        <span>{item.name} - ${item.price}</span>
                        <button onClick={() => onSelectItem(item)}>Add to Order</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MenuList;