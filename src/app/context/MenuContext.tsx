"use client"
import React, { createContext, useContext, useState } from 'react';

interface MenuContextType {
    buttonClicked: boolean;
    toggleMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [buttonClicked, setButtonClicked] = useState(false);

    const toggleMenu = () => {
        setButtonClicked(prevState => !prevState);
    };

    return (
        <MenuContext.Provider value={{ buttonClicked, toggleMenu }}>
            {children}
        </MenuContext.Provider>
    );
};

export const useMenu = () => {
    const context = useContext(MenuContext);
    if (context === undefined) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
};
