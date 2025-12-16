"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  User,
  Clock,
  CheckCircle2,
  Target,
  Users,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit,
  X,
  Loader2,
  CheckCheck,
  Circle,
  CalendarIcon,
  Save,
  ExternalLink,
} from "lucide-react"
import { toast, Toaster } from "sonner"
import { debounce } from "@/lib/utils/debounce"
import { useAuth } from "@/hooks/useAuth"
import { QuizQuestion, quizQuestions } from "@/app/(dashboard)/dashboard/cham-cong/QuizModal"
import { workTaskApiRequest } from "@/lib/api/work-task.api"
import { dailyTaskTemplateApiRequest } from "@/lib/api/daily-task-template.api"
import { attendanceApiRequest } from "@/lib/api/attendance.api"
import { authApiRequest } from "@/lib/api/auth.api"
import { telegramApiRequest } from "@/lib/api/telegram.api"
import { useFirebaseData } from "@/hooks/useFirebaseData"
import { useCongNo } from "@/hooks/useCongNo"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { useRouter } from "next/navigation"
import { useHeader } from "@/app/(dashboard)/contexts/HeaderContext"

interface EmployeeInfo {
  username: string
  fullname: string  
  telegram: string
}

interface AttendanceRecord {
  username: string
  date: string
}

type DailyTaskDataType = "boolean" | "text"

interface CustomDailyTask {
  id: string
  fullname: string
  type: DailyTaskDataType
  appliesTo?: string[] // Danh sách username của nhân viên áp dụng. Nếu undefined hoặc rỗng thì áp dụng cho tất cả
}

interface WeeklyTaskData {
  id: number
  title: string
  content: string
  status?: "pending" | "success" | "failed"
  employeeNote?: string // Dữ liệu nhân viên nhập vào
}

interface DailyTaskData {
  day: string
  date: string
  chamCong: boolean
  [key: string]: boolean | string[] | string
}

interface WeekData {
  dateRange: {
    from: string
    to: string
  }
  weeklyTasks: WeeklyTaskData[]
  deXuat: string[]
  dailyTasks: DailyTaskData[]
}

interface UserWeekData {
  weeks: { [weekNumber: string]: WeekData }
}

interface AllUsersData {
  users: { [username: string]: UserWeekData }
}

const AddTaskDialog: React.FC<{ 
  onAdd: (name: string, type: DailyTaskDataType, selectedEmployees: string[]) => void
  selectableEmployees: string[]
  isAdmin: boolean
}> = ({ onAdd, selectableEmployees, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<DailyTaskDataType>("boolean")
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim(), type, selectedEmployees)
      setName("")
      setType("boolean")
      setSelectedEmployees([])
      setIsOpen(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 bg-cyan-500 hover:bg-cyan-600 flex items-center gap-2 rounded-lg text-white"
        title="Thêm công việc"
      >
       <Plus className="h-4 w-4" />
       <span>Thêm công việc</span>
      </button>
    )
  }

  const toggleEmployee = (username: string) => {
    setSelectedEmployees(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username)
        : [...prev, username]
    )
  }

  const selectAll = () => {
    setSelectedEmployees([...selectableEmployees])
  }

  const deselectAll = () => {
    setSelectedEmployees([])
  }

  return (
    <div className="absolute top-full right-0 mt-2 bg-white border border-blue-300 rounded-lg shadow-xl p-3 z-50 min-w-[300px] max-w-[400px]">
      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên công việc..."
          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          style={{ fontSize: '12px' }}
          autoFocus
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DailyTaskDataType)}
          className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          style={{ fontSize: '12px' }}
        >
          <option value="boolean">True/False</option>
          <option value="text">Text</option>
        </select>
        
        {isAdmin && selectableEmployees.length > 0 && (
          <div className="border border-gray-300 rounded-lg p-2 max-h-[200px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">Chọn nhân viên:</label>
              <div className="flex gap-1">
                <button
                  onClick={selectAll}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Tất cả
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {selectableEmployees.map((username) => (
                <label key={username} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(username)}
                    onChange={() => toggleEmployee(username)}
                    className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                  />
                  <span className="text-xs text-gray-700">{username}</span>
                </label>
              ))}
            </div>
            {selectedEmployees.length === 0 && (
              <p className="text-xs text-gray-500 mt-1 italic">Chưa chọn nhân viên nào (sẽ áp dụng cho tất cả)</p>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="flex-1 px-3 py-2 text-white rounded-lg font-medium transition-colors"
            style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', fontSize: '12px' }}
          >
            Thêm
          </button>
          <button
            onClick={() => {
              setIsOpen(false)
              setName("")
              setSelectedEmployees([])
            }}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            style={{ fontSize: '12px' }}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}

const EditableTaskName: React.FC<{
  task: CustomDailyTask
  onUpdate: (name: string, type?: DailyTaskDataType) => void
  onDelete: () => void
  isAdmin?: boolean
}> = ({ task, onUpdate, onDelete, isAdmin = false }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(task.fullname)
  const [type, setType] = useState(task.type)

  const handleSave = () => {
    onUpdate(name.trim(), type !== task.type ? type : undefined)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          style={{ fontSize: '11px' }}
          autoFocus
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setName(task.fullname)
              setIsEditing(false)
            }
          }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DailyTaskDataType)}
          className="w-24 px-2 py-1 text-xs bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          style={{ fontSize: '12px' }}
          onBlur={handleSave}
        >
          <option value="boolean">True/False</option>
          <option value="text">Text</option>
        </select>
        <button onClick={handleSave} className="p-1 text-cyan-500 hover:bg-cyan-50 rounded-lg transition-colors" style={{ color: '#06b6d4' }}>
          <CheckCircle2 className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="font-medium text-white" style={{ fontSize: '11px' }}>{task.fullname}</span>
      {isAdmin && (
        <>
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 text-white hover:bg-white/20 rounded transition-opacity"
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1 text-white hover:bg-white/20 rounded transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  )
}


