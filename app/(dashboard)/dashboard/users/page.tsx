"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import HotTableComponent, { Column } from "@/components/table/HotTable";
import Alert from "@/components/ui/Alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import { userService } from "@/services/user.service";
import { UserResponse } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, Shield, Truck, User, Users, Search, Plus } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext";
import PageHeader from "@/components/ui/PageHeader";

interface User extends UserResponse {
  password?: string;
}

const ROLES = [
  { value: "Admin", label: "Admin" },
  { value: "Nhân viên", label: "Nhân viên" },
  { value: "NCC", label: "NCC" },
  { value: "Khách hàng", label: "Khách hàng" },
];

const TABS = [
  { id: "Admin", label: "Admin", role: "Admin", icon: Shield },
  { id: "Nhân viên", label: "Nhân viên", role: "Nhân viên", icon: Users },
  { id: "Nhà cung cấp", label: "Nhà cung cấp", role: "NCC", icon: Truck },
  { id: "Khách hàng", label: "Khách hàng", role: "Khách hàng", icon: User },
];

// 10 màu ngẫu nhiên cho các team
const TEAM_COLORS = [
  "#E3F2FD", // Light Blue
  "#F3E5F5", // Light Purple
  "#E8F5E9", // Light Green
  "#FFF3E0", // Light Orange
  "#FCE4EC", // Light Pink
  "#E0F2F1", // Light Teal
  "#FFF9C4", // Light Yellow
  "#F1F8E9", // Light Lime
  "#EDE7F6", // Light Indigo
  "#FFEBEE", // Light Red
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Admin");
  const [error, setError] = useState("");
  const [hasEmptyRow, setHasEmptyRow] = useState(false);
  const [invalidCells, setInvalidCells] = useState<Map<string, string>>(new Map()); // Map of "row-col" to error message
  const [searchQuery, setSearchQuery] = useState("");
  const { user: currentUser, logout, checkAuth, updateUser, isLoading: authLoading } = useAuth();
  const { setHeaderData } = useHeader();

  // Check if user is Admin, redirect if not
  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== "Admin") {
      window.location.href = "/dashboard";
    }
  }, [currentUser, authLoading]);

  useEffect(() => {
    // Only load data if user is Admin
    if (currentUser?.role === "Admin") {
      loadData();
    }
  }, [currentUser]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const usersData = await userService.getAllUsers();
      console.log("Loaded users data:", usersData);
      // Log first user password to debug
      if (usersData.length > 0) {
        console.log("First user password:", usersData[0]?.password);
      }
      setUsers(usersData as User[]);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter users by role based on active tab, group by Team, and sort
  const filteredUsers = users
    .filter((u) => {
      if (activeTab === "Teams") return false; // Teams tab not implemented yet
      if (u.role !== activeTab) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return u.username?.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => {
      // First sort by Team name (null/empty teams go to end)
      const teamA = String(a.team || "").trim();
      const teamB = String(b.team || "").trim();
      if (teamA !== teamB) {
        if (!teamA) return 1; // a has no team, put it last
        if (!teamB) return -1; // b has no team, put it last
        // Both have teams, sort by team name directly
        return teamA.localeCompare(teamB);
      }
      // If same team, sort by ID descending (newest first)
      return (b.id || 0) - (a.id || 0);
    });

  // Get unique team names from users for color mapping
  const uniqueTeamNames = Array.from(
    new Set(
      users
        .map((u) => u.team)
        .filter((t) => t && typeof t === "string" && t.trim())
        .map((t) => String(t).trim())
    )
  );
  
  // Create a map of team name to color
  const teamColorMap = new Map<string, string>();
  uniqueTeamNames.forEach((teamName, index) => {
    if (teamName) {
      teamColorMap.set(teamName, TEAM_COLORS[index % TEAM_COLORS.length]);
    }
  });

  // Format date helper
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "00:00 01/01/2024";
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  // Convert users to 2D array for HotTable
  // Column mapping: 0=id(hidden), 1=username, 2=password, 3=fullname, 4=role(hidden), 5=position, 6=telegram, 7=team, 8=createdAt, 9=updatedAt, 10=active
  const tableData = filteredUsers.map((user) => {
    const password = (user as any).password || user.password || "";
    // Debug log for first user
    if (filteredUsers.indexOf(user) === 0) {
      console.log("Mapping user to tableData:", {
        username: user.username,
        password: password,
        hasPassword: !!(user as any).password || !!user.password
      });
    }
    return [
      user.id,
      user.username,
      password,
      user.fullname,
      user.role, // hidden, will be set to activeTab
      user.position || "",
      user.telegram || "",
      user.team || "", // Team name (column 7)
      formatDate((user as any).createdAt),
      formatDate((user as any).updatedAt),
      user.active,
    ];
  });

  // Add empty row only if hasEmptyRow is true
  const dataWithNewRow = hasEmptyRow
    ? [[null, "", "", "", activeTab, "", "", "", "", "", true], ...tableData]
    : tableData;

  // Build columns
  const columns: Column[] = [
    { data: 0, title: "ID", readOnly: true, width: 60 },
    { data: 1, title: "Username", width: 150 },
    { data: 2, title: "Password", width: 120, type: "text" },
    { data: 3, title: "Tên", width: 150 },
    {
      data: 4,
      title: "Vai trò",
      type: "dropdown",
      selectOptions: ROLES,
      width: 120,
    },
    { data: 5, title: "Chức vụ", width: 150 },
    { data: 6, title: "Telegram", width: 150 },
    { data: 7, title: "Team", width: 150 },
    { data: 8, title: "Ngày tạo", readOnly: true, width: 150 },
    { data: 9, title: "Ngày cập nhật", readOnly: true, width: 150 },
    {
      data: 10,
      title: "Trạng thái",
      type: "checkbox",
      width: 150,
      renderer: function (
        instance: any,
        td: HTMLElement,
        row: number,
        col: number,
        prop: string | number,
        value: any,
        cellProperties: any
      ) {
        // Clear the cell
        td.innerHTML = "";
        
        // Create checkbox element
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(value);
        checkbox.style.marginRight = "8px";
        checkbox.style.cursor = "pointer";
        
        // Create label text
        const label = document.createElement("span");
        label.textContent = "Hoạt động";
        label.style.userSelect = "none";
        
        // Create container
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "flex-start";
        container.appendChild(checkbox);
        container.appendChild(label);
        
        td.appendChild(container);
        
        // Make the entire cell clickable
        td.style.cursor = "pointer";
        td.addEventListener("click", (e) => {
          e.stopPropagation();
          checkbox.checked = !checkbox.checked;
          instance.setDataAtCell(row, col, checkbox.checked);
        });
        
        return td;
      },
    },
  ];

  // Calculate hidden columns based on active tab
  // Column indices: 0=ID, 1=username, 2=password, 3=fullname, 4=role, 5=position, 6=telegram, 7=team, 8=createdAt, 9=updatedAt, 10=active
  const hiddenColumns: number[] = [0, 4]; // Always hide ID, Vai trò
  
  if (activeTab === "Admin") {
    // Hide Telegram and Team columns for Admin tab
    hiddenColumns.push(6, 7);
  }

  const handleAfterChange = useCallback(
    (changes: any[], source: string) => {
      // Only skip loadData source, allow all other sources (edit, CopyPaste.paste, etc.)
      if (source === "loadData") return;
      
      // Ensure changes is an array
      if (!Array.isArray(changes) || changes.length === 0) {
        return;
      }

      // Get current filtered users to ensure we use the latest data
      const currentFilteredUsers = users.filter((u) => u.role === activeTab);

      // Group changes by row to handle all changes for a row together
      const changesByRow = new Map<number, any[]>();
      for (const change of changes) {
        const [row] = change;
        if (!changesByRow.has(row)) {
          changesByRow.set(row, []);
        }
        changesByRow.get(row)!.push(change);
      }

      // Process changes silently in background without loading state
      for (const [row, rowChanges] of changesByRow) {
        // Get row data from table
        // If row is out of bounds (new row added via context menu), create empty row data
        let rowData = [...(dataWithNewRow[row] || [])];
        if (!rowData || rowData.length === 0) {
          if (row >= dataWithNewRow.length) {
            // New row added via context menu, create empty row with correct format
            rowData = [null, "", "", "", activeTab, "", "", "", "", "", true];
          } else {
            continue;
          }
        }

        // Update rowData with all changes for this row to get latest values
        for (const [changeRow, prop, oldValue, newValue] of rowChanges) {
          if (changeRow === row && prop !== undefined && newValue !== undefined) {
            rowData[prop] = newValue;
          }
        }

        const userId = rowData[0]; // ID is at index 0

        // New user (no ID) - create new user when any field is changed
        // Only create once per change batch to avoid duplicates
        if (!userId) {
          const newUsername = String(rowData[1] || "").trim();
          
          // Check if username already exists before creating
          // Check if any change is for username column (column 1)
          const hasUsernameChange = rowChanges.some(([changeRow, changeProp]) => changeRow === row && changeProp === 1);
          if (newUsername && hasUsernameChange) {
            const existingUser = users.find((u) => u.username === newUsername);
            
            if (existingUser) {
              // Username already exists - mark cell as invalid and don't create
              const cellKey = `${row}-1`; // Column 1 is username
              setInvalidCells((prev) => {
                const newMap = new Map(prev);
                newMap.set(cellKey, "Tên đăng nhập đã tồn tại");
                return newMap;
              });
              setError("Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác.");
              // Don't create, but keep the value in the cell for user to fix
              continue; // Use continue instead of break
            } else {
              // Username is valid - clear invalid mark
              const cellKey = `${row}-1`; // Column 1 is username
              setInvalidCells((prev) => {
                const newMap = new Map(prev);
                newMap.delete(cellKey);
                return newMap;
              });
            }
          }

          // Create user with any data, no validation required - all fields can be empty
          const newUser: any = {
            username: newUsername,
            password: String(rowData[2] || ""),
            fullname: String(rowData[3] || ""),
            role: activeTab, // Use activeTab as role
            position: String(rowData[5] || ""),
            telegram: String(rowData[6] || ""),
            active: Boolean(rowData[10] !== undefined ? rowData[10] : true),
          };

          // Handle team - always save team (even if empty string)
          const teamName = rowData[7] ? String(rowData[7]).trim() : "";
          newUser.team = teamName;
          console.log("Creating user with team:", { username: newUsername, team: teamName, rowData: rowData[7] });

          // Create new user immediately when any field changes (no validation, all fields optional)
          userService
            .createUser(newUser)
            .then(() => {
              setHasEmptyRow(false); // Remove empty row after creation
              loadData();
              setError("");
            })
            .catch((err: any) => {
              // Check if error is about username conflict
              const errorMessage = err.message || err.error || "Tạo người dùng thất bại";
              if (errorMessage.includes("Username already exists") || errorMessage.includes("already exists") || errorMessage.includes("trùng")) {
                // Mark cell as invalid
                const cellKey = `${row}-1`; // Column 1 is username
                setInvalidCells((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(cellKey, "Tên đăng nhập đã tồn tại");
                  return newMap;
                });
                setError("Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác.");
              } else {
                setError(errorMessage);
              }
              loadData();
            });
          
          // Break after creating user to avoid creating multiple users in one batch
          continue; // Use continue instead of break to process other rows
        } else if (userId && typeof userId === "number") {
          // Update existing user - process all changes for this row
          const updateData: any = {};
          let shouldLogoutCurrentUser = false;

          // Map column index to field name
          const fieldMap: { [key: number]: string } = {
            1: "username",
            2: "password",
            3: "fullname",
            4: "role",
            5: "position",
            6: "telegram",
            10: "active",
          };

          // Process all changes for this row first to update rowData
          // Then get team from updated rowData
          
          // Process all changes for this row
          for (const [changeRow, prop, oldValue, newValue] of rowChanges) {
            if (changeRow !== row) continue;

            // Handle Team column (column 7 - Team name) separately
            if (prop === 7) {
              // Team name changed, save team name directly
              const teamName = String(newValue || "").trim();
              updateData.team = teamName; // Always save team, even if empty
              console.log("Updating team for user:", { userId, team: teamName, newValue, oldValue, rowDataTeam: rowData[7] });
            } else {
              // Handle other fields
              const field = fieldMap[prop];
              if (field) {
              if (field === "password") {
              // Only update password if not empty
              if (newValue !== null && newValue !== undefined && String(newValue).trim() !== "") {
                updateData[field] = String(newValue);
                // If changing current user's password, logout current user
                if (currentUser && currentUser.id === userId) {
                  shouldLogoutCurrentUser = true;
                }
                // Note: Other users will be logged out on their next request
                // because password change will invalidate their token
              }
            } else if (field === "active") {
              updateData[field] = Boolean(newValue);
              // If changing current user's active status to false, logout current user
              if (currentUser && currentUser.id === userId && !Boolean(newValue)) {
                shouldLogoutCurrentUser = true;
              }
              // Note: Other users will be logged out on their next request
              // because active=false will be checked in /api/auth/me
            } else if (field === "username") {
              // Update username - validate before saving
              const newUsername = String(newValue || "").trim();
              updateData[field] = newUsername;
              
              // Check if username already exists (excluding current user)
              const existingUser = users.find(
                (u) => u.username === newUsername && u.id !== userId
              );
              
              if (existingUser && newUsername) {
                // Username already exists - mark cell as invalid and don't save
                const cellKey = `${row}-${prop}`;
                setInvalidCells((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(cellKey, "Tên đăng nhập đã tồn tại");
                  return newMap;
                });
                setError("Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác.");
                // Don't save, but keep the value in the cell for user to fix
                continue; // Skip this change, but continue processing other changes
              } else {
                // Username is valid - clear invalid mark
                const cellKey = `${row}-${prop}`;
                setInvalidCells((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(cellKey);
                  return newMap;
                });
                
                // If changing current user's username, logout current user
                if (currentUser && currentUser.id === userId) {
                  shouldLogoutCurrentUser = true;
                }
                // Note: Other users will be logged out on their next request
                // because username mismatch will be checked in /api/auth/me
              }
            } else {
              // Update other fields directly (no validation)
              updateData[field] = String(newValue || "");
            }
              }
            }
          }

          // Always get team from updated rowData after processing all changes
          // This ensures we get the latest team value even if it was changed in this batch
          const currentTeamName = rowData[7] !== undefined && rowData[7] !== null ? String(rowData[7]).trim() : "";
          
          // Always include team in update if it exists in rowData
          // This ensures team is saved even if it was entered before user was created or changed in this batch
          if (currentTeamName !== "" || rowData[7] !== undefined) {
            updateData.team = currentTeamName;
            console.log("Adding team to updateData:", { userId, team: currentTeamName, rowData7: rowData[7], updateDataKeys: Object.keys(updateData) });
          }

          // Save silently in background using userId (not row index)
          if (Object.keys(updateData).length > 0) {
            // If this is the current logged-in user, update auth state immediately
            if (currentUser && currentUser.id === userId && !shouldLogoutCurrentUser) {
              // Prepare updated user data for auth
              const authUpdateData: Partial<User> = {};
              if (updateData.fullname !== undefined) authUpdateData.fullname = String(updateData.fullname);
              if (updateData.role !== undefined) authUpdateData.role = String(updateData.role);
              if (updateData.position !== undefined) authUpdateData.position = String(updateData.position);
              if (updateData.telegram !== undefined) authUpdateData.telegram = String(updateData.telegram);
              if (updateData.team !== undefined) {
                authUpdateData.team = updateData.team ? String(updateData.team) : "";
              }
              
              // Update auth state immediately for instant header update
              updateUser(authUpdateData);
            }
            
            // Update local state immediately for instant UI update
            setUsers((prevUsers) => {
              return prevUsers.map((user) => {
                if (user.id === userId) {
                  // Create updated user object
                  const updatedUser = { ...user };
                  
                  // Update fields from updateData
                  if (updateData.username !== undefined) updatedUser.username = updateData.username;
                  if (updateData.fullname !== undefined) updatedUser.fullname = updateData.fullname;
                  if (updateData.position !== undefined) updatedUser.position = updateData.position;
                  if (updateData.telegram !== undefined) updatedUser.telegram = updateData.telegram;
                  if (updateData.role !== undefined) updatedUser.role = updateData.role;
                  if (updateData.active !== undefined) updatedUser.active = updateData.active;
                  if (updateData.team !== undefined) {
                    updatedUser.team = updateData.team || "";
                  }
                  
                  return updatedUser;
                }
                return user;
              });
            });

            // Save to backend
            userService
              .updateUser(userId, updateData)
              .then(() => {
                // If username, password, or active was changed for current user, logout immediately
                if (shouldLogoutCurrentUser) {
                  logout();
                }
                // Reload data if team was changed to ensure team name is updated correctly
                if (updateData.team !== undefined) {
                  loadData();
                }
                // Note: User state is already updated above, no need to call checkAuth
                // The updateUser call in setUsers already updates the header immediately
                // Other users will be logged out automatically on their next /api/auth/me call
                // because the API checks username match and active status
              })
              .catch((err: any) => {
                // Check if error is about username conflict
                const errorMessage = err.message || err.error || "Cập nhật người dùng thất bại";
                if (errorMessage.includes("Username already exists") || errorMessage.includes("already exists") || errorMessage.includes("trùng")) {
                  setError("Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác.");
                  // Reload data to revert changes
                  loadData();
                } else {
                  // Silently handle other errors (user might have been deleted)
                  console.warn("Error updating user:", userId, updateData, err);
                  // Reload data on error to sync with server
                  loadData();
                }
              });
          }
        }
      }
    },
    [users, activeTab, dataWithNewRow, currentUser, logout, checkAuth, updateUser]
  );

  const handleAfterCreateRow = useCallback(
    async (index: number, amount: number) => {
      // When a new row is created via context menu, create new user immediately
      for (let i = 0; i < amount; i++) {
        const newUser: any = {
          username: "",
          password: "",
          fullname: "",
          role: activeTab,
          position: "",
          telegram: "",
          active: true,
        };

        // Handle team selection (only if not Admin tab)
        if (activeTab !== "Admin") {
          // No team by default for new users
        }

        // Create new user immediately in database
        try {
          await userService.createUser(newUser);
          // Reload data to show the new user at the top
          await loadData();
          setError("");
        } catch (err: any) {
          // Check if error is about username conflict
          const errorMessage = err.message || err.error || "Tạo người dùng thất bại";
          if (errorMessage.includes("Username already exists") || errorMessage.includes("already exists") || errorMessage.includes("trùng")) {
            setError("Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác.");
          } else {
            setError(errorMessage);
          }
          await loadData();
        }
      }
    },
    [activeTab]
  );

  const handleAfterRemoveRow = useCallback(
    (index: number, amount: number) => {
      // Get current filtered users to ensure we use the latest data
      const currentFilteredUsers = users.filter((u) => u.role === activeTab);

      // Delete silently in background using userId (not row index)
      // Account for empty row at index 0 if hasEmptyRow is true
      for (let i = 0; i < amount; i++) {
        const rowIndex = index + i;
        // Skip empty row at index 0 if it exists
        if (hasEmptyRow && rowIndex === 0) continue;
        const actualIndex = hasEmptyRow ? rowIndex - 1 : rowIndex; // Adjust for empty row
        
        if (actualIndex >= currentFilteredUsers.length || actualIndex < 0) continue;
        
        // Get user from current filtered list using row index
        const user = currentFilteredUsers[actualIndex];
        if (!user) continue;

        // Always use userId from user object - this is the actual user ID, not table index
        const userId = user.id;

        if (userId && typeof userId === "number") {
          // Delete silently in background using userId (not row index)
          userService.deleteUser(userId).catch((err) => {
            // Silently handle errors (user might have been deleted already)
            console.warn("Error deleting user:", userId, err);
          });
        }
      }
      // Reload data after deletion (silently)
      setTimeout(() => {
        loadData();
      }, 100);
    },
    [users, activeTab, hasEmptyRow]
  );

  const handleAddNew = async () => {
    // Create new user immediately in database
    const newUser: any = {
      username: "",
      password: "",
      fullname: "",
      role: activeTab,
      position: "",
      telegram: "",
      active: true,
    };

    // Handle team selection (only if not Admin tab)
    if (activeTab !== "Admin") {
      // No team by default for new users
    }

    try {
      await userService.createUser(newUser);
      // Reload data to show the new user at the top
      await loadData();
      setError("");
    } catch (err: any) {
      setError(err.message || "Tạo người dùng thất bại");
      await loadData();
    }
  };

  // Reset hasEmptyRow when tab changes
  useEffect(() => {
    setHasEmptyRow(false);
  }, [activeTab]);

  // Memoize callbacks to prevent infinite loops
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);
  // Set header data
  useEffect(() => {
    setHeaderData({
      title: "Quản Lý Tài Khoản",
      subTitle: "Quản lý thông tin, phân quyền và trạng thái tài khoản",
      tabs: TABS,
      activeTab: activeTab,
      onTabChange: handleTabChange,
      refreshButton: true,
      customControls: null, // Reset customControls khi vào trang này
    });
  }, [activeTab, setHeaderData, loadData, handleTabChange]);

  // Don't render if not Admin
  if (!authLoading && currentUser && currentUser.role !== "Admin") {
    return null;
  }

  // Show loading while checking auth
  if (authLoading || !currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`w-full ${isLoading && filteredUsers.length === 0 ? "fixed inset-0 z-50" : "relative"}`}>
      <Toaster position="top-right" expand={true} richColors />

      {isLoading && filteredUsers.length === 0 && (
       <LoadingSpinner />
      )}

      {(!isLoading || filteredUsers.length > 0) && (
        <div className="w-full">

          {error && (
            <div className="mb-4">
              <Alert type="error" onClose={() => setError("")}>
                {error}
              </Alert>
            </div>
          )}

          {/* Table */}
          <div className="bg-white shadow-lg overflow-hidden">
            {isLoading ? (
              <LoadingSpinner />
            ) : filteredUsers.length === 0 && !hasEmptyRow ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 min-h-[400px]">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-xl opacity-50"></div>
                  <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-full p-6 border-2 border-blue-100">
                    {(() => {
                      const tab = TABS.find(t => t.id === activeTab);
                      const IconComponent = tab?.icon || Users;
                      return <IconComponent className="h-12 w-12 text-blue-500" />;
                    })()}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Chưa có dữ liệu
                </h3>
                <p className="text-gray-500 mb-8 max-w-md text-center">
                  {activeTab === "Admin" && "Chưa có Admin nào trong hệ thống. Hãy thêm Admin đầu tiên để bắt đầu."}
                  {activeTab === "Nhân viên" && "Chưa có nhân viên nào trong hệ thống. Hãy thêm nhân viên đầu tiên để bắt đầu."}
                  {activeTab === "Nhà cung cấp" && "Chưa có nhà cung cấp nào trong hệ thống. Hãy thêm nhà cung cấp đầu tiên để bắt đầu."}
                  {activeTab === "Khách hàng" && "Chưa có khách hàng nào trong hệ thống. Hãy thêm khách hàng đầu tiên để bắt đầu."}
                </p>
                <Button 
                  onClick={handleAddNew} 
                  variant="primary"
                  className="flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-5 w-5" />
                  <span>Thêm mới</span>
                </Button>
              </div>
            ) : (
              <HotTableComponent
                data={dataWithNewRow}
                columns={columns}
                onAfterChange={handleAfterChange}
                onAfterRemoveRow={handleAfterRemoveRow}
                contextMenuOptions={{
                  showAddRow: true,
                  showRemoveRow: true,
                }}
                onAfterCreateRow={handleAfterCreateRow}
                hiddenColumns={hiddenColumns}
                invalidCells={invalidCells}
                teamColors={teamColorMap}
                teamColumnIndex={7}
                roleColumnIndex={4}
                statusColumnIndex={10}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
