"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, Users, X, Calendar, Eye, Power, PowerOff, Building2 } from "lucide-react"
import { toast } from "sonner"
import teamApiRequest, {
    type Team,
    type TeamMember,
    type CreateTeamRequest,
    type UpdateTeamRequest,
} from "@/apiRequests/team"

interface TeamManagementProps {
    teams: Team[]
    onTeamsUpdate: () => void
    hideHeader?: boolean
    employees?: TeamMember[]
}

export default function TeamManagement({
    teams,
    onTeamsUpdate,
    hideHeader = false,
    employees = [],
}: TeamManagementProps) {
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState<"create" | "edit">("create")
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showMembersModal, setShowMembersModal] = useState(false)
    const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([])
    const [teamForm, setTeamForm] = useState({
        name: "",
        description: "",
        active: "Hoạt động",
    })

    const handleCreateTeam = () => {
        setModalMode("create")
        setTeamForm({ name: "", description: "", active: "Hoạt động" })
        setSelectedTeam(null)
        setShowModal(true)
    }

    const handleEditTeam = (team: Team) => {
        setModalMode("edit")
        setTeamForm({
            name: team.name,
            description: team.description || "",
            active: team.active,
        })
        setSelectedTeam(team)
        setShowModal(true)
    }

    const handleToggleTeamStatus = async (team: Team) => {
        try {
            setIsLoading(true)
            const result: any = await teamApiRequest.toggleStatus({ id: team.id })

            if (!result.success) {
                toast.error(result.message || "Có lỗi xảy ra khi thay đổi trạng thái team")
                return
            }

            const newStatus = team.active === "Hoạt động" ? "Ngưng hoạt động" : "Hoạt động"
            const statusMessage = newStatus === "Hoạt động" ? "kích hoạt" : "vô hiệu hóa"
            toast.success(`Team đã được ${statusMessage} thành công`)
            onTeamsUpdate()
        } catch (error: any) {
            console.error("Error toggling team status:", error)
            toast.error("Có lỗi xảy ra khi thay đổi trạng thái team")
        } finally {
            setIsLoading(false)
        }
    }

    const handleViewMembers = (team: Team) => {
        const members = team.members || []
        setSelectedTeamMembers(members)
        setShowMembersModal(true)
    }

    const handleDeleteTeam = async (team: Team) => {
        toast.promise(
            new Promise((resolve, reject) => {
                toast.custom((t) => (
                    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-red-100 rounded-full">
                                <Trash2 className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">Xác nhận xóa team</h3>
                                <p className="text-gray-600 text-sm mb-4">
                                    Bạn có chắc chắn muốn xóa team "{team.name}"? Hành động này không thể hoàn tác.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            toast.dismiss(t)
                                            reject()
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={async () => {
                                            toast.dismiss(t)
                                            try {
                                                setIsLoading(true)
                                                const result: any = await teamApiRequest.delete({ name: team.name })

                                                if (!result.success) {
                                                    toast.error(result.message || "Có lỗi xảy ra khi xóa team")
                                                    reject()
                                                    return
                                                }

                                                toast.success("Xóa team thành công")
                                                onTeamsUpdate()
                                                resolve(true)
                                            } catch (error: any) {
                                                console.error("Error deleting team:", error)
                                                toast.error("Có lỗi xảy ra khi xóa team")
                                                reject()
                                            } finally {
                                                setIsLoading(false)
                                            }
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ), {
                    duration: Infinity,
                })
            })
        )
    }

    const handleSaveTeam = async () => {
        if (!teamForm.name.trim()) {
            toast.error("Tên team không được để trống")
            return
        }

        try {
            setIsLoading(true)

            if (modalMode === "create") {
                const createData: CreateTeamRequest = {
                    name: teamForm.name.trim(),
                    description: teamForm.description.trim() || undefined,
                    active: teamForm.active,
                }

                const result: any = await teamApiRequest.create(createData)

                if (!result.success) {
                    toast.error(result.message || "Có lỗi xảy ra khi tạo team")
                    return
                }

                toast.success("Tạo team thành công")
            } else {
                if (!selectedTeam) return

                const updateData: UpdateTeamRequest = {
                    id: selectedTeam.id,
                    name: teamForm.name.trim(),
                    description: teamForm.description.trim() || undefined,
                    active: teamForm.active,
                }

                const result: any = await teamApiRequest.update(updateData)

                if (!result.success) {
                    toast.error(result.message || "Có lỗi xảy ra khi cập nhật team")
                    return
                }

                toast.success("Cập nhật team thành công")
            }

            setShowModal(false)
            setTeamForm({ name: "", description: "", active: "Hoạt động" })
            onTeamsUpdate()
        } catch (error: any) {
            console.error(`Error ${modalMode === "create" ? "creating" : "updating"} team:`, error)
            toast.error(`Có lỗi xảy ra khi ${modalMode === "create" ? "tạo" : "cập nhật"} team`)
        } finally {
            setIsLoading(false)
        }
    }

    const closeModal = () => {
        setShowModal(false)
        setTeamForm({ name: "", description: "", active: "Hoạt động" })
        setSelectedTeam(null)
    }

    return (
        <div className="bg-white">
            {/* Content */}
            <div className="space-y-6">
                {teams.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex justify-center mb-6">
                            <div className="p-6 bg-blue-100 rounded-full">
                                <Building2 className="h-16 w-16 text-blue-600" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">Chưa có team nào</h3>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                            Tạo team đầu tiên để bắt đầu quản lý nhân viên một cách hiệu quả
                        </p>
                        <button
                            onClick={handleCreateTeam}
                            data-create-team
                            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <Plus className="h-6 w-6" />
                            Tạo Team Đầu Tiên
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {teams.map((team) => (
                            <div
                                key={team.id}
                                className={`bg-white border-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${team.active === "Hoạt động" ? "border-blue-200 hover:border-blue-300" : "border-gray-300 bg-gray-50"
                                    }`}
                            >
                                {/* Team Header */}
                                <div
                                    className={`p-4 rounded-t-xl ${team.active === "Hoạt động"
                                        ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                        : "bg-gradient-to-r from-gray-400 to-gray-500"
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-white/20 rounded-lg">
                                                <Building2 className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-white truncate max-w-[150px]" title={team.name}>
                                                    {team.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${team.active === "Hoạt động" ? "bg-green-300" : "bg-red-300"}`}
                                                    ></div>
                                                    <span className="text-white/90 text-sm font-medium">{team.active}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleToggleTeamStatus(team)}
                                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                                                title={team.active === "Hoạt động" ? "Vô hiệu hóa" : "Kích hoạt"}
                                                disabled={isLoading}
                                            >
                                                {team.active === "Hoạt động" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleEditTeam(team)}
                                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                                                title="Chỉnh sửa"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Team Stats */}
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="bg-white/10 rounded-lg p-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users className="h-4 w-4 text-white/80" />
                                                <span className="text-white/80 text-sm">Tổng thành viên</span>
                                            </div>
                                            <p className="text-white font-bold text-base">{team.member_count || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Team Body */}
                                <div className="p-4">
                                    {/* Description */}
                                    {team.description ? (
                                        <div className="mb-4">
                                            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{team.description}</p>
                                        </div>
                                    ) : (
                                        <div className="mb-4">
                                            <p className="text-gray-400 text-sm italic">Chưa có mô tả</p>
                                        </div>
                                    )}

                                    {/* Created Date */}
                                    {team.created_at && (
                                        <div className="flex items-center gap-2 mb-4 text-gray-500">
                                            <Calendar className="h-4 w-4" />
                                            <span className="text-sm">Tạo ngày {new Date(team.created_at).toLocaleDateString("vi-VN")}</span>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewMembers(team)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Xem thành viên
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTeam(team)}
                                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                            title="Xóa team"
                                            disabled={isLoading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Team Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-xl">
                            <h3 className="text-xl font-bold text-white">
                                {modalMode === "create" ? "Tạo Team Mới" : "Chỉnh Sửa Team"}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Tên Team <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={teamForm.name}
                                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                                    placeholder="Nhập tên team"
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mô Tả</label>
                                <textarea
                                    value={teamForm.description}
                                    onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 resize-none"
                                    placeholder="Nhập mô tả team (tùy chọn)"
                                    rows={4}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={closeModal}
                                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                                disabled={isLoading}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveTeam}
                                className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                disabled={isLoading || !teamForm.name.trim()}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        {modalMode === "create" ? "Đang tạo..." : "Đang cập nhật..."}
                                    </>
                                ) : modalMode === "create" ? (
                                    "Tạo Team"
                                ) : (
                                    "Cập Nhật"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Members Modal */}
            {showMembersModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-white" />
                                <h3 className="text-xl font-bold text-white">Danh sách thành viên</h3>
                                <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium">
                                    {selectedTeamMembers.length} người
                                </span>
                            </div>
                            <button
                                onClick={() => setShowMembersModal(false)}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {selectedTeamMembers.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedTeamMembers.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span className="text-blue-600 font-bold text-lg">
                                                    {member.username.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-gray-900 truncate">
                                                    {member.username}
                                                    {member.name ? `-${member.name}` : ""}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                        {member.position || "Chưa có"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="flex justify-center mb-4">
                                        <div className="p-4 bg-gray-100 rounded-full">
                                            <Users className="h-16 w-16 text-gray-400" />
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Chưa có thành viên</h4>
                                    <p className="text-gray-500">Team này chưa có thành viên nào</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowMembersModal(false)}
                                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Create Button for External Trigger */}
            <button data-create-team onClick={handleCreateTeam} className="hidden">
                Create Team
            </button>
        </div>
    )
}
