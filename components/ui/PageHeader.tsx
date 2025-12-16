"use client";

import { Search, Plus } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  titleIcon?: ReactNode;
  description?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  addButtonLabel?: string;
  onAddClick?: () => void;
  showSearch?: boolean;
  showAddButton?: boolean;
}

export default function PageHeader({
  title,
  titleIcon,
  description,
  searchPlaceholder = "Tìm kiếm...",
  searchValue = "",
  onSearchChange,
  addButtonLabel = "Thêm mới",
  onAddClick,
  showSearch = true,
  showAddButton = true,
}: PageHeaderProps) {
  return (
    <div className="w-full p-6">
      <div className="">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {titleIcon && <div>{titleIcon}</div>}
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            </div>
            {description && (
              <p className="text-gray-600">{description}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 w-full sm:w-64 bg-white"
                />
              </div>
            )}

            {/* Add Button */}
            {showAddButton && onAddClick && (
              <button
                onClick={onAddClick}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md font-medium"
              >
                <Plus className="h-4 w-4" />
                {addButtonLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

