import React from "react";
import MenuAvatar from "@/components/menu";
import { FaBars } from "react-icons/fa";
import { usePathname } from "next/navigation";
import "@/app/globals.css";

interface HeaderProps {
    onMenuToggle: () => void;
}

const Header = ({ onMenuToggle }: HeaderProps) => {
    const pathname = usePathname();

    const getPageTitle = () => {
        const path = pathname.split('/').pop();
        return path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Dashboard';
    };

    return (
        <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-md sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14">
                    <div className="flex items-center">
                        <button
                            onClick={onMenuToggle}
                            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200"
                        >
                            <FaBars className="h-4 w-4" />
                        </button>
                        <h1 className="ml-3 text-base font-medium text-white">
                            {getPageTitle()}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <MenuAvatar />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
