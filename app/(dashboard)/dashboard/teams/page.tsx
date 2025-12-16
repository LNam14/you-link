"use client";

import { useEffect, useState, useCallback } from "react";
import Alert from "@/components/ui/Alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { teamService } from "@/services/team.service";
import { userService } from "@/services/user.service";
import { Team } from "@/lib/types";
import { UserResponse } from "@/lib/types";
import { toast } from "sonner";

interface TeamWithMembers extends Team {
  members: (UserResponse & { isLeader?: boolean })[];
}

interface MemberSelection {
  userId: number;
  position: string;
}

const POSITIONS = [
  { value: "Leader", label: "Leader" },
  { value: "bán hàng", label: "bán hàng" },
  { value: "Data", label: "Data" },
  { value: "IT", label: "IT" },
];

const DEFAULT_POSITION = "bán hàng";

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<MemberSelection[]>([]);
  const [editingMembers, setEditingMembers] = useState<Map<number, { position: string }>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [teamsData, usersData] = await Promise.all([
        teamService.getAllTeams(),
        userService.getAllUsers(),
      ]);

      setAllUsers(usersData);

      // Group users by team and add to teams
      const teamsWithMembers: TeamWithMembers[] = teamsData.map((team) => {
        const members = usersData.filter((user) => user.team === team.id);
        return {
          ...team,
          members: members.map((member) => ({
            ...member,
            isLeader: member.position?.toLowerCase() === "leader" || false,
          })),
        };
      });

      setTeams(teamsWithMembers);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await teamService.deleteTeam(teamId);
      await loadData();
      setError("");
      toast.success("Xóa team thành công");
    } catch (err: any) {
      setError(err.message || "Xóa team thất bại");
      toast.error(err.message || "Xóa team thất bại");
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error("Vui lòng nhập tên team");
                return;
              }
    if (selectedMembers.length === 0) {
      toast.error("Vui lòng chọn ít nhất một thành viên");
      return;
    }
    try {
      // Create team first
      const newTeam = await teamService.createTeam({
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || undefined,
      });

      // Update users with team and position
      for (const member of selectedMembers) {
        const validPosition = member.position && POSITIONS.some((p) => p.value === member.position)
          ? member.position
          : DEFAULT_POSITION;
        await userService.updateUser(member.userId, {
          team: newTeam.id,
          position: validPosition,
        });
      }

      setNewTeamName("");
      setNewTeamDescription("");
      setSelectedMembers([]);
      setShowCreateModal(false);
      await loadData();
      toast.success("Tạo team thành công");
    } catch (err: any) {
      toast.error(err.message || "Tạo team thất bại");
    }
  };

  const handleViewMembers = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      // Initialize editing members state
      const membersMap = new Map<number, { position: string }>();
      team.members.forEach((member) => {
        let displayPosition = member.position || "";
        // Check if position is "Leader" or contains "Leader"
        if (displayPosition.toLowerCase() === "leader" || displayPosition.toLowerCase().includes("leader")) {
          displayPosition = "Leader";
        } else {
          // Validate position - if not in POSITIONS, set to default
          if (displayPosition && !POSITIONS.some((p) => p.value === displayPosition)) {
            displayPosition = DEFAULT_POSITION;
          } else if (!displayPosition) {
            displayPosition = DEFAULT_POSITION;
          }
        }
        membersMap.set(member.id, { position: displayPosition });
      });
      setEditingMembers(membersMap);
      setSelectedTeam(teamId);
      setShowMembersModal(true);
            }
  };

  const handleSaveMembers = async () => {
    if (!selectedTeam) return;

    try {
      for (const [userId, memberData] of editingMembers.entries()) {
        const validPosition = memberData.position && POSITIONS.some((p) => p.value === memberData.position)
          ? memberData.position
          : DEFAULT_POSITION;
        await userService.updateUser(userId, {
          position: validPosition,
        });
      }
      await loadData();
      setShowMembersModal(false);
      setSelectedTeam(null);
      toast.success("Cập nhật thành viên thành công");
      } catch (err: any) {
      toast.error(err.message || "Cập nhật thành viên thất bại");
    }
  };

  const handleAddMemberToSelection = (userId: number) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;

    // Check if already selected
    if (selectedMembers.some((m) => m.userId === userId)) {
      setSelectedMembers(selectedMembers.filter((m) => m.userId !== userId));
    } else {
      setSelectedMembers([...selectedMembers, { userId, position: DEFAULT_POSITION }]);
    }
  };

  const handleUpdateMemberSelection = (userId: number, position: string) => {
    setSelectedMembers((prev) => {
      if (position === "Leader") {
        // If setting this user as Leader, unset Leader for all other members
        return prev.map((m) =>
          m.userId === userId
            ? { ...m, position: "Leader" }
            : m.position === "Leader"
            ? { ...m, position: DEFAULT_POSITION }
            : m
        );
      } else {
        // If setting other position, just update this user
        return prev.map((m) =>
          m.userId === userId ? { ...m, position } : m
        );
      }
    });
  };

  const handleUpdateEditingMember = (userId: number, position: string) => {
    setEditingMembers((prev) => {
      const newMap = new Map(prev);
      if (position === "Leader") {
        // If setting this user as Leader, unset Leader for all other members in the same team
        for (const [id, memberData] of prev.entries()) {
          if (id === userId) {
            newMap.set(id, { position: "Leader" });
          } else if (memberData.position === "Leader") {
            newMap.set(id, { position: DEFAULT_POSITION });
          }
        }
      } else {
        // If setting other position, just update this user
        const current = newMap.get(userId) || { position: DEFAULT_POSITION };
        newMap.set(userId, { position });
      }
      return newMap;
    });
  };

  // Get available employees (role = "Nhân viên" and not in any team or in current team)
  const getAvailableEmployees = () => {
    return allUsers.filter((user) => {
      if (user.role !== "Nhân viên") return false;
      if (selectedTeam) {
        // When editing, show members of current team
        const team = teams.find((t) => t.id === selectedTeam);
        return team ? team.members.some((m) => m.id === user.id) : false;
          }
      // When creating, show users not in any team (team is null, undefined, or empty string)
      // Only show users that don't have a team assigned
      const userTeam = user.team;
      return !userTeam || userTeam === "" || userTeam === null || userTeam === undefined;
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Filter teams by search query
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      {/* Header with background */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white overflow-hidden">
        {/* Starry background effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute w-2 h-2 bg-white rounded-full top-4 left-10"></div>
          <div className="absolute w-1 h-1 bg-white rounded-full top-8 left-20"></div>
          <div className="absolute w-1.5 h-1.5 bg-white rounded-full top-12 left-32"></div>
          <div className="absolute w-1 h-1 bg-white rounded-full top-6 right-20"></div>
          <div className="absolute w-2 h-2 bg-white rounded-full top-10 right-32"></div>
          <div className="absolute w-1 h-1 bg-white rounded-full top-14 right-16"></div>
        </div>

        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3 mb-2">
          <div>
        
            <h1 className="text-2xl flex items-center gap-2 font-bold">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
              Quản Lý Teams
        </h1>
            <p className="text-blue-100 mb-4">Tổng cộng {teams.length} teams đang hoạt động</p>
          </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm team..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>

            {/* Create Team Button */}
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo Team
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            className="relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200 shadow-lg overflow-hidden"
          >
            {/* Starry background effect */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute w-1 h-1 bg-blue-400 rounded-full top-2 left-4"></div>
              <div className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full top-6 left-8"></div>
              <div className="absolute w-1 h-1 bg-blue-400 rounded-full top-4 right-6"></div>
            </div>

            <div className="relative z-10">
              {/* Header with icon and actions */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">Hoạt động</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-1.5 hover:bg-white/50 rounded transition-colors"
                    title="Chỉnh sửa"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    className="p-1.5 hover:bg-white/50 rounded transition-colors"
                    title="Xóa"
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Team Info */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Tổng thành viên</span>
                  <span className="font-semibold">{team.members.length}</span>
                </div>

                <div className="text-sm text-gray-600">
                  {team.description || "Chưa có mô tả"}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Tạo ngày</span>
                  <span>{formatDate(team.createdAt)}</span>
                </div>
              </div>

              {/* View Members Button */}
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => handleViewMembers(team.id)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Xem thành viên
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Tạo Team mới
            </h2>
            <div className="space-y-4">
              <Input
                label="Tên team"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Nhập tên team"
              />
              <Input
                label="Mô tả"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                placeholder="Nhập mô tả (tùy chọn)"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn thành viên (role = Nhân viên)
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {getAvailableEmployees().length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Không có nhân viên nào khả dụng
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getAvailableEmployees().map((user) => {
                        const isSelected = selectedMembers.some((m) => m.userId === user.id);
                        const memberData = selectedMembers.find((m) => m.userId === user.id);

                        return (
                          <div
                            key={user.id}
                            className={`p-3 rounded-lg border ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleAddMemberToSelection(user.id)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                              />
                              <span className="flex-1 text-sm font-medium text-gray-900">
                                {user.username} - {user.fullname}
                              </span>
                            </div>

                            {isSelected && (
                              <div className="mt-3 space-y-2 pl-7">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Chức vụ:
                                  </label>
                                  <div className="flex flex-col gap-2">
                                    {POSITIONS.map((pos) => (
                                      <div key={pos.value} className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`position-${user.id}`}
                                          checked={(memberData?.position || DEFAULT_POSITION) === pos.value}
                                          onChange={() =>
                                            handleUpdateMemberSelection(user.id, pos.value)
                                          }
                                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label className="text-sm text-gray-700">
                                          {pos.label}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTeamName("");
                    setNewTeamDescription("");
                    setSelectedMembers([]);
                  }}
                >
                  Hủy
                </Button>
                <Button variant="primary" onClick={handleCreateTeam}>
                  Tạo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Members Modal */}
      {showMembersModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quản lý thành viên - {teams.find((t) => t.id === selectedTeam)?.name}
            </h2>
            <div className="space-y-4">
              {editingMembers.size === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Chưa có thành viên
                </p>
              ) : (
                <div className="space-y-3">
                  {Array.from(editingMembers.entries()).map(([userId, memberData]) => {
                    const user = allUsers.find((u) => u.id === userId);
                    if (!user) return null;

                    return (
                      <div
                        key={userId}
                        className="p-4 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className="flex-1 text-sm font-medium text-gray-900">
                            {user.username} - {user.fullname}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Chức vụ:
                          </label>
                          <div className="flex flex-col gap-2">
                            {POSITIONS.map((pos) => (
                              <div key={pos.value} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`position-${userId}`}
                                  checked={(memberData.position || DEFAULT_POSITION) === pos.value}
                                  onChange={() =>
                                    handleUpdateEditingMember(userId, pos.value)
                                  }
                                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
        />
                                  <label className="text-sm text-gray-700">
                                    {pos.label}
                                  </label>
                              </div>
                            ))}
                          </div>
      </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedTeam(null);
                    setEditingMembers(new Map());
                  }}
                >
                  Hủy
                </Button>
                <Button variant="primary" onClick={handleSaveMembers}>
                  Lưu
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