const PageBody: React.FC = () => {
  const { user: userInfo } = useAuth()
  const router = useRouter()
  const { setHeaderData } = useHeader()
  const isAdmin = userInfo?.role === "Admin" || userInfo?.position === "Leader"
  const [selectedUsername, setSelectedUsername] = useState<string>("")
  const [allUsers, setAllUsers] = useState<any[]>([])
  const username = isAdmin && selectedUsername ? selectedUsername : userInfo?.username || ""

  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>({
    username: username || "",
    fullname: userInfo?.fullname || username || "",
    telegram: `@${username}`,
  })

  const [leaderInfo, setLeaderInfo] = useState<EmployeeInfo>({
    username: "",
    fullname: "Chưa có leader",
    telegram: "",
  })

  // Ref để tránh gọi API nhiều lần đồng thời
  const fetchingUserDataRef = useRef(false)
  const lastFetchedUsernameRef = useRef<string>("")

  // Gộp fetchEmployeeInfo và fetchLeaderInfo để chỉ gọi authApiRequest.get() một lần
  const fetchUserData = useCallback(async () => {
    if (!username) return
    if (fetchingUserDataRef.current) return // Đang fetch, bỏ qua
    if (lastFetchedUsernameRef.current === username) return // Đã fetch cho username này rồi

    fetchingUserDataRef.current = true
    try {
      const authResponse: any = await authApiRequest.get()
      if (authResponse && authResponse.success && authResponse.data) {
        // Store all users for selection dropdown
        const users: any[] = []
        const groups = ['NV', 'Admin', 'NCC', 'KH']
        for (const group of groups) {
          if (authResponse.data[group] && Array.isArray(authResponse.data[group])) {
            users.push(...authResponse.data[group])
          }
        }
        setAllUsers(users)

        // Fetch employee info
        let foundUser: any = null
        for (const group of groups) {
          if (authResponse.data[group] && Array.isArray(authResponse.data[group])) {
            foundUser = authResponse.data[group].find((user: any) => user.username === username)
            if (foundUser) break
          }
        }

        if (foundUser) {
          setEmployeeInfo({
            username: foundUser.username || username,
            fullname: foundUser.fullname || foundUser.username || username,
            telegram: foundUser.telegram ? `@${foundUser.telegram.replace("@", "")}` : `@${username}`,
          })
        } else {
          setEmployeeInfo({
            username: username,
            fullname: username,
            telegram: `@${username}`,
          })
        }

        // Fetch leader info từ cùng response - tìm leader có cùng team và position = "Leader"
        let leader: any = null
        const userTeam = foundUser?.team || userInfo?.team
        
        if (userTeam) {
          // Tìm leader trong nhóm NV trước (thường leader là nhân viên)
          if (authResponse.data.NV) {
            leader = authResponse.data.NV.find((nv: any) => 
              nv.position === "Leader" && nv.team === userTeam
            )
          }
        }

        if (leader) {
          setLeaderInfo({
            username: leader.username || "",
            fullname: leader.fullname || "Chưa có tên",
            telegram: leader.phone ? `@${leader.phone.replace("@", "")}` : "",
          })
        } else {
          setLeaderInfo({
            username: "",
            fullname: "Chưa có leader",
            telegram: "",
          })
        }

        lastFetchedUsernameRef.current = username
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      setEmployeeInfo({
        username: username,
        fullname: username,
        telegram: `@${username}`,
      })
      setLeaderInfo({
        username: "",
        fullname: "Chưa có leader",
        telegram: "",
      })
    } finally {
      fetchingUserDataRef.current = false
    }
  }, [username])

  // Giữ lại fetchEmployeeInfo và fetchLeaderInfo để tương thích với code cũ, nhưng chúng sẽ gọi fetchUserData
  const fetchEmployeeInfo = useCallback(() => {
    return fetchUserData()
  }, [fetchUserData])

  const fetchLeaderInfo = useCallback(() => {
    return fetchUserData()
  }, [fetchUserData])

  const [allAttendanceData, setAllAttendanceData] = useState<AttendanceRecord[]>([])
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isChangingUser, setIsChangingUser] = useState(false)

  const getWeekDates = (weekOffset = 0) => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = CN, 1 = T2, ..., 6 = T7
    
    // Tính số ngày cần trừ để về thứ 2 (Monday)
    // Nếu là CN (0) thì trừ 6 ngày, nếu là T2 (1) thì trừ 0 ngày, nếu là T3 (2) thì trừ 1 ngày, ...
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay
    
    // Tạo Date object mới cho thứ 2 (không thay đổi object today gốc)
    const monday = new Date(today)
    monday.setDate(today.getDate() + daysToMonday + weekOffset * 7)
    
    // Đặt giờ về 0 để tránh vấn đề timezone
    monday.setHours(0, 0, 0, 0)

    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      date.setHours(0, 0, 0, 0)
      weekDays.push(date)
    }
    return weekDays
  }

  // Helper function để format date theo local timezone (tránh vấn đề UTC)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper function để lấy ngày hôm nay theo local timezone
  const getTodayLocal = (): string => {
    const today = new Date()
    return formatDateLocal(today)
  }

  const [weekOffset, setWeekOffset] = useState(0)
  const weekDays = getWeekDates(weekOffset)
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  const getWeekKey = (weekNumber: number): string => {
    return weekNumber.toString()
  }

  const getWeeklyTaskWeekDates = (weekOffset = 0) => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = CN, 1 = T2, ..., 6 = T7
    
    // Tính số ngày cần trừ để về thứ 2 (Monday)
    // Nếu là CN (0) thì trừ 6 ngày, nếu là T2 (1) thì trừ 0 ngày, nếu là T3 (2) thì trừ 1 ngày, ...
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay
    
    // Tạo Date object mới cho thứ 2 (không thay đổi object today gốc)
    const monday = new Date(today)
    monday.setDate(today.getDate() + daysToMonday + weekOffset * 7)
    
    // Đặt giờ về 0 để tránh vấn đề timezone
    monday.setHours(0, 0, 0, 0)

    const startDate = new Date(monday)
    const endDate = new Date(monday)
    endDate.setDate(monday.getDate() + 6)
    endDate.setHours(0, 0, 0, 0)

    return {
      startDate: formatDateLocal(startDate),
      endDate: formatDateLocal(endDate),
      startDateObj: startDate,
      endDateObj: endDate,
      weekNumber: getWeekNumber(startDate),
    }
  }

  const [weeklyTasksWeekOffset, setWeeklyTasksWeekOffset] = useState(0)
  const weeklyTasksWeekDates = useMemo(
    () => getWeeklyTaskWeekDates(weeklyTasksWeekOffset),
    [weeklyTasksWeekOffset]
  )

  // Hàm tính toán trạng thái cho daily task (boolean)
  const getDailyTaskStatus = (date: string, value: boolean): "pending" | "success" | "failed" => {
    const today = getTodayLocal()
    const taskDate = new Date(date)
    const todayDate = new Date(today)
    
    // Nếu qua ngày hôm nay thì failed
    if (taskDate < todayDate) {
      return value ? "success" : "failed"
    }
    
    // Nếu là ngày hôm nay hoặc tương lai
    return value ? "success" : "pending"
  }

  // Hàm tính toán trạng thái cho weekly task
  const getWeeklyTaskStatus = (task: WeeklyTaskData, weekEndDate: string): "pending" | "success" | "failed" => {
    const today = getTodayLocal()
    const endDate = new Date(weekEndDate)
    const todayDate = new Date(today)
    
    // Chỉ tính hoàn thành khi có dữ liệu nhân viên nhập vào
    if (task.employeeNote && task.employeeNote.trim().length > 0) {
      return "success"
    }
    
    // Nếu quá ngày chủ nhật của tuần đó thì failed
    if (todayDate > endDate) {
      return "failed"
    }
    
    // Nếu không có dữ liệu thì luôn là pending (không dựa vào task.status)
    return "pending"
  }

  // Hàm tính toán trạng thái cho đề xuất
  const getDeXuatStatus = (deXuat: string[], weekEndDate: string): "pending" | "success" | "failed" => {
    const today = getTodayLocal()
    const endDate = new Date(weekEndDate)
    const todayDate = new Date(today)
    
    // Đếm số đề xuất có nội dung
    const filledCount = deXuat.filter(item => item && item.trim().length > 0).length
    
    // Nếu quá ngày chủ nhật
    if (todayDate > endDate) {
      return filledCount === 3 ? "success" : "failed"
    }
    
    // Chưa quá thời hạn
    return filledCount === 3 ? "success" : "pending"
  }

  const [usersData, setUsersData] = useState<AllUsersData>({ users: {} })

  const [dailyTaskTemplate, setDailyTaskTemplate] = useState<CustomDailyTask[]>([])
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)

  const [workTaskIds, setWorkTaskIds] = useState<{ [key: string]: number }>({}) // Key format: "username_weekNumber"
  const [isSavingWorkTask, setIsSavingWorkTask] = useState(false)
  const [isLoadingWorkTask, setIsLoadingWorkTask] = useState(false)
  const [savingCustomTask, setSavingCustomTask] = useState<{ [key: string]: boolean }>({})

  const [editingDeXuat, setEditingDeXuat] = useState<{ [index: number]: string }>({})
  const [editingWeeklyTask, setEditingWeeklyTask] = useState<{ [taskId: number]: string }>({})
  const [localDeXuat, setLocalDeXuat] = useState<{ [index: number]: string }>({})
  const [editingDeXuatInput, setEditingDeXuatInput] = useState<{ [index: number]: boolean }>({})
  const [showFullInputs, setShowFullInputs] = useState<{ [key: string]: boolean }>({})

  // Quiz modal states
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | "C" | null>(null)
  const [pendingSaveDate, setPendingSaveDate] = useState<string | null>(null)
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([])
  const requiredCorrectAnswers = 3


  const initializeWeekData = (weekOffset: number): WeekData => {
    const weekDates = getWeekDates(weekOffset)
    const fromDate = formatDateLocal(weekDates[0])
    const toDate = formatDateLocal(weekDates[6])

    const dailyTasks: DailyTaskData[] = weekDates.map((day, idx) => {
      const dateKey = formatDateLocal(day)
      const dayName = dayNames[day.getDay()]
      const taskData: DailyTaskData = {
        day: dayName,
        date: dateKey,
        chamCong: false,
      }

      // Initialize custom daily tasks from template - chỉ khởi tạo tasks áp dụng cho nhân viên hiện tại
      dailyTaskTemplate.forEach((templateTask) => {
        // Kiểm tra xem task có áp dụng cho nhân viên hiện tại không
        const appliesToUser = !templateTask.appliesTo || 
                              templateTask.appliesTo.length === 0 || 
                              (username && templateTask.appliesTo.includes(username))
        
        if (appliesToUser) {
          if (templateTask.type === "boolean") {
            taskData[templateTask.id] = false
          } else {
            taskData[templateTask.id] = []
          }
        }
      })

      return taskData
    })

    return {
      dateRange: {
        from: fromDate,
        to: toDate,
      },
      weeklyTasks: [],
      deXuat: ["", "", ""],
      dailyTasks,
    }
  }

  const fetchAttendanceData = async () => {
    try {
      setIsLoadingAttendance(true)
      const response = await attendanceApiRequest.get()
      if (response && Array.isArray(response)) {
        setAllAttendanceData(response)
      }
    } catch (error: any) {
      console.error("Error fetching attendance data:", error)
      toast.error(error.response?.data?.error || TOAST_MESSAGES.LOAD_ERROR, { duration: 3000 })
    } finally {
      setIsLoadingAttendance(false)
    }
  }


  const fetchDailyTaskTemplate = async () => {
    try {
      setIsLoadingTemplate(true)
      const response: any = await dailyTaskTemplateApiRequest.get()
      const data = response?.data || response
      if (data && data.template) {
        setDailyTaskTemplate(data.template)
      }
    } catch (error: any) {
      console.error("Error fetching daily task template:", error)
      setDailyTaskTemplate([])
    } finally {
      setIsLoadingTemplate(false)
    }
  }

  // Function mới để fetch tất cả dữ liệu cùng lúc
  const fetchAllInitialData = useCallback(async () => {
    if (!username) return
    
    const fetchKey = `${username}_initial`
    
    // Tránh gọi nhiều lần đồng thời
    if (fetchingAllDataRef.current) return
    if (lastFetchedAllDataKeyRef.current === fetchKey && lastFetchedUsernameRef.current === username) return
    
    fetchingAllDataRef.current = true
    
    try {
      setIsLoadingAttendance(true)
      setIsLoadingTemplate(true)
      setIsLoadingWorkTask(true)
      
      const response: any = await workTaskApiRequest.getAllData()
      const data = response?.data || response

      // Set attendance data
      if (data.attendance && Array.isArray(data.attendance)) {
        setAllAttendanceData(data.attendance)
      }

      // Set daily task template
      if (data.dailyTaskTemplate && data.dailyTaskTemplate.template) {
        setDailyTaskTemplate(data.dailyTaskTemplate.template)
      }

      // Process auth data để set employeeInfo và leaderInfo
      if (data.auth && data.auth.success && data.auth.data) {
        const authResponse = data.auth
        
        // Store all users for selection dropdown
        const users: any[] = []
        const groups = ['NV', 'Admin', 'NCC', 'KH']
        for (const group of groups) {
          if (authResponse.data[group] && Array.isArray(authResponse.data[group])) {
            users.push(...authResponse.data[group])
          }
        }
        setAllUsers(users)
        
        // Fetch employee info
        let foundUser: any = null
        for (const group of groups) {
          if (authResponse.data[group] && Array.isArray(authResponse.data[group])) {
            foundUser = authResponse.data[group].find((user: any) => user.username === username)
            if (foundUser) break
          }
        }

        if (foundUser) {
          setEmployeeInfo({
            username: foundUser.username || username,
            fullname: foundUser.fullname || foundUser.username || username,
            telegram: foundUser.telegram ? `@${foundUser.telegram.replace("@", "")}` : `@${username}`,
          })
        } else {
          setEmployeeInfo({
            username: username,
            fullname: username,
            telegram: `@${username}`,
          })
        }

        // Fetch leader info
        let leader: any = null
        const userTeam = foundUser?.team || userInfo?.team
        
        if (userTeam) {
          if (authResponse.data.NV) {
            leader = authResponse.data.NV.find((nv: any) => 
              nv.position === "Leader" && nv.team === userTeam
            )
          }
        }

        if (leader) {
          setLeaderInfo({
            username: leader.username || "",
            fullname: leader.fullname || "Chưa có tên",
            telegram: leader.phone ? `@${leader.phone.replace("@", "")}` : "",
          })
        } else {
          setLeaderInfo({
            username: "",
            fullname: "Chưa có leader",
            telegram: "",
          })
        }

        lastFetchedUsernameRef.current = username
      }

      // Set work task data nếu có
      if (data.workTask) {
        const currentWeekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
        
        if (data.workTask.users && data.workTask.users[username]) {
          const userData = data.workTask.users[username]

          if (userData.weeks && userData.weeks[currentWeekKey]) {
            const weekData = userData.weeks[currentWeekKey]

            if (!weekData.deXuat && weekData.weeklyTasks && weekData.weeklyTasks.length > 0) {
              const deXuatTasks = weekData.weeklyTasks
                .filter(
                  (t: WeeklyTaskData) =>
                    t.title && (t.title === "Đề xuất 1" || t.title === "Đề xuất 2" || t.title === "Đề xuất 3"),
                )
                .sort((a: WeeklyTaskData, b: WeeklyTaskData) => {
                  const numA = Number.parseInt(a.title.replace("Đề xuất ", "")) || 0
                  const numB = Number.parseInt(b.title.replace("Đề xuất ", "")) || 0
                  return numA - numB
                })

              weekData.deXuat = deXuatTasks.map((t: WeeklyTaskData) => t.content || "")
              while (weekData.deXuat.length < 3) {
                weekData.deXuat.push("")
              }
              if (weekData.deXuat.length > 3) {
                weekData.deXuat = weekData.deXuat.slice(0, 3)
              }

              weekData.weeklyTasks = weekData.weeklyTasks.filter(
                (t: WeeklyTaskData) =>
                  !t.title || (t.title !== "Đề xuất 1" && t.title !== "Đề xuất 2" && t.title !== "Đề xuất 3"),
              )
            } else if (!weekData.deXuat) {
              weekData.deXuat = ["", "", ""]
            }

            if (data.workTask.taskIds) {
              const taskKey = `${username}_${currentWeekKey}`
              const taskId = data.workTask.taskIds[taskKey]
              if (taskId) {
                setWorkTaskIds((prev) => ({
                  ...prev,
                  [taskKey]: taskId,
                }))
              }
            }

            // Helper function để check attendance
            const checkAttendance = (date: string): boolean => {
              const dateString = date
              if (!data.attendance || data.attendance.length === 0) return false
              return data.attendance.some((record: any) => {
                const recordDate = new Date(record.date).toISOString().split("T")[0]
                return recordDate === dateString && record.username === username
              })
            }

            setUsersData((prev) => ({
              ...prev,
              users: {
                ...prev.users,
                [username]: {
                  weeks: {
                    ...(prev.users[username]?.weeks || {}),
                    [currentWeekKey]: {
                      ...weekData,
                      dailyTasks: weekData.dailyTasks.map((task: DailyTaskData) => ({
                        ...task,
                        chamCong: checkAttendance(task.date),
                      })),
                    },
                  },
                },
              },
            }))

            // Lưu giá trị ban đầu của weeklyTasks
            const originalKey = `${username}_${currentWeekKey}`
            if (weekData.weeklyTasks && weekData.weeklyTasks.length > 0) {
              originalWeeklyTasksRef.current[originalKey] = {}
              weekData.weeklyTasks.forEach((task: WeeklyTaskData) => {
                originalWeeklyTasksRef.current[originalKey][task.id] = {
                  content: task.content || "",
                  employeeNote: task.employeeNote || ""
                }
              })
            } else {
              originalWeeklyTasksRef.current[originalKey] = {}
            }
          }
        }

        // Set last fetched key
        const fetchKey = `${username}_${currentWeekKey}`
        lastFetchedWorkTaskKeyRef.current = fetchKey
        lastFetchedAllDataKeyRef.current = `${username}_initial`
      }

      // Mark as fetched
      lastFetchedUsernameRef.current = username

    } catch (error: any) {
      console.error("Error fetching all initial data:", error)
      toast.error(TOAST_MESSAGES.LOAD_ERROR, { duration: 3000 })
      
      // Fallback về các API riêng lẻ nếu API mới thất bại
      await Promise.all([
        fetchAttendanceData(),
        fetchDailyTaskTemplate(),
        fetchUserData(),
      ])
    } finally {
      setIsLoadingAttendance(false)
      setIsLoadingTemplate(false)
      setIsLoadingWorkTask(false)
      fetchingAllDataRef.current = false
    }
  }, [username, weeklyTasksWeekDates.weekNumber, userInfo?.team])

  // Ref để tránh gọi fetchWorkTaskData nhiều lần đồng thời
  const fetchingWorkTaskRef = useRef(false)
  const lastFetchedWorkTaskKeyRef = useRef<string>("")
  const lastUsernameRef = useRef<string>("")
  const lastWeekNumberRef = useRef<number>(-1)
  const fetchingAllDataRef = useRef(false)
  const lastFetchedAllDataKeyRef = useRef<string>("")
  // Ref để lưu giá trị ban đầu của weeklyTasks đã được lưu
  const originalWeeklyTasksRef = useRef<{ [key: string]: { [taskId: number]: { content?: string, employeeNote?: string } } }>({})
  // Ref để lưu giá trị ban đầu của dailyTasks cho ngày hôm nay
  const originalDailyTasksRef = useRef<{ [date: string]: DailyTaskData | null }>({})

  // Function để fetch work task data khi week thay đổi (sử dụng getAllData)
  const fetchWorkTaskData = useCallback(async () => {
    if (!username) return
    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    const fetchKey = `${username}_${weekKey}`
    
    // Reset ref nếu username hoặc week đã thay đổi
    if (lastUsernameRef.current !== username || lastWeekNumberRef.current !== weeklyTasksWeekDates.weekNumber) {
      lastFetchedWorkTaskKeyRef.current = ""
      lastUsernameRef.current = username
      lastWeekNumberRef.current = weeklyTasksWeekDates.weekNumber
    }
    
    // Nếu đang fetch thì bỏ qua
    if (fetchingWorkTaskRef.current || fetchingAllDataRef.current) return
    // Nếu đã fetch cho key này rồi thì bỏ qua
    if (lastFetchedWorkTaskKeyRef.current === fetchKey) return

    fetchingWorkTaskRef.current = true
    try {
      setIsLoadingWorkTask(true)
      // Sử dụng getAllData thay vì get để chỉ còn 1 API
      const response: any = await workTaskApiRequest.getAllData()
      const data = response?.data || response

      // Process work task data
      if (data && data.workTask && data.workTask.users && data.workTask.users[username]) {
        const userData = data.workTask.users[username]

        if (userData.weeks && userData.weeks[weekKey]) {
          const weekData = userData.weeks[weekKey]

          if (!weekData.deXuat && weekData.weeklyTasks && weekData.weeklyTasks.length > 0) {
            const deXuatTasks = weekData.weeklyTasks
              .filter(
                (t: WeeklyTaskData) =>
                  t.title && (t.title === "Đề xuất 1" || t.title === "Đề xuất 2" || t.title === "Đề xuất 3"),
              )
              .sort((a: WeeklyTaskData, b: WeeklyTaskData) => {
                const numA = Number.parseInt(a.title.replace("Đề xuất ", "")) || 0
                const numB = Number.parseInt(b.title.replace("Đề xuất ", "")) || 0
                return numA - numB
              })

            weekData.deXuat = deXuatTasks.map((t: WeeklyTaskData) => t.content || "")
            while (weekData.deXuat.length < 3) {
              weekData.deXuat.push("")
            }
            if (weekData.deXuat.length > 3) {
              weekData.deXuat = weekData.deXuat.slice(0, 3)
            }

            weekData.weeklyTasks = weekData.weeklyTasks.filter(
              (t: WeeklyTaskData) =>
                !t.title || (t.title !== "Đề xuất 1" && t.title !== "Đề xuất 2" && t.title !== "Đề xuất 3"),
            )
          } else if (!weekData.deXuat) {
            weekData.deXuat = ["", "", ""]
          }

          if (data.workTask.taskIds) {
            const taskKey = `${username}_${weekKey}`
            const taskId = data.workTask.taskIds[taskKey]
            if (taskId) {
              setWorkTaskIds((prev) => ({
                ...prev,
                [taskKey]: taskId,
              }))
            }
          }

          // Helper function để check attendance
          const checkAttendance = (date: string): boolean => {
            const dateString = date
            if (!data.attendance || data.attendance.length === 0) return false
            return data.attendance.some((record: any) => {
              const recordDate = new Date(record.date).toISOString().split("T")[0]
              return recordDate === dateString && record.username === username
            })
          }

          const dailyTasksWithHardcoded = weekData.dailyTasks.map((task: DailyTaskData) => {
            const updatedTask: any = { ...task, chamCong: checkAttendance(task.date) }
            return updatedTask as DailyTaskData
          })

          setUsersData((prev) => ({
            ...prev,
            users: {
              ...prev.users,
              [username]: {
                weeks: {
                  ...(prev.users[username]?.weeks || {}),
                  [weekKey]: {
                    ...weekData,
                    dailyTasks: dailyTasksWithHardcoded,
                  },
                },
              },
            },
          }))

          // Lưu giá trị ban đầu của weeklyTasks
          const originalKey = `${username}_${weekKey}`
            if (weekData.weeklyTasks && weekData.weeklyTasks.length > 0) {
              originalWeeklyTasksRef.current[originalKey] = {}
              weekData.weeklyTasks.forEach((task: WeeklyTaskData) => {
                originalWeeklyTasksRef.current[originalKey][task.id] = {
                  content: task.content || "",
                  employeeNote: task.employeeNote || ""
                }
              })
            } else {
              originalWeeklyTasksRef.current[originalKey] = {}
            }
        }
      }
      lastFetchedWorkTaskKeyRef.current = fetchKey
    } catch (error: any) {
      console.error("Error fetching work task data:", error)
    } finally {
      setIsLoadingWorkTask(false)
      fetchingWorkTaskRef.current = false
    }
  }, [username, weeklyTasksWeekDates.weekNumber])

  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Constants cho toast messages để tránh duplicate và tối ưu
  const TOAST_MESSAGES = useMemo(() => ({
    ONLY_TODAY: "Chỉ có thể cập nhật công việc hàng ngày trong ngày hôm nay",
    ONLY_TODAY_CHECKIN: "Chỉ có thể chấm công cho ngày hôm nay",
    ALREADY_CHECKED_IN: "Đã chấm công rồi, không thể hủy",
    SAVE_SUCCESS: "Đã lưu thành công",
    UPDATE_SUCCESS: "Đã cập nhật thành công",
    CREATE_SUCCESS: "Đã tạo mới thành công",
    CHECKIN_SUCCESS: "Chấm công thành công",
    SAVE_ERROR: "Có lỗi xảy ra khi lưu dữ liệu",
    LOAD_ERROR: "Có lỗi xảy ra khi tải dữ liệu",
  }), [])

  const saveWorkTaskDataImmediate = async (weekData: WeekData, weekNumber: string, showToast: boolean = true) => {
    if (!username || isSavingWorkTask) return

    try {
      setIsSavingWorkTask(true)
      const weekKey = weekNumber
      const taskKey = `${username}_${weekKey}` // Key đầy đủ: username_weekNumber

      const existingId = workTaskIds[taskKey]
      console.log('[Save Work Task] Username:', username)
      console.log('[Save Work Task] TaskKey:', taskKey)
      console.log('[Save Work Task] Existing ID:', existingId)

      if (existingId) {
        // Cập nhật dữ liệu đã tồn tại
        await workTaskApiRequest.update({
          id: existingId,
          weekData: weekData,
          weekNumber: weekNumber,
          username: username, // Gửi username của người được chọn
        })
        if (showToast) {
          toast.success("Đã cập nhật thành công", { duration: 2000 })
        }
      } else {
        // Tạo mới dữ liệu
        const response: any = await workTaskApiRequest.create({
          weekNumber: weekNumber,
          weekData: weekData,
          username: username, // Gửi username của người được chọn
        })
        const data = response?.data || response
        if (data && data.id) {
          setWorkTaskIds((prev) => ({
            ...prev,
            [taskKey]: data.id, // Sử dụng taskKey đầy đủ
          }))
          if (showToast) {
            toast.success("Đã tạo mới thành công", { duration: 2000 })
          }
        } else {
          if (showToast) {
            toast.success("Đã lưu thành công", { duration: 2000 })
          }
        }
      }
    } catch (error: any) {
      console.error("Error saving work task data:", error)
      toast.error(error.response?.data?.error || "Có lỗi xảy ra khi lưu dữ liệu", { duration: 3000 })
    } finally {
      setIsSavingWorkTask(false)
    }
  }

  const saveWorkTaskData = useCallback(async (weekData: WeekData, weekNumber: string) => {
    if (!username || isSavingWorkTask) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveWorkTaskDataImmediate(weekData, weekNumber, false)
    }, 1000)
  }, [username, isSavingWorkTask, saveWorkTaskDataImmediate])

  useEffect(() => {
    const loadData = async () => {
      if (username) {
        setIsChangingUser(true)
        // Reset employeeInfo khi username thay đổi
        setEmployeeInfo({
          username: username || "",
          fullname: "",
          telegram: `@${username}`,
        })
        // Reset ref khi username thay đổi
        lastFetchedUsernameRef.current = ""
        lastFetchedWorkTaskKeyRef.current = ""
        lastFetchedAllDataKeyRef.current = ""
        
        // Reset local state của đề xuất và weekly tasks khi username thay đổi
        setLocalDeXuat({})
        setEditingDeXuatInput({})
        setEditingWeeklyTask({})
        
        // Sử dụng API mới để fetch tất cả dữ liệu cùng lúc
        await fetchAllInitialData()
        
        setIsChangingUser(false)
      } else {
        // Nếu không có username, chỉ fetch attendance và template
        await Promise.all([
          fetchAttendanceData(),
          fetchDailyTaskTemplate(),
        ])
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  // Chỉ fetch work task khi week thay đổi và đã có username (không fetch khi username thay đổi vì đã fetch trong fetchAllInitialData)
  useEffect(() => {
    if (username && lastFetchedUsernameRef.current === username) {
      // Chỉ fetch nếu username không thay đổi (nghĩa là chỉ week thay đổi)
      const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
      const fetchKey = `${username}_${weekKey}`
      
      // Chỉ fetch nếu chưa có data cho week này
      if (lastFetchedWorkTaskKeyRef.current !== fetchKey) {
        fetchWorkTaskData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyTasksWeekOffset, weeklyTasksWeekDates.weekNumber])

  // Tắt loading ban đầu sau khi đã load xong dữ liệu
  useEffect(() => {
    if (!isLoadingTemplate && !isLoadingWorkTask && username) {
      setIsInitialLoading(false)
    }
  }, [isLoadingTemplate, isLoadingWorkTask, username])

  // Set header data
  useEffect(() => {
    setHeaderData({
      title: "Quản lý công việc",
      subTitle: "Theo dõi và quản lý công việc hàng ngày, tuần",
      tabs: [],
      activeTab: "",
      onTabChange: () => {},
      refreshButton: false,
      customControls: null,
    })
  }, [setHeaderData])

  const getAttendanceStatus = (date: string): boolean => {
    const dateString = date
    if (!allAttendanceData || allAttendanceData.length === 0) return false

    return allAttendanceData.some((record) => {
      const recordDate = new Date(record.date).toISOString().split("T")[0]
      return recordDate === dateString && record.username === username
    })
  }

  useEffect(() => {
    if (!username) return

    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    setUsersData((prev) => {
      const currentUser = prev.users[username] || { weeks: {} }
      if (!currentUser.weeks[weekKey]) {
        const newData = initializeWeekData(weeklyTasksWeekOffset)
        const syncedData = {
          ...newData,
          dailyTasks: newData.dailyTasks.map((task) => ({
            ...task,
            chamCong: getAttendanceStatus(task.date),
          })),
        }
        return {
          ...prev,
          users: {
            ...prev.users,
            [username]: {
              weeks: {
                ...currentUser.weeks,
                [weekKey]: syncedData,
              },
            },
          },
        }
      } else {
        const syncedData = {
          ...currentUser.weeks[weekKey],
          dailyTasks: currentUser.weeks[weekKey].dailyTasks.map((task) => ({
            ...task,
            chamCong: getAttendanceStatus(task.date),
          })),
        }
        return {
          ...prev,
          users: {
            ...prev.users,
            [username]: {
              weeks: {
                ...currentUser.weeks,
                [weekKey]: syncedData,
              },
            },
          },
        }
      }
    })
  }, [
    weeklyTasksWeekOffset,
    weeklyTasksWeekDates.weekNumber,
    weeklyTasksWeekDates.startDate,
    allAttendanceData,
    username,
    dailyTaskTemplate.length, // Thêm dependency để update khi template thay đổi
  ])

  const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
  const currentUserData = usersData.users[username]
  const currentWeekData =
    currentUserData?.weeks[weekKey] || (username ? initializeWeekData(weeklyTasksWeekOffset) : null)

  const deXuat: string[] =
    currentWeekData?.deXuat ||
    (currentWeekData?.weeklyTasks?.length > 0
      ? currentWeekData.weeklyTasks
          .filter(
            (t: WeeklyTaskData) =>
              t.title && (t.title === "Đề xuất 1" || t.title === "Đề xuất 2" || t.title === "Đề xuất 3"),
          )
          .sort((a: WeeklyTaskData, b: WeeklyTaskData) => {
            const numA = Number.parseInt(a.title.replace("Đề xuất ", "")) || 0
            const numB = Number.parseInt(b.title.replace("Đề xuất ", "")) || 0
            return numA - numB
          })
          .map((t: WeeklyTaskData) => t.content || "")
      : ["", "", ""])

  while (deXuat.length < 3) {
    deXuat.push("")
  }

  if (deXuat.length > 3) {
    deXuat.splice(3)
  }

  const weeklyTasks = (currentWeekData?.weeklyTasks || []).filter(
    (task: WeeklyTaskData) =>
      !task.title || (task.title !== "Đề xuất 1" && task.title !== "Đề xuất 2" && task.title !== "Đề xuất 3"),
  )

  const dailyTasks = currentWeekData
    ? currentWeekData.dailyTasks.map((task) => ({
        ...task,
        chamCong: getAttendanceStatus(task.date),
      }))
    : []

  // Lưu giá trị ban đầu của daily tasks cho ngày hôm nay khi dữ liệu được tải
  useEffect(() => {
    const today = getTodayLocal()
    const todayTask = dailyTasks.find((task) => task.date === today)
    if (todayTask && !originalDailyTasksRef.current[today]) {
      originalDailyTasksRef.current[today] = { ...todayTask }
    }
  }, [dailyTasks])

  // Custom daily tasks from template - chỉ hiển thị tasks áp dụng cho nhân viên hiện tại
  const customDailyTasks = useMemo(() => {
    return dailyTaskTemplate.filter((task) => {
      // Nếu không có appliesTo hoặc appliesTo rỗng, áp dụng cho tất cả
      if (!task.appliesTo || task.appliesTo.length === 0) {
        return true
      }
      // Nếu có appliesTo, chỉ hiển thị nếu username hiện tại nằm trong danh sách
      return task.appliesTo.includes(username)
    })
  }, [dailyTaskTemplate, username])

  const updateWeekData = useCallback(async (updater: (data: WeekData) => WeekData, shouldSave = true) => {
    if (!username) return
    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    let updatedData: WeekData | null = null

    setUsersData((prev) => {
      const currentUser = prev.users[username] || { weeks: {} }
      const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)
      updatedData = updater(current)
      return {
        ...prev,
        users: {
          ...prev.users,
          [username]: {
            weeks: {
              ...currentUser.weeks,
              [weekKey]: updatedData,
            },
          },
        },
      }
    })

    if (shouldSave && updatedData) {
      saveWorkTaskData(updatedData!, weeklyTasksWeekDates.weekNumber.toString())
    }
  }, [username, weeklyTasksWeekDates.weekNumber, weeklyTasksWeekOffset, saveWorkTaskData])

  const toggleDailyTask = async (date: string, taskId: string) => {
    if (taskId === "chamCong") {
      // Mở trang chấm công khi click vào ô chấm công
      router.push("/dashboard/cham-cong")
      return
    } else {
      // Kiểm tra chỉ cho phép sửa trong ngày hôm nay
      const today = getTodayLocal()
      if (date !== today) {
        toast.error(TOAST_MESSAGES.ONLY_TODAY, { duration: 2000 })
        return
      }

      // Tự động lưu khi toggle
      updateWeekData((data) => ({
        ...data,
        dailyTasks: data.dailyTasks.map((task) =>
          task.date === date ? { ...task, [taskId]: !(task[taskId] as boolean) } : task,
        ),
      }), true)
    }
  }

  const updateCustomTaskValue = (date: string, taskId: string, index: number, value: string) => {
    // Kiểm tra chỉ cho phép sửa trong ngày hôm nay
    const today = getTodayLocal()
    if (date !== today) {
      toast.error("Chỉ có thể cập nhật công việc hàng ngày trong ngày hôm nay")
      return
    }

    // Không tự động lưu, chỉ cập nhật state
    updateWeekData((data) => ({
      ...data,
      dailyTasks: data.dailyTasks.map((task) => {
        if (task.date === date) {
          const taskValue = (task[taskId] as string[]) || []
          if (taskValue.length === 0 && index === 0) {
            return { ...task, [taskId]: [value] }
          }
          return { ...task, [taskId]: taskValue.map((item, i) => (i === index ? value : item)) }
        }
        return task
      }),
    }), false)
  }

  const addCustomTaskInput = (date: string, taskId: string) => {
    // Kiểm tra chỉ cho phép sửa trong ngày hôm nay
    const today = getTodayLocal()
    if (date !== today) {
      toast.error("Chỉ có thể cập nhật công việc hàng ngày trong ngày hôm nay")
      return
    }

    // Không tự động lưu, chỉ cập nhật state
    updateWeekData((data) => ({
      ...data,
      dailyTasks: data.dailyTasks.map((task) =>
        task.date === date ? { ...task, [taskId]: [...(task[taskId] as string[]), ""] } : task,
      ),
    }), false)
  }

  const removeCustomTaskInput = (date: string, taskId: string, index: number) => {
    // Kiểm tra chỉ cho phép sửa trong ngày hôm nay
    const today = getTodayLocal()
    if (date !== today) {
      toast.error(TOAST_MESSAGES.ONLY_TODAY, { duration: 2000 })
      return
    }

    // Không tự động lưu, chỉ cập nhật state
    updateWeekData((data) => ({
      ...data,
      dailyTasks: data.dailyTasks.map((task) =>
        task.date === date ? { ...task, [taskId]: (task[taskId] as string[]).filter((_, i) => i !== index) } : task,
      ),
    }), false)
  }

  const normalizeTaskName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "")
  }

  const addCustomDailyTask = async (name: string, type: DailyTaskDataType, selectedEmployees: string[] = []) => {
    const taskId = normalizeTaskName(name)
    if (dailyTaskTemplate.some((t) => t.id === taskId)) {
      toast.error("Công việc này đã tồn tại", { duration: 2000 })
      return
    }

    setIsLoadingTemplate(true)

    const newTask: CustomDailyTask = {
      id: taskId,
      fullname: name.trim(),
      type,
      appliesTo: selectedEmployees.length > 0 ? selectedEmployees : undefined, // Nếu không chọn nhân viên nào thì undefined (áp dụng cho tất cả)
    }

    const updatedTemplate = [...dailyTaskTemplate, newTask]

    try {
      await dailyTaskTemplateApiRequest.update({ template: updatedTemplate })
      setDailyTaskTemplate(updatedTemplate)
      
      // Chỉ cập nhật weekData cho nhân viên hiện tại nếu task áp dụng cho họ
      const shouldApplyToCurrentUser = !newTask.appliesTo || newTask.appliesTo.length === 0 || newTask.appliesTo.includes(username)
      
      if (shouldApplyToCurrentUser) {
        updateWeekData((data) => {
          return {
            ...data,
            dailyTasks: data.dailyTasks.map((task) => {
              if (type === "boolean") {
                return { ...task, [taskId]: false }
              } else {
                return { ...task, [taskId]: [] }
              }
            }),
          }
        })
      }
      
      // Gửi tin nhắn Telegram khi giao việc (gộp tất cả người nhận vào 1 tin nhắn)
      if (isAdmin && userInfo) {
        const assignerName = `${userInfo.username}-${userInfo.fullname || userInfo.username}`
        const taskTypeText = type === "boolean" ? "True/False" : "Text"
        
        // Xác định danh sách nhân viên nhận việc
        const recipients = selectedEmployees.length > 0 
          ? selectedEmployees 
          : allUsers.filter((u: any) => u.role === "Nhân viên").map((u: any) => u.username)
        
        // Lấy thông tin của tất cả người nhận
        const recipientList: string[] = []
        for (const recipientUsername of recipients) {
          const recipient = allUsers.find((u: any) => u.username === recipientUsername)
          if (recipient) {
            const recipientName = `${recipient.username}-${recipient.fullname || recipient.username}`
            const recipientTelegram = recipient.telegram || recipient.phone || recipient.username
            const telegramHandle = recipientTelegram.replace("@", "")
            recipientList.push(`${recipientName} @${telegramHandle}`)
          }
        }
        
        // Gửi 1 tin nhắn duy nhất với tất cả người nhận
        if (recipientList.length > 0) {
          const recipientsText = recipientList.join("\n  • ")
          
          const message = `📋 Giao công việc hàng ngày\n\n` +
            `Công việc: ${name.trim()}\n` +
            `Loại: ${taskTypeText}\n\n` +
            `Người giao: ${assignerName}\n` +
            `Người nhận:\n  • ${recipientsText}`
          
          try {
            await telegramApiRequest.sendMessage({
              chatId: "-1003124919874_156",
              message: message,
            })
          } catch (telegramError) {
            console.error("Error sending Telegram message:", telegramError)
            // Không hiển thị lỗi cho user, chỉ log
          }
        }
      }
      
      const employeeText = selectedEmployees.length > 0 
        ? ` cho ${selectedEmployees.length} nhân viên được chọn`
        : " cho tất cả nhân viên"
      toast.success(`Đã thêm công việc mới${employeeText}. Thay đổi sẽ áp dụng cho tuần tiếp theo.`, { duration: 3000 })
    } catch (error: any) {
      console.error("Error adding custom daily task:", error)
      toast.error("Có lỗi xảy ra khi thêm công việc", { duration: 3000 })
    } finally {
      setIsLoadingTemplate(false)
    }
  }

  const updateCustomDailyTask = async (taskId: string, name: string, type?: DailyTaskDataType) => {
    const newTaskId = normalizeTaskName(name)
    const currentTask = dailyTaskTemplate.find((t) => t.id === taskId)
    if (!currentTask) return

    const newType = type || currentTask.type

    if (newTaskId !== taskId) {
      if (dailyTaskTemplate.some((t) => t.id === newTaskId && t.id !== taskId)) {
        toast.error("Tên công việc này đã tồn tại", { duration: 2000 })
        return
      }
    }

    setIsLoadingTemplate(true)

    const updatedTemplate = dailyTaskTemplate.map((task) => {
      if (task.id === taskId) {
        return {
          id: newTaskId,
          fullname: name.trim(),
          type: newType,
          appliesTo: currentTask.appliesTo, // Giữ nguyên appliesTo khi cập nhật
        }
      }
      return task
    })

    try {
      await dailyTaskTemplateApiRequest.update({ template: updatedTemplate })
      setDailyTaskTemplate(updatedTemplate)
      toast.success("Đã cập nhật công việc. Thay đổi sẽ áp dụng cho tuần tiếp theo.", { duration: 3000 })

      if (newTaskId !== taskId || (type && type !== currentTask.type)) {
        updateWeekData((data) => {
          return {
            ...data,
            dailyTasks: data.dailyTasks.map((task) => {
              const value = (task as any)[taskId]
              const { [taskId]: removed, ...rest } = task
              const newTask: any = { ...rest }

              if (type && type !== currentTask.type) {
                if (newType === "boolean") {
                  newTask[newTaskId] = false
                } else {
                  newTask[newTaskId] = []
                }
              } else {
                newTask[newTaskId] = value
              }
              return newTask as DailyTaskData
            }),
          }
        })
      }
    } catch (error: any) {
      console.error("Error updating custom daily task:", error)
      toast.error("Có lỗi xảy ra khi cập nhật công việc")
    } finally {
      setIsLoadingTemplate(false)
    }
  }

  const removeCustomDailyTask = async (taskId: string) => {
    const taskToDelete = dailyTaskTemplate.find((t) => t.id === taskId)
    
    toast.promise(
      new Promise(async (resolve, reject) => {
        try {
          const updatedTemplate = dailyTaskTemplate.filter((t) => t.id !== taskId)
          setIsLoadingTemplate(true)

          await dailyTaskTemplateApiRequest.update({ template: updatedTemplate })
          setDailyTaskTemplate(updatedTemplate)

          updateWeekData((data) => ({
            ...data,
            dailyTasks: data.dailyTasks.map((task) => {
              const { [taskId]: removed, ...rest } = task
              return rest as DailyTaskData
            }),
          }))
          resolve(undefined)
        } catch (error: any) {
          console.error("Error removing custom daily task:", error)
          reject(error)
        } finally {
          setIsLoadingTemplate(false)
        }
      }),
      {
        loading: "Đang xóa công việc...",
        success: "Đã xóa công việc. Thay đổi sẽ áp dụng cho tuần tiếp theo.",
        error: "Có lỗi xảy ra khi xóa công việc",
      }
    )
  }

  // State để edit các custom task text
  const [editingCustomTaskText, setEditingCustomTaskText] = useState<{ [key: string]: { index: number | null; value: string } }>({})

  // Các hàm cho custom task text
  const addCustomTaskTextInput = (date: string, taskId: string) => {
    // Kiểm tra chỉ cho phép sửa trong ngày hôm nay
    const today = getTodayLocal()
    if (date !== today) {
      toast.error("Chỉ có thể cập nhật công việc hàng ngày trong ngày hôm nay")
      return
    }

    const key = `${date}_${taskId}_new`
    setEditingCustomTaskText((prev) => ({
      ...prev,
      [key]: { index: null, value: "" },
    }))
  }

  const saveCustomTaskTextInput = async (date: string, taskId: string, index: number | null, value: string) => {
    // Kiểm tra chỉ cho phép sửa trong ngày hôm nay
    const today = getTodayLocal()
    if (date !== today) {
      toast.error("Chỉ có thể cập nhật công việc hàng ngày trong ngày hôm nay")
      const key = index !== null ? `${date}_${taskId}_${index}` : `${date}_${taskId}_new`
      setEditingCustomTaskText((prev) => {
        const newState = { ...prev }
        delete newState[key]
        return newState
      })
      return
    }

    if (!value.trim()) {
      const key = index !== null ? `${date}_${taskId}_${index}` : `${date}_${taskId}_new`
      setEditingCustomTaskText((prev) => {
        const newState = { ...prev }
        delete newState[key]
        return newState
      })
      return
    }

    // Cập nhật state và lưu vào database
    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    const currentUser = usersData.users[username] || { weeks: {} }
    const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)
    
    // Kiểm tra xem dailyTask cho ngày này có tồn tại không
    const existingTaskIndex = current.dailyTasks.findIndex((task) => task.date === date)
    
    let updatedWeekData: WeekData
    
    if (existingTaskIndex === -1) {
      // Nếu không tồn tại, tạo mới dailyTask cho ngày này
      const dateObj = new Date(date)
      const dayName = dayNames[dateObj.getDay()]
      const newTask: DailyTaskData = {
        day: dayName,
        date: date,
        chamCong: false,
      }
      
      // Khởi tạo tất cả các task từ template
      dailyTaskTemplate.forEach((templateTask) => {
        if (templateTask.type === "boolean") {
          newTask[templateTask.id] = false
        } else {
          newTask[templateTask.id] = []
        }
      })
      
      // Thêm giá trị mới vào task
      const taskValue = ((newTask as any)[taskId] as string[]) || []
      if (index !== null) {
        newTask[taskId] = taskValue.map((item, i) => (i === index ? value.trim() : item))
      } else {
        newTask[taskId] = [...taskValue, value.trim()]
      }
      
      updatedWeekData = {
        ...current,
        dailyTasks: [...current.dailyTasks, newTask],
      }
    } else {
      // Nếu đã tồn tại, cập nhật
      updatedWeekData = {
        ...current,
        dailyTasks: current.dailyTasks.map((task) => {
          if (task.date === date) {
            const taskValue = ((task as any)[taskId] as string[]) || []
            if (index !== null) {
              return { ...task, [taskId]: taskValue.map((item, i) => (i === index ? value.trim() : item)) }
            } else {
              return { ...task, [taskId]: [...taskValue, value.trim()] }
            }
          }
          return task
        }),
      }
    }

    setUsersData((prev) => ({
      ...prev,
      users: {
        ...prev.users,
        [username]: {
          weeks: {
            ...currentUser.weeks,
            [weekKey]: updatedWeekData,
          },
        },
      },
    }))

    // Lưu vào database
    try {
      const taskKey = `${date}_${taskId}`
      setSavingCustomTask((prev) => ({ ...prev, [taskKey]: true }))
      await saveWorkTaskDataImmediate(updatedWeekData, weeklyTasksWeekDates.weekNumber.toString(), false)
      
      // Cập nhật giá trị ban đầu sau khi lưu
      const todayTask = updatedWeekData.dailyTasks.find((task) => task.date === today)
      if (todayTask) {
        originalDailyTasksRef.current[today] = { ...todayTask }
      }
      
      toast.success(TOAST_MESSAGES.SAVE_SUCCESS, { duration: 2000 })
    } catch (error) {
      console.error("Error saving custom task text input:", error)
      toast.error(TOAST_MESSAGES.SAVE_ERROR, { duration: 3000 })
    } finally {
      const taskKey = `${date}_${taskId}`
      setSavingCustomTask((prev) => {
        const newState = { ...prev }
        delete newState[taskKey]
        return newState
      })
    }

    const key = index !== null ? `${date}_${taskId}_${index}` : `${date}_${taskId}_new`
    setEditingCustomTaskText((prev) => {
      const newState = { ...prev }
      delete newState[key]
      return newState
    })
  }

  const editCustomTaskTextInput = (date: string, taskId: string, index: number, currentValue: string) => {
    // Kiểm tra chỉ cho phép sửa trong ngày hôm nay
    const today = getTodayLocal()
    if (date !== today) {
      toast.error("Chỉ có thể cập nhật công việc hàng ngày trong ngày hôm nay")
      return
    }

    const key = `${date}_${taskId}_${index}`
    setEditingCustomTaskText((prev) => ({
      ...prev,
      [key]: { index, value: currentValue },
    }))
  }

  const cancelEditCustomTaskTextInput = (date: string, taskId: string, index: number | null) => {
    const key = index !== null ? `${date}_${taskId}_${index}` : `${date}_${taskId}_new`
    setEditingCustomTaskText((prev) => {
      const newState = { ...prev }
      delete newState[key]
      return newState
    })
  }

  const saveDeXuatInput = async (index: number, value: string) => {
    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    const currentUser = usersData.users[username] || { weeks: {} }
    const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)
    const currentDeXuat = current.deXuat || ["", "", ""]

    while (currentDeXuat.length < 3) {
      currentDeXuat.push("")
    }
    if (currentDeXuat.length > 3) {
      currentDeXuat.splice(3)
    }

    const updatedDeXuat = [...currentDeXuat]
    if (index >= 0 && index < 3) {
      updatedDeXuat[index] = value.trim()
    }

    const filteredWeeklyTasks = (current.weeklyTasks || []).filter(
      (task: WeeklyTaskData) =>
        !task.title || (task.title !== "Đề xuất 1" && task.title !== "Đề xuất 2" && task.title !== "Đề xuất 3"),
    )

    const updatedWeekData: WeekData = {
      ...current,
      deXuat: updatedDeXuat,
      weeklyTasks: filteredWeeklyTasks,
    }

    setUsersData((prev) => ({
      ...prev,
      users: {
        ...prev.users,
        [username]: {
          weeks: {
            ...currentUser.weeks,
            [weekKey]: updatedWeekData,
          },
        },
      },
    }))

    try {
      await saveWorkTaskDataImmediate(updatedWeekData, weeklyTasksWeekDates.weekNumber.toString())
      toast.success(TOAST_MESSAGES.SAVE_SUCCESS, { duration: 2000 })
      
      // Gửi đề xuất đến Telegram nếu có nội dung
      if (value.trim()) {
        try {
          const currentName = employeeInfo.fullname || userInfo?.fullname || username
          const message = `💡 Đề xuất\n\nNội dung: ${value.trim()}\n\n${username}-${currentName}.`
          
          await telegramApiRequest.sendMessage({
            chatId: "-1003124919874_156",
            message: message,
          })
        } catch (telegramError) {
          console.error("Error sending deXuat to Telegram:", telegramError)
          // Không hiển thị lỗi cho user, chỉ log
        }
      }
    } catch (error) {
      console.error("Error saving deXuat:", error)
    }

    setEditingDeXuat((prev) => {
      const newState = { ...prev }
      delete newState[index]
      return newState
    })
  }

  const editDeXuatInput = (index: number, currentValue: string) => {
    setEditingDeXuat((prev) => ({
      ...prev,
      [index]: currentValue,
    }))
  }

  const cancelEditDeXuat = (index: number) => {
    setEditingDeXuat((prev) => {
      const newState = { ...prev }
      delete newState[index]
      return newState
    })
  }

  const navigateWeek = (direction: "prev" | "next") => {
    setWeeklyTasksWeekOffset((prev) => (direction === "prev" ? prev - 1 : prev + 1))
  }

  const editWeeklyTaskFunc = (taskId: number, currentValue: string) => {
    setEditingWeeklyTask((prev) => ({
      ...prev,
      [taskId]: currentValue,
    }))
  }

  const cancelEditWeeklyTask = (taskId: number) => {
    setEditingWeeklyTask((prev) => {
      const newState = { ...prev }
      delete newState[taskId]
      return newState
    })
  }

  const saveWeeklyTask = async (taskId: number, value: string) => {
    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    const currentUser = usersData.users[username] || { weeks: {} }
    const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)

    const updatedWeekData: WeekData = {
      ...current,
      weeklyTasks: (current.weeklyTasks || []).map((task) => (task.id === taskId ? { ...task, content: value.trim() } : task)),
    }

    setUsersData((prev) => ({
      ...prev,
      users: {
        ...prev.users,
        [username]: {
          weeks: {
            ...currentUser.weeks,
            [weekKey]: updatedWeekData,
          },
        },
      },
    }))

    try {
      await saveWorkTaskDataImmediate(updatedWeekData, weeklyTasksWeekDates.weekNumber.toString())
      toast.success(TOAST_MESSAGES.SAVE_SUCCESS, { duration: 2000 })
    } catch (error) {
      console.error("Error saving weekly task:", error)
      toast.error(TOAST_MESSAGES.SAVE_ERROR, { duration: 3000 })
    }

    setEditingWeeklyTask((prev) => {
      const newState = { ...prev }
      delete newState[taskId]
      return newState
    })
  }

  const addNewWeeklyTask = () => {
    updateWeekData((data) => {
      const weeklyTasks = data.weeklyTasks || []
      const maxId = weeklyTasks.length > 0 ? Math.max(...weeklyTasks.map((t) => t.id), 0) : 0
      return {
        ...data,
        weeklyTasks: [...weeklyTasks, { id: maxId + 1, title: "Công việc khác", content: "", status: "pending" }],
      }
    }, false) // Không tự động lưu khi thêm task mới, Admin cần click nút "Lưu"
  }

  const saveWeeklyTasks = async () => {
    if (!username) {
      toast.error("Vui lòng chọn nhân viên")
      return
    }
    
    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    const currentUser = usersData.users[username] || { weeks: {} }
    
    // Lấy weekData hiện tại từ state (đã được update khi addNewWeeklyTask)
    // Nếu chưa có thì tạo mới với structure đầy đủ
    let current = currentUser.weeks[weekKey]
    if (!current) {
      // Nếu chưa có, tạo mới với structure đầy đủ
      current = initializeWeekData(weeklyTasksWeekOffset)
      // Đảm bảo weeklyTasks là mảng rỗng nếu chưa có
      if (!current.weeklyTasks) {
        current.weeklyTasks = []
      }
    }

    // Đảm bảo weekData có đầy đủ structure
    const completeWeekData: WeekData = {
      ...current,
      dateRange: current.dateRange || {
        from: formatDateLocal(getWeekDates(weeklyTasksWeekOffset)[0]),
        to: formatDateLocal(getWeekDates(weeklyTasksWeekOffset)[6]),
      },
      weeklyTasks: current.weeklyTasks || [],
      deXuat: current.deXuat || ["", "", ""],
      dailyTasks: current.dailyTasks || [],
    }

    // Lấy danh sách công việc mới (có nội dung) để gửi tin nhắn
    const newTasks = (completeWeekData.weeklyTasks || []).filter((task: WeeklyTaskData) => 
      task.content && task.content.trim().length > 0
    )

    console.log('[Save Weekly Tasks] Username:', username)
    console.log('[Save Weekly Tasks] WeekKey:', weekKey)
    console.log('[Save Weekly Tasks] Complete WeekData:', completeWeekData)

    try {
      setIsSavingWorkTask(true)
      await saveWorkTaskDataImmediate(completeWeekData, weeklyTasksWeekDates.weekNumber.toString(), false)
      
      // Cập nhật giá trị ban đầu sau khi lưu
      const originalKey = `${username}_${weekKey}`
      if (!originalWeeklyTasksRef.current[originalKey]) {
        originalWeeklyTasksRef.current[originalKey] = {}
      }
      (completeWeekData.weeklyTasks || []).forEach((task: WeeklyTaskData) => {
        originalWeeklyTasksRef.current[originalKey][task.id] = {
          content: task.content || "",
          employeeNote: task.employeeNote || ""
        }
      })
      
      // Gửi tin nhắn Telegram khi giao việc tuần (chỉ khi có công việc mới/thay đổi và là Admin/Leader)
      if (isAdmin && userInfo && newTasks.length > 0) {
        const assignerName = `${userInfo.username}-${userInfo.fullname || userInfo.username}`
        const recipient = allUsers.find((u: any) => u.username === username)
        
        if (recipient) {
          const recipientName = `${recipient.username}-${recipient.fullname || recipient.username}`
          const recipientTelegram = recipient.telegram || recipient.phone || recipient.username
          const telegramHandle = recipientTelegram.replace("@", "")
          
          // Lấy danh sách công việc ban đầu để so sánh
          const originalKey = `${username}_${weekKey}`
          const originalTasks = originalWeeklyTasksRef.current[originalKey] || {}
          
          // Gửi tin nhắn cho từng công việc có nội dung mới hoặc thay đổi
          for (const task of newTasks) {
            const originalTask = originalTasks[task.id]
            const originalContent = originalTask?.content || ""
            const hasContentChanged = task.content.trim() !== originalContent.trim()
            
            // Chỉ gửi nếu nội dung thay đổi hoặc công việc mới (chưa có trong original)
            if (hasContentChanged || !originalTask) {
              const message = `📋 Giao công việc tuần\n\n` +
                `Công việc: ${task.content.trim()}\n\n` +
                `Người giao: ${assignerName}\n` +
                `Người nhận: ${recipientName} @${telegramHandle}`
              
              try {
                await telegramApiRequest.sendMessage({
                  chatId: "-1003124919874_156",
                  message: message,
                })
              } catch (telegramError) {
                console.error(`Error sending Telegram message to ${username}:`, telegramError)
                // Không hiển thị lỗi cho user, chỉ log
              }
            }
          }
        }
      }
      
      toast.success(TOAST_MESSAGES.SAVE_SUCCESS, { duration: 2000 })
    } catch (error) {
      console.error("Error saving weekly tasks:", error)
      toast.error("Có lỗi khi lưu công việc khác")
    } finally {
      setIsSavingWorkTask(false)
    }
  }

  // Lấy câu hỏi ngẫu nhiên (khác với câu hiện tại nếu có)
  const getRandomQuestion = (excludeQuestion?: QuizQuestion | null) => {
    if (!excludeQuestion || quizQuestions.length === 1) {
      const randomIndex = Math.floor(Math.random() * quizQuestions.length)
      return quizQuestions[randomIndex]
    }
    
    // Lọc ra các câu hỏi khác với câu hiện tại
    const availableQuestions = quizQuestions.filter(q => q.CâuHỏi !== excludeQuestion.CâuHỏi)
    const randomIndex = Math.floor(Math.random() * availableQuestions.length)
    return availableQuestions[randomIndex]
  }

  // Mở modal quiz với câu hỏi ngẫu nhiên
  const openQuizModal = (date: string) => {
    const question = getRandomQuestion()
    setCurrentQuestion(question)
    setSelectedAnswer(null)
    setPendingSaveDate(date)
    setCorrectAnswersCount(0)
    setWrongAnswers([])
    setShowQuizModal(true)
  }

  // Đóng modal quiz
  const closeQuizModal = () => {
    setShowQuizModal(false)
    setCurrentQuestion(null)
    setSelectedAnswer(null)
    setPendingSaveDate(null)
    setCorrectAnswersCount(0)
    setWrongAnswers([])
  }

  // Xử lý submit câu trả lời
  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return

    if (selectedAnswer === currentQuestion.ĐápÁnĐúng) {
      // Đáp án đúng
      const newCorrectCount = correctAnswersCount + 1
      setCorrectAnswersCount(newCorrectCount)
      
      if (newCorrectCount >= requiredCorrectAnswers) {
        // Đã đủ 3 câu đúng - tiếp tục lưu công việc hàng ngày
        toast.success("Hoàn thành! Đang lưu công việc hàng ngày...")
        const currentWrongAnswers = [...wrongAnswers]
        closeQuizModal()
        if (pendingSaveDate) {
          processSaveDailyTasks(pendingSaveDate, currentWrongAnswers)
        }
      } else {
        // Chưa đủ 3 câu - tiếp tục với câu hỏi mới (khác câu hiện tại)
        toast.success(`Chính xác! Còn ${requiredCorrectAnswers - newCorrectCount} câu nữa.`)
        const newQuestion = getRandomQuestion(currentQuestion)
        setCurrentQuestion(newQuestion)
        setSelectedAnswer(null)
      }
    } else {
      // Đáp án sai - lưu câu hỏi sai, reset về 0 và bắt đầu lại với câu hỏi ngẫu nhiên khác
      toast.error("Sai rồi! Bắt đầu lại từ đầu nhé.")
      setWrongAnswers(prev => [...prev, currentQuestion.CâuHỏi])
      setCorrectAnswersCount(0)
      const newQuestion = getRandomQuestion(currentQuestion)
      setCurrentQuestion(newQuestion)
      setSelectedAnswer(null)
    }
  }

  // Xử lý lưu công việc hàng ngày thực tế (được gọi sau khi trả lời đúng câu hỏi)
  const processSaveDailyTasks = async (date: string, wrongAnswersList: string[]) => {
    if (!username) {
      toast.error("Vui lòng chọn nhân viên")
      return
    }

    // Kiểm tra chỉ cho phép lưu trong ngày hôm nay
    const today = getTodayLocal()
    if (date !== today) {
      toast.error("Chỉ có thể lưu công việc hàng ngày trong ngày hôm nay")
      return
    }

    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    const currentUser = usersData.users[username] || { weeks: {} }
    const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)

    try {
      setIsSavingWorkTask(true)
      
      const completeWeekData: WeekData = {
        ...current,
        dateRange: current.dateRange || {
          from: getWeekDates(weeklyTasksWeekOffset)[0].toISOString().split("T")[0],
          to: getWeekDates(weeklyTasksWeekOffset)[6].toISOString().split("T")[0],
        },
        weeklyTasks: current.weeklyTasks || [],
        deXuat: current.deXuat || ["", "", ""],
        dailyTasks: current.dailyTasks || [],
      }

      await saveWorkTaskDataImmediate(completeWeekData, weeklyTasksWeekDates.weekNumber.toString(), false)
      
      // Cập nhật giá trị ban đầu sau khi lưu
      const todayTask = completeWeekData.dailyTasks.find((task) => task.date === today)
      if (todayTask) {
        originalDailyTasksRef.current[today] = { ...todayTask }
      }
      
      toast.success("Đã lưu công việc hàng ngày thành công!")
    } catch (error) {
      console.error("Error saving daily tasks:", error)
      toast.error("Có lỗi khi lưu công việc hàng ngày")
    } finally {
      setIsSavingWorkTask(false)
    }
  }

  const saveDailyTasks = async (date: string) => {
    if (!username) {
      toast.error("Vui lòng chọn nhân viên")
      return
    }

    // Kiểm tra chỉ cho phép lưu trong ngày hôm nay
    const today = getTodayLocal()
    if (date !== today) {
      toast.error("Chỉ có thể lưu công việc hàng ngày trong ngày hôm nay")
      return
    }

    // Mở modal quiz thay vì lưu trực tiếp
    openQuizModal(date)
  }

  const toggleWeeklyTaskStatus = async (taskId: number) => {
    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    const currentUser = usersData.users[username] || { weeks: {} }
    const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)
    const weeklyTasks = current.weeklyTasks || []
    const task = weeklyTasks.find((t) => t.id === taskId)
    const currentStatus = task?.status || "pending"

    const updatedWeekData: WeekData = {
      ...current,
      weeklyTasks: weeklyTasks.map((task) =>
        task.id === taskId ? { ...task, status: currentStatus === "success" ? "pending" : "success" } : task,
      ),
    }

    setUsersData((prev) => ({
      ...prev,
      users: {
        ...prev.users,
        [username]: {
          weeks: {
            ...currentUser.weeks,
            [weekKey]: updatedWeekData,
          },
        },
      },
    }))

    try {
      await saveWorkTaskDataImmediate(updatedWeekData, weeklyTasksWeekDates.weekNumber.toString())
      const newStatus = currentStatus === "success" ? "pending" : "success"
      toast.success(newStatus === "success" ? "Đã đánh dấu hoàn thành" : "Đã đánh dấu chưa xong")
    } catch (error) {
      console.error("Error updating task status:", error)
      toast.error("Có lỗi khi cập nhật trạng thái")
    }
  }

  const saveSingleTaskContent = async (taskId: number) => {
    if (!username) {
      toast.error("Vui lòng chọn nhân viên")
      return
    }
    
    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    const currentUser = usersData.users[username] || { weeks: {} }
    const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)

    const completeWeekData: WeekData = {
      ...current,
      dateRange: current.dateRange || {
        from: formatDateLocal(getWeekDates(weeklyTasksWeekOffset)[0]),
        to: formatDateLocal(getWeekDates(weeklyTasksWeekOffset)[6]),
      },
      weeklyTasks: current.weeklyTasks || [],
      deXuat: current.deXuat || ["", "", ""],
      dailyTasks: current.dailyTasks || [],
    }

    // Lấy nội dung công việc trước khi lưu để gửi tin nhắn
    const task = (completeWeekData.weeklyTasks || []).find((t) => t.id === taskId)
    const taskContent = task?.content || ""

    try {
      setIsSavingWorkTask(true)
      await saveWorkTaskDataImmediate(completeWeekData, weeklyTasksWeekDates.weekNumber.toString(), false)
      
      // Cập nhật giá trị ban đầu sau khi lưu
      const originalKey = `${username}_${weekKey}`
      if (!originalWeeklyTasksRef.current[originalKey]) {
        originalWeeklyTasksRef.current[originalKey] = {}
      }
      if (task) {
        originalWeeklyTasksRef.current[originalKey][taskId] = {
          content: task.content || "",
          employeeNote: task.employeeNote || ""
        }
      }
      
      // Gửi tin nhắn Telegram khi giao việc tuần (chỉ khi có nội dung, là Admin/Leader, và nội dung thay đổi)
      if (isAdmin && userInfo && taskContent.trim()) {
        // Kiểm tra xem nội dung có thay đổi so với ban đầu không
        const originalKey = `${username}_${weekKey}`
        const originalTask = originalWeeklyTasksRef.current[originalKey]?.[taskId]
        const originalContent = originalTask?.content || ""
        const hasContentChanged = taskContent.trim() !== originalContent.trim()
        
        // Chỉ gửi nếu nội dung thay đổi hoặc công việc mới (chưa có trong original)
        if (hasContentChanged || !originalTask) {
          const assignerName = `${userInfo.username}-${userInfo.fullname || userInfo.username}`
          const recipient = allUsers.find((u: any) => u.username === username)
          
          if (recipient) {
            const recipientName = `${recipient.username}-${recipient.fullname || recipient.username}`
            const recipientTelegram = recipient.telegram || recipient.phone || recipient.username
            const telegramHandle = recipientTelegram.replace("@", "")
            
            const message = `📋 Giao công việc tuần\n\n` +
              `Công việc: ${taskContent.trim()}\n\n` +
              `Người giao: ${assignerName}\n` +
              `Người nhận: ${recipientName} @${telegramHandle}`
            
            try {
              await telegramApiRequest.sendMessage({
                chatId: "-1003124919874_156",
                message: message,
              })
            } catch (telegramError) {
              console.error(`Error sending Telegram message to ${username}:`, telegramError)
              // Không hiển thị lỗi cho user, chỉ log
            }
          }
        }
      }
      
      toast.success("Đã lưu nội dung công việc!")
    } catch (error) {
      console.error("Error saving task content:", error)
      toast.error("Có lỗi khi lưu nội dung công việc")
    } finally {
      setIsSavingWorkTask(false)
    }
  }

  const removeWeeklyTask = async (taskId: number) => {
    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
    const currentUser = usersData.users[username] || { weeks: {} }
    const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)

    const updatedWeekData: WeekData = {
      ...current,
      weeklyTasks: (current.weeklyTasks || []).filter((task) => task.id !== taskId),
    }

    setUsersData((prev) => ({
      ...prev,
      users: {
        ...prev.users,
        [username]: {
          weeks: {
            ...currentUser.weeks,
            [weekKey]: updatedWeekData,
          },
        },
      },
    }))

    toast.promise(
      saveWorkTaskDataImmediate(updatedWeekData, weeklyTasksWeekDates.weekNumber.toString()),
      {
        loading: "Đang xóa công việc...",
        success: "Đã xóa công việc",
        error: "Có lỗi khi xóa công việc",
      }
    )
  }

  // Compute selectable users based on role: Admin sees all users with role "Nhân viên", Leader sees only same team users with role "Nhân viên"
  const selectableUsers = useMemo(() => {
    if (!isAdmin) return []
    
    // Filter users with role === "Nhân viên"
    const employeeUsers = allUsers.filter((user) => user.username && user.role === "Nhân viên")
    
    if (userInfo?.role === "Admin") {
      // Admin sees all users with role "Nhân viên"
      return employeeUsers
        .map((user) => user.username)
        .filter((username, index, self) => self.indexOf(username) === index)
        .sort()
    } else if (userInfo?.position === "Leader" && userInfo?.team) {
      // Leader sees only users from same team with role "Nhân viên"
      return employeeUsers
        .filter((user) => user.team === userInfo.team)
        .map((user) => user.username)
        .filter((username, index, self) => self.indexOf(username) === index)
        .sort()
    }
    return []
  }, [isAdmin, allUsers, userInfo?.role, userInfo?.position, userInfo?.team])

  useEffect(() => {
    if (isAdmin && !selectedUsername && selectableUsers.length > 0) {
      // Nếu là Leader, mặc định chọn chính họ, nếu không thì chọn user đầu tiên
      if (userInfo?.position === "Leader" && userInfo?.username && selectableUsers.includes(userInfo.username)) {
        setSelectedUsername(userInfo.username)
      } else {
        setSelectedUsername(selectableUsers[0])
      }
    }
  }, [isAdmin, selectedUsername, selectableUsers, userInfo?.position, userInfo?.username])

  // Khi selectedUsername thay đổi và là Admin/Leader, đảm bảo fetch lại nếu username thay đổi
  useEffect(() => {
    if (isAdmin && selectedUsername) {
      const newUsername = selectedUsername
      // Nếu username thay đổi so với lần fetch trước, reset refs để force fetch lại
      if (lastFetchedUsernameRef.current !== newUsername) {
        lastFetchedUsernameRef.current = ""
        lastFetchedWorkTaskKeyRef.current = ""
        lastFetchedAllDataKeyRef.current = ""
      }
    }
  }, [isAdmin, selectedUsername])

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <Toaster position="top-right" expand={true} richColors />
      
      {/* Loading overlay */}
      {(isInitialLoading || isChangingUser || isLoadingTemplate || isLoadingWorkTask) && <LoadingSpinner />}

      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 items-stretch">
          {/* Daily Tasks */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-white shadow-md border border-gray-100 overflow-hidden flex flex-col flex-1">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 border-b border-blue-600 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-white" />
                    <h2 className="text-md font-bold text-white uppercase">Công việc hàng ngày</h2>
                    {(isLoadingTemplate || isLoadingWorkTask) && <Loader2 className="h-3 w-3 animate-spin ml-1 text-white" />}
                  </div>
                  
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {isAdmin && (
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-2 py-1">
                      <label className="text-xs font-medium text-white" style={{ fontSize: '9px' }}>User:</label>
                      <select
                        value={selectedUsername || ""}
                        onChange={(e) => {
                          setSelectedUsername(e.target.value)
                        }}
                        className="px-2 py-1 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]"
                        style={{ fontSize: '12px' }}
                      >
                        <option value="">-- Chọn --</option>
                        {selectableUsers.map((username) => (
                          <option key={username} value={username}>
                            {username}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
                    <User className="h-3 w-3" />
                    <div>
                      <p className="font-semibold leading-tight" style={{ fontSize: '12px' }}>
                        Nhân viên:
                      </p>
                      <p className="font-semibold leading-tight" style={{ fontSize: '12px' }}>
                        {employeeInfo.username}-{employeeInfo.fullname}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
                    <Users className="h-3 w-3" />
                    <div>
                      <p className="font-semibold leading-tight" style={{ fontSize: '12px' }}>
                        Leader:
                      </p>
                      <p className="font-semibold leading-tight" style={{ fontSize: '12px' }}>
                        {leaderInfo.username && leaderInfo.fullname !== "Chưa có leader"
                          ? `${leaderInfo.username}-${leaderInfo.fullname}`
                          : leaderInfo.fullname}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="relative">
                      <AddTaskDialog 
                        onAdd={addCustomDailyTask} 
                        selectableEmployees={selectableUsers}
                        isAdmin={isAdmin}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-2 py-3 text-center font-semibold sticky left-0 z-10 bg-blue-600 text-white" style={{ fontSize: '11px', width: '60px' }}>
                        Thứ
                      </th>
                      <th className="border border-gray-300 px-2 py-3 text-center font-semibold bg-emerald-600 text-white" style={{ fontSize: '11px', width: '100px' }}>
                        Chấm công
                      </th>
                      {customDailyTasks.map((task) => {
                        return (
                          <th
                            key={task.id}
                            className="border border-gray-300 px-3 py-3 text-center font-semibold bg-indigo-600 text-white"
                            style={{ fontSize: '11px' }}
                          >
                            <EditableTaskName
                              task={task}
                              onUpdate={(name, type) => updateCustomDailyTask(task.id, name, type)}
                              onDelete={() => removeCustomDailyTask(task.id)}
                              isAdmin={isAdmin}
                            />
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTasks.map((dailyTask) => {
                      const dateKey = dailyTask.date
                      const isToday = dateKey === getTodayLocal()
                      const isPast = new Date(dateKey) < new Date(getTodayLocal())
                      
                      // Kiểm tra xem có thay đổi so với giá trị ban đầu không
                      const originalTask = originalDailyTasksRef.current[dateKey]
                      let hasChanged = false
                      if (isToday && originalTask) {
                        // So sánh từng thuộc tính quan trọng (bỏ qua date, day, chamCong)
                        const keysToCompare = Object.keys(dailyTask).filter(key => 
                          key !== 'date' && key !== 'day' && key !== 'chamCong'
                        )
                        hasChanged = keysToCompare.some(key => {
                          const currentValue = (dailyTask as any)[key]
                          const originalValue = (originalTask as any)[key]
                          
                          if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
                            if (currentValue.length !== originalValue.length) return true
                            return currentValue.some((val: any, idx: number) => {
                              const origVal = originalValue[idx]
                              return val?.toString().trim() !== origVal?.toString().trim()
                            })
                          }
                          return JSON.stringify(currentValue) !== JSON.stringify(originalValue)
                        })
                      } else if (isToday && !originalTask) {
                        // Nếu chưa có giá trị ban đầu nhưng có dữ liệu, coi như có thay đổi
                        const hasAnyData = Object.keys(dailyTask).some(key => {
                          if (key === 'date' || key === 'day' || key === 'chamCong') return false
                          const value = (dailyTask as any)[key]
                          if (Array.isArray(value)) {
                            return value.length > 0 && value.some((v: any) => v && v.toString().trim() !== '')
                          }
                          return value && value.toString().trim() !== ''
                        })
                        hasChanged = hasAnyData
                      }
                      
                      return (
                        <tr key={dateKey} className="hover:bg-gray-50 transition-colors">
                          <td className={`border border-gray-300 px-2 py-3 text-center font-semibold sticky left-0 z-10 ${isToday ? 'bg-gradient-to-r from-blue-300 to-cyan-300 text-blue-900' : 'bg-blue-50 text-blue-900'}`} style={{ fontSize: '11px', width: '60px' }}>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-semibold">{dailyTask.day}</span>
                              <span className="font-normal opacity-70" style={{ fontSize: '9px' }}>
                                {new Date(dateKey).getDate()}/{new Date(dateKey).getMonth() + 1}
                              </span>
                              {isToday && hasChanged && (
                                <button
                                  onClick={() => saveDailyTasks(dateKey)}
                                  disabled={isSavingWorkTask}
                                  className="mt-1 p-1 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                                  title="Lưu công việc hàng ngày"
                                >
                                  {isSavingWorkTask ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-1 py-2 text-center" style={{ width: '70px' }}>
                            <button
                              onClick={() => toggleDailyTask(dateKey, "chamCong")}
                              disabled={dailyTask.chamCong}
                              className={`w-full py-2 rounded-lg font-medium transition-all ${
                                dailyTask.chamCong
                                  ? "cursor-default"
                                  : "hover:opacity-80 cursor-pointer"
                              }`}
                              style={{ 
                                fontSize: '11px',
                                background: dailyTask.chamCong 
                                  ? '#10b981' 
                                  : '#e5e7eb'
                              }}
                              title={dailyTask.chamCong ? "Đã chấm công" : "Click để chấm công"}
                            >
                              {dailyTask.chamCong ? (
                                <CheckCircle2 className="h-4 w-4 mx-auto text-white" />
                              ) : isPast ? (
                                <X className="h-4 w-4 mx-auto text-red-500" />
                              ) : (
                                <Circle className="h-4 w-4 mx-auto text-gray-500" />
                              )}
                            </button>
                          </td>
                          {customDailyTasks.map((task) => {
                            const taskValue = (dailyTask as any)[task.id]
                            const textInputs =
                              task.type === "text"
                                ? ((taskValue as string[]) || []).length === 0
                                  ? []
                                  : (taskValue as string[])
                                : []
                            const inputKey = `${dateKey}_${task.id}`
                            const showFull = showFullInputs[inputKey] || false
                            const hasContent = textInputs.length > 0
                            
                            return (
                              <td
                                key={task.id}
                                className={`border border-gray-300 px-2 ${task.type === "boolean" ? "py-2 text-center" : "py-2 align-top"}`}
                              >
                                {task.type === "boolean" ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {(() => {
                                      const taskStatus = getDailyTaskStatus(dateKey, taskValue as boolean)
                                      
                                      return (
                                        <button
                                          onClick={() => toggleDailyTask(dateKey, task.id)}
                                          disabled={!isToday && taskStatus !== "pending"}
                                          className={`flex justify-center items-center p-1.5 rounded-lg transition-all ${
                                            taskStatus === "success"
                                              ? "bg-green-100 hover:bg-green-200"
                                              : taskStatus === "failed"
                                              ? "bg-red-100 hover:bg-red-200"
                                              : "bg-gray-100 hover:bg-gray-200"
                                          } ${!isToday && taskStatus !== "pending" ? "cursor-not-allowed opacity-50" : ""}`}
                                        >
                                          {taskStatus === "success" ? (
                                            <CheckCheck className="h-4 w-4" style={{ color: '#059669' }} />
                                          ) : taskStatus === "failed" ? (
                                            <X className="h-4 w-4" style={{ color: '#dc2626' }} />
                                          ) : (
                                            <Circle className="h-4 w-4 text-gray-400" />
                                          )}
                                        </button>
                                      )
                                    })()}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {!isToday ? (
                                      // Hiển thị cho ngày hôm trước
                                      !hasContent ? (
                                        <div className="flex items-center justify-center py-2">
                                          <span className="text-xs text-gray-400">Không có gì</span>
                                        </div>
                                      ) : !showFull ? (
                                        <button
                                          onClick={() => setShowFullInputs(prev => ({ ...prev, [inputKey]: true }))}
                                          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-300 transition-colors"
                                        >
                                          <Circle className="h-3 w-3" />
                                          <span>Xem {textInputs.length} {textInputs.length === 1 ? 'mục' : 'mục'}</span>
                                        </button>
                                      ) : (
                                        <>
                                          {textInputs.map((input, idx) => (
                                            <div key={idx} className="px-2 py-1.5 bg-gradient-to-r from-gray-50 to-blue-50 text-gray-900 rounded-lg border border-gray-200 break-words" style={{ fontSize: '11px', lineHeight: '1.5' }}>
                                              {input}
                                            </div>
                                          ))}
                                          <button
                                            onClick={() => setShowFullInputs(prev => ({ ...prev, [inputKey]: false }))}
                                            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors"
                                          >
                                            <span>Ẩn</span>
                                          </button>
                                        </>
                                      )
                                    ) : (
                                      // Hiển thị cho ngày hôm nay (có thể chỉnh sửa)
                                      <>
                                        {(() => {
                                          return textInputs.map((input, idx) => {
                                            const editKey = `${dateKey}_${task.id}_${idx}`
                                            const isEditing = editingCustomTaskText[editKey] !== undefined

                                            if (isEditing) {
                                              const editValue = editingCustomTaskText[editKey].value
                                              return (
                                                <div key={idx} className="flex gap-1">
                                                  <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) =>
                                                      setEditingCustomTaskText((prev) => ({
                                                        ...prev,
                                                        [editKey]: { index: idx, value: e.target.value },
                                                      }))
                                                    }
                                                    className="flex-1 px-2 py-1.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    style={{ fontSize: '11px' }}
                                                    placeholder="..."
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter") {
                                                        saveCustomTaskTextInput(dateKey, task.id, idx, editValue)
                                                      }
                                                      if (e.key === "Escape") {
                                                        cancelEditCustomTaskTextInput(dateKey, task.id, idx)
                                                      }
                                                    }}
                                                  />
                                                  <button
                                                    onClick={() => saveCustomTaskTextInput(dateKey, task.id, idx, editValue)}
                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
                                                    style={{ color: '#2563eb' }}
                                                  >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                  </button>
                                                  <button
                                                    onClick={() => cancelEditCustomTaskTextInput(dateKey, task.id, idx)}
                                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                  >
                                                    <X className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              )
                                            }

                                            return (
                                              <div key={idx} className="flex gap-1 items-center group">
                                                <span className="flex-1 px-2 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 text-gray-900 rounded-lg break-words border border-blue-200" style={{ fontSize: '11px', lineHeight: '1.5' }}>
                                                  {input}
                                                </span>
                                                <button
                                                  onClick={() => editCustomTaskTextInput(dateKey, task.id, idx, input)}
                                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-opacity"
                                                  style={{ color: '#2563eb' }}
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={() => removeCustomTaskInput(dateKey, task.id, idx)}
                                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-opacity"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </div>
                                            )
                                          })
                                        })()}

                                        {(() => {
                                          const newKey = `${dateKey}_${task.id}_new`
                                          const isAddingNew = editingCustomTaskText[newKey] !== undefined

                                          if (isAddingNew) {
                                            const newValue = editingCustomTaskText[newKey].value
                                            return (
                                              <div className="flex gap-1">
                                                <input
                                                  type="text"
                                                  value={newValue}
                                                  onChange={(e) =>
                                                    setEditingCustomTaskText((prev) => ({
                                                      ...prev,
                                                      [newKey]: { index: null, value: e.target.value },
                                                    }))
                                                  }
                                                  className="flex-1 px-2 py-1.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                  style={{ fontSize: '11px' }}
                                                  placeholder="..."
                                                  autoFocus
                                                  onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                      saveCustomTaskTextInput(dateKey, task.id, null, newValue)
                                                    }
                                                    if (e.key === "Escape") {
                                                      cancelEditCustomTaskTextInput(dateKey, task.id, null)
                                                    }
                                                  }}
                                                />
                                                <button
                                                  onClick={() => saveCustomTaskTextInput(dateKey, task.id, null, newValue)}
                                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
                                                  style={{ color: '#2563eb' }}
                                                >
                                                  <CheckCircle2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={() => cancelEditCustomTaskTextInput(dateKey, task.id, null)}
                                                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </div>
                                            )
                                          }

                                          return (
                                            <button
                                              onClick={() => addCustomTaskTextInput(dateKey, task.id)}
                                              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-dashed border-blue-300 transition-colors"
                                            >
                                              <Plus className="h-3 w-3" />
                                              <span>Thêm mục</span>
                                            </button>
                                          )
                                        })()}
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Weekly Tasks */}
          <div className="flex flex-col">
            <div className="bg-white shadow-md border border-gray-100 overflow-hidden flex flex-col flex-1">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 border-b border-purple-600 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-white" />
                  <h2 className="text-md font-bold text-white uppercase">Công việc tuần</h2>
                </div>
                
                {/* Week selector */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => navigateWeek("prev")}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg min-w-[130px] shadow-md" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: '#ffffff' }}>
                    <span className="font-bold" style={{ fontSize: '12px' }}>{"Tuần " + weeklyTasksWeekDates.weekNumber}</span>
                    <span className="font-normal opacity-90" style={{ fontSize: '9px' }}>
                      {weeklyTasksWeekDates.startDateObj.getDate()}/{weeklyTasksWeekDates.startDateObj.getMonth() + 1}{" "}
                      - {weeklyTasksWeekDates.endDateObj.getDate()}/{weeklyTasksWeekDates.endDateObj.getMonth() + 1}
                    </span>
                  </div>
                  <button
                    onClick={() => navigateWeek("next")}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-5 flex-1 overflow-y-auto">
                {/* Đề xuất Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide" style={{ fontSize: '11px', letterSpacing: '0.05em', color: '#8b5cf6' }}>Đề xuất</h3>
                    {(() => {
                      const weekEndDate = weeklyTasksWeekDates.endDate
                      const deXuatStatus = getDeXuatStatus(deXuat, weekEndDate)
                      const statusBadgeColors = {
                        success: "bg-green-500",
                        failed: "bg-red-500",
                        pending: "bg-yellow-500"
                      }
                      const statusLabels = {
                        success: "Hoàn thành",
                        failed: "Quá hạn",
                        pending: "Đang làm"
                      }
                      return (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${statusBadgeColors[deXuatStatus]}`}>
                          {statusLabels[deXuatStatus]}
                        </span>
                      )
                    })()}
                  </div>

                  {deXuat.slice(0, 3).map((item, idx) => {
                    const isEditing = editingDeXuatInput[idx] || false
                    const localValue = localDeXuat[idx] !== undefined ? localDeXuat[idx] : item
                    const hasValue = item && item.trim() !== ""
                    const hasChanges = localValue !== item && localValue.trim() !== item.trim()

                    return (
                      <div key={idx} className="flex gap-2 items-center group">
                        {!isAdmin && !isEditing && hasValue ? (
                          <span className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 text-gray-900 rounded-lg break-words min-h-[40px] flex items-center border border-purple-200" style={{ fontSize: '11px', lineHeight: '1.5' }}>
                            {item}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={localValue}
                            onChange={(e) => {
                              const newValue = e.target.value

                              setLocalDeXuat((prev) => ({
                                ...prev,
                                [idx]: newValue,
                              }))
                              if (!hasValue && !isEditing) {
                                setEditingDeXuatInput((prev) => ({
                                  ...prev,
                                  [idx]: true,
                                }))
                              }
                            }}
                            disabled={isSavingWorkTask}
                            className="flex-1 px-3 py-2 bg-white text-gray-900 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
                            style={{ fontSize: '11px', lineHeight: '1.5' }}
                            placeholder="Nhập đề xuất..."
                          />
                        )}
                        {hasChanges && (isEditing || !hasValue) && (
                          <button
                            onClick={async () => {
                              await saveDeXuatInput(idx, localValue)
                              setLocalDeXuat((prev) => {
                                const newState = { ...prev }
                                delete newState[idx]
                                return newState
                              })
                              setEditingDeXuatInput((prev) => {
                                const newState = { ...prev }
                                delete newState[idx]
                                return newState
                              })
                            }}
                            disabled={isSavingWorkTask}
                            className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg disabled:opacity-50 transition-colors"
                            style={{ color: '#8b5cf6' }}
                          >
                            {isSavingWorkTask ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {!isEditing && hasValue && (
                          <button
                            onClick={() => {
                              setEditingDeXuatInput((prev) => ({
                                ...prev,
                                [idx]: true,
                              }))
                              setLocalDeXuat((prev) => ({
                                ...prev,
                                [idx]: item,
                              }))
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-opacity"
                            style={{ color: '#8b5cf6' }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Other Weekly Tasks Section */}
                {(weeklyTasks.length > 0 || isAdmin) && (
                  <div className="space-y-3">
                    {weeklyTasks.length > 0 && (
                      <h3 className="text-sm font-bold uppercase tracking-wide" style={{ fontSize: '11px', letterSpacing: '0.05em', color: '#8b5cf6' }}>Công việc khác</h3>
                    )}
                    {weeklyTasks.map((task, index) => {
                      const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
                      const weekEndDate = weeklyTasksWeekDates.endDate
                      const taskStatus = getWeeklyTaskStatus(task, weekEndDate)
                      
                      // Kiểm tra xem có thay đổi so với giá trị ban đầu không
                      const originalKey = `${username}_${weekKey}`
                      const originalTask = originalWeeklyTasksRef.current[originalKey]?.[task.id] || { content: "", employeeNote: "" }
                      const hasContentChanged = task.content !== (originalTask.content || "")
                      const hasEmployeeNoteChanged = (task.employeeNote || "") !== (originalTask.employeeNote || "")
                      const hasChanged = hasContentChanged || hasEmployeeNoteChanged
                      const shouldShowSaveButton = hasChanged && (task.content.trim().length > 0 || (task.employeeNote || "").trim().length > 0)

                      // Màu sắc theo trạng thái
                      const statusColors = {
                        success: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300",
                        failed: "bg-gradient-to-r from-red-50 to-rose-50 border-red-300",
                        pending: "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300"
                      }

                      return (
                        <div
                          key={task.id}
                          className={`flex flex-col gap-2 group p-3 rounded-lg border transition-all ${statusColors[taskStatus]}`}
                        >
                          {/* Header với số thứ tự */}
                          <div className="flex items-center gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </span>
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Công việc</h4>
                          </div>

                          {/* Ô input cho admin chỉnh sửa nội dung công việc */}
                          {isAdmin && (
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-gray-600">Nội dung công việc:</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={task.content}
                                  onChange={(e) => {
                                    const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
                                    const currentUser = usersData.users[username] || { weeks: {} }
                                    const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)

                                    const updatedWeekData: WeekData = {
                                      ...current,
                                      weeklyTasks: current.weeklyTasks.map((t) =>
                                        t.id === task.id ? { ...t, content: e.target.value } : t,
                                      ),
                                    }

                                    setUsersData((prev) => ({
                                      ...prev,
                                      users: {
                                        ...prev.users,
                                        [username]: {
                                          weeks: {
                                            ...currentUser.weeks,
                                            [weekKey]: updatedWeekData,
                                          },
                                        },
                                      },
                                    }))

                                    updateWeekData(() => updatedWeekData, false) // Không tự động lưu, Admin cần click nút "Lưu"
                                  }}
                                  disabled={isSavingWorkTask}
                                  className={`flex-1 px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 ${
                                    taskStatus === "success"
                                      ? "text-gray-700 border-purple-300 bg-purple-50"
                                      : taskStatus === "failed"
                                      ? "text-red-700 border-red-300 bg-red-50"
                                      : "border-purple-300 bg-white text-gray-900 focus:ring-purple-500"
                                  }`}
                                  style={{ fontSize: '12px', lineHeight: '1.5' }}
                                  placeholder="Nhập nội dung công việc..."
                                />
                                {/* Nút lưu */}
                                {hasContentChanged && (
                                  <button
                                    onClick={() => saveSingleTaskContent(task.id)}
                                    disabled={isSavingWorkTask}
                                    className="flex-shrink-0 p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Lưu nội dung"
                                  >
                                    {isSavingWorkTask ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                                {/* Nút xóa */}
                                <button
                                  onClick={() => removeWeeklyTask(task.id)}
                                  disabled={isSavingWorkTask}
                                  className="flex-shrink-0 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Xóa công việc"
                                >
                                  {isSavingWorkTask ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Hiển thị nội dung công việc cho nhân viên (chỉ đọc) */}
                          {!isAdmin && task.content && (
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-gray-600">Nội dung công việc:</label>
                              <div className="px-2 py-1.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">
                                {task.content}
                              </div>
                            </div>
                          )}

                          {/* Ô input cho nhân viên nhập dữ liệu */}
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                              <span>Trả lời:</span>
                              {taskStatus === "success" && (
                                <span className="text-green-600 text-xs">✓ Đã hoàn thành</span>
                              )}
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={task.employeeNote || ""}
                                onChange={(e) => {
                                  const weekKey = getWeekKey(weeklyTasksWeekDates.weekNumber)
                                  const currentUser = usersData.users[username] || { weeks: {} }
                                  const current = currentUser.weeks[weekKey] || initializeWeekData(weeklyTasksWeekOffset)

                                  const newEmployeeNote = e.target.value
                                  // Tự động set status thành success nếu có dữ liệu, pending nếu không có
                                  const newStatus = newEmployeeNote.trim().length > 0 ? "success" : "pending"

                                  const updatedWeekData: WeekData = {
                                    ...current,
                                    weeklyTasks: (current.weeklyTasks || []).map((t) =>
                                      t.id === task.id ? { ...t, employeeNote: newEmployeeNote, status: newStatus } : t,
                                    ),
                                  }

                                  setUsersData((prev) => ({
                                    ...prev,
                                    users: {
                                      ...prev.users,
                                      [username]: {
                                        weeks: {
                                          ...currentUser.weeks,
                                          [weekKey]: updatedWeekData,
                                        },
                                      },
                                    },
                                  }))

                                  if (isAdmin) {
                                    updateWeekData(() => updatedWeekData, false)
                                  }
                                }}
                                disabled={isSavingWorkTask}
                                className={`flex-1 px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 ${
                                  taskStatus === "success"
                                    ? "border-green-400 bg-green-50 text-gray-900 focus:ring-green-500 font-medium"
                                    : taskStatus === "failed"
                                    ? "border-red-300 bg-red-50 text-red-900"
                                    : "border-cyan-300 bg-cyan-50 text-gray-900 focus:ring-cyan-500"
                                }`}
                                style={{ fontSize: '12px', lineHeight: '1.5' }}
                                placeholder="Nhập câu trả lời của bạn..."
                              />
                              {/* Nút lưu chỉ hiển thị khi có thay đổi trong employeeNote */}
                              {hasEmployeeNoteChanged && (
                                <button
                                  onClick={saveWeeklyTasks}
                                  disabled={isSavingWorkTask}
                                  className="flex-shrink-0 p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Lưu câu trả lời"
                                >
                                  {isSavingWorkTask ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {isAdmin && (
                      <>
                        <button
                          onClick={addNewWeeklyTask}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-purple-50 rounded-lg border border-dashed border-purple-300 transition-colors font-medium"
                          style={{ fontSize: '11px' }}
                        >
                          <Plus className="h-4 w-4" />
                          <span>Thêm công việc</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


      {/* Quiz Modal */}
      {showQuizModal && currentQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-900 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-bold text-white">Câu Hỏi Lưu Công Việc Hàng Ngày</h3>
                <button
                  onClick={closeQuizModal}
                  className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {/* Progress Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/20 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-white h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(correctAnswersCount / requiredCorrectAnswers) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white font-bold text-sm whitespace-nowrap">
                  {correctAnswersCount}/{requiredCorrectAnswers}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Question */}
              <div className="mb-6">
                <p className="text-lg font-medium text-gray-800 mb-4">
                  {currentQuestion.CâuHỏi}
                </p>
              </div>

              {/* Answers */}
              <div className="space-y-3">
                {(["A", "B", "C"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedAnswer === option
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                          selectedAnswer === option
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {option}
                      </div>
                      <span className="text-gray-700 pt-1">
                        {currentQuestion.ĐápÁn[option]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeQuizModal}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedAnswer
                      ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Xác Nhận
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default PageBody
