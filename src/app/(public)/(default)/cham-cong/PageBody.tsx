"use client"

import { useState, useEffect, useMemo } from "react"
import moment from "moment"
import "moment/locale/vi"
import { ChevronLeft, ChevronRight, Calendar, User, CheckCircle, DollarSign, Coins } from "lucide-react"
import attendanceApiRequest from "@/apiRequests/attendance"
import getUserInfo from "@/components/userInfo"
import { toast, Toaster } from "sonner"

// Định nghĩa kiểu dữ liệu cho bản ghi chấm công
interface AttendanceRecord {
    username: string
    date: string
}

export default function AttendanceTracker() {
    // Thiết lập locale tiếng Việt cho moment
    useEffect(() => {
        moment.locale("vi")
    }, [])

    const [currentMonth, setCurrentMonth] = useState(moment())
    const [allAttendanceData, setAllAttendanceData] = useState<AttendanceRecord[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedUsername, setSelectedUsername] = useState<string>("")
    const [uniqueUsernames, setUniqueUsernames] = useState<string[]>([])
    const today = moment().format("YYYY-MM-DD")
    const userInfo = getUserInfo()
    const username = userInfo?.username
    const role = userInfo?.role
    const dailyRate = 302 // Mức lương hàng ngày

    const fetchAttendanceData = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await attendanceApiRequest.get()
            console.log(response)
            // Kiểm tra và xử lý dữ liệu trả về từ API
            if (response && Array.isArray(response)) {
                // API trả về trực tiếp mảng dữ liệu
                setAllAttendanceData(response)

                // Nếu là Admin, lấy danh sách username duy nhất
                if (role === "Admin") {
                    const usernames = [...new Set(response.map((record) => record.username))]
                    // Sort usernames that start with 'BH' followed by numbers
                    const sortedUsernames = usernames.sort((a, b) => {
                        const numA = parseInt(a.replace('BH', '')) || 0;
                        const numB = parseInt(b.replace('BH', '')) || 0;
                        return numA - numB;
                    });
                    setUniqueUsernames(sortedUsernames)
                    // Nếu chưa chọn username, mặc định chọn username đầu tiên
                    if (!selectedUsername && sortedUsernames.length > 0) {
                        setSelectedUsername(sortedUsernames[0])
                    }
                }
            } else {
                toast.error("Định dạng dữ liệu không hợp lệ")
            }
        } catch (error: any) {
            console.error("Error fetching attendance data:", error)
            toast.error(error.response?.data?.error || "Có lỗi xảy ra khi tải dữ liệu điểm danh")
        } finally {
            setIsLoading(false)
        }
    }
    useEffect(() => {
        fetchAttendanceData()
    }, [])

    // Filter attendance data for current month and selected username
    const attendanceData = useMemo(() => {
        if (!allAttendanceData || allAttendanceData.length === 0) return []

        const startOfMonth = currentMonth.startOf("month").format("YYYY-MM-DD")
        const endOfMonth = currentMonth.endOf("month").format("YYYY-MM-DD")

        return allAttendanceData.filter((record) => {
            const recordDate = moment(record.date).format("YYYY-MM-DD")
            const matchesDate = recordDate >= startOfMonth && recordDate <= endOfMonth
            const matchesUsername = role === "Admin" ? record.username === selectedUsername : record.username === username
            return matchesDate && matchesUsername
        })
    }, [allAttendanceData, currentMonth, selectedUsername, role, username])

    // Hàm tạo mảng các ngày trong tháng hiện tại
    const getDaysInMonth = () => {
        const startDay = moment(currentMonth).startOf("month")
        const endDay = moment(currentMonth).endOf("month")

        const days = []
        const day = startDay.clone()

        while (day.isSameOrBefore(endDay)) {
            days.push(day.clone())
            day.add(1, "day")
        }

        return days
    }

    const daysInMonth = getDaysInMonth()

    // Chuyển sang tháng trước
    const previousMonth = () => {
        setCurrentMonth(moment(currentMonth).subtract(1, "month"))
    }

    // Chuyển sang tháng sau
    const nextMonth = () => {
        setCurrentMonth(moment(currentMonth).add(1, "month"))
    }
    const sendTelegramNotification = async (username: string): Promise<boolean> => {
        try {
            const dateString = moment().format("DD/MM/YYYY")
            const messageText = `${username} vừa chấm công ngày ${dateString}!`

            const url = `https://api.telegram.org/bot7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U/sendMessage`
            const params = new URLSearchParams({
                chat_id: "-1002298300938",
                text: messageText,
            })

            const response = await fetch(`${url}?${params.toString()}`)
            const responseData = await response.json()

            if (responseData.ok) {
                console.log("Telegram notification sent successfully")
                return true
            } else {
                console.error(`Failed to send Telegram notification: ${responseData.description}`)
                return false
            }
        } catch (error) {
            console.error("Error sending Telegram notification:", error)
            return false
        }
    }
    // Xử lý chấm công
    const handleAttendance = async (day: moment.Moment) => {
        const dateString = day.format("YYYY-MM-DD")

        // Chỉ cho phép chấm công ngày hiện tại
        if (dateString !== today) return

        // Kiểm tra xem đã chấm công chưa
        if (!allAttendanceData) return

        // Sửa cách kiểm tra bản ghi đã tồn tại
        const existingRecord = allAttendanceData.find((record) => {
            const recordDate = moment(record.date).format("YYYY-MM-DD")
            return recordDate === dateString && record.username === username
        })

        if (existingRecord) return // Nếu đã chấm công rồi thì không làm gì cả

        try {
            setIsLoading(true)
            setError(null)
            // Gọi API tạo điểm danh
            const response = await attendanceApiRequest.create({ username })
            // Cập nhật dữ liệu trực tiếp vào state
            const newAttendanceRecord = {
                username: username,
                date: dateString,
            }
            setAllAttendanceData((prevData) => [...prevData, newAttendanceRecord])
            // Hiển thị thông báo thành công
            await sendTelegramNotification(`${username}-${userInfo?.name || "No Name"}`)
            toast.success("Chấm công thành công!")
        } catch (error: any) {
            console.error("Lỗi khi chấm công:", error)
            toast.error(error.response?.data?.error || "Có lỗi xảy ra khi chấm công")
        } finally {
            setIsLoading(false)
        }
    }

    // Lấy trạng thái chấm công của một ngày
    const getAttendanceStatus = (day: moment.Moment): AttendanceRecord | undefined => {
        const dateString = day.format("YYYY-MM-DD")
        if (!allAttendanceData) return undefined

        // Sửa cách so sánh ngày tháng để xử lý đúng định dạng ISO từ API
        return allAttendanceData.find((record) => {
            // Chuyển đổi date từ API sang định dạng YYYY-MM-DD để so sánh
            const recordDate = moment(record.date).format("YYYY-MM-DD")
            const matchesDate = recordDate === dateString
            const matchesUsername = role === "Admin" ? record.username === selectedUsername : record.username === username
            return matchesDate && matchesUsername
        })
    }

    // Kiểm tra xem có phải ngày hiện tại không
    const isToday = (day: moment.Moment) => {
        return day.format("YYYY-MM-DD") === today
    }

    // Kiểm tra xem có phải ngày trong quá khứ không
    const isPastDay = (day: moment.Moment) => {
        return day.isBefore(moment(), "day")
    }

    // Tính số ngày đi làm và nghỉ trong tháng hiện tại
    const getMonthStats = () => {
        const startOfMonth = currentMonth.startOf("month").format("YYYY-MM-DD")
        const endOfMonth = currentMonth.endOf("month").format("YYYY-MM-DD")

        // Nếu là tháng hiện tại, chỉ tính đến ngày hôm nay
        const isCurrentMonth = currentMonth.format("YYYY-MM") === moment().format("YYYY-MM")
        const endDate = isCurrentMonth ? today : endOfMonth

        // Lọc các bản ghi trong tháng hiện tại cho username được chọn
        const monthRecords = allAttendanceData.filter((record) => {
            const recordDate = moment(record.date).format("YYYY-MM-DD")
            const matchesDate = recordDate >= startOfMonth && recordDate <= endDate
            const matchesUsername = role === "Admin" ? record.username === selectedUsername : record.username === username
            return matchesDate && matchesUsername
        })

        const presentDays = monthRecords.length

        // Tính tổng lương
        const totalSalary = presentDays * dailyRate

        return { presentDays, totalSalary }
    }

    const monthStats = getMonthStats()

    // Format số tiền thành định dạng tiền tệ Việt Nam
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount * 1000)
    }

    return (
        <div className="min-h-screen py-6 px-4">
            <Toaster position="top-right" expand={true} richColors />
            {isLoading && !allAttendanceData.length && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-700 font-medium">Đang tải dữ liệu...</p>
                    </div>
                </div>
            )}
            <div className="w-full max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-t-xl shadow-xl overflow-hidden border border-blue-100">
                    <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-500 to-blue-900">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Calendar className="h-6 w-6" />
                                Hệ Thống Chấm Công
                            </h2>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center space-x-3 bg-blue-50 px-4 py-2 rounded-lg">
                            <div className="bg-blue-500 p-2 rounded-full shadow-sm">
                                <User className="h-5 w-5 text-white" />
                            </div>
                            {role === "Admin" ? (
                                <div className="flex items-center space-x-3">
                                    {isLoading ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-sm text-gray-600">Đang tải...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <select
                                                    value={selectedUsername}
                                                    onChange={(e) => setSelectedUsername(e.target.value)}
                                                    className="appearance-none bg-white border-2 border-blue-300 rounded-lg pl-3 pr-10 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                >
                                                    {uniqueUsernames.map((username) => (
                                                        <option key={username} value={username}>
                                                            {username}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500">
                                                    <svg
                                                        className="h-5 w-5"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                        aria-hidden="true"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>
                                            <button
                                                onClick={fetchAttendanceData}
                                                disabled={isLoading}
                                                className="flex items-center justify-center h-10 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                            >
                                                {isLoading ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-5 w-5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                        />
                                                    </svg>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <span className="font-medium text-gray-700">{username}</span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm shadow-sm border border-blue-200">
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-medium">Đi làm: {monthStats.presentDays} ngày</span>
                            </div>
                            <div className="flex items-center space-x-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-lg text-sm shadow-sm border border-teal-200">
                                <DollarSign className="h-5 w-5" />
                                <span className="font-medium">Ngân lượng: {formatCurrency(monthStats.totalSalary)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calendar Navigation */}
                <div className="bg-white px-6 border-b border-blue-100 shadow-md">
                    <div className="flex items-center justify-between">
                        <button
                            className="p-2 rounded-full hover:bg-blue-50 transition-colors text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            onClick={previousMonth}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 capitalize">
                            {currentMonth.format("MMMM YYYY")}
                        </h2>
                        <button
                            className="p-2 rounded-full hover:bg-blue-50 transition-colors text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            onClick={nextMonth}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-white px-6 py-1 border-b border-blue-100">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span className="font-medium">Đi làm</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <span className="font-medium">Nghỉ</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-teal-200 border border-teal-400 rounded"></div>
                            <span className="font-medium">Hôm nay</span>
                        </div>
                    </div>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-b-2xl shadow-xl pt-2 pb-4 px-4">
                    <div className="grid grid-cols-7 gap-1">
                        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, index) => (
                            <div key={day} className="text-center font-medium text-gray-500 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {/* Tạo ô trống cho các ngày trước ngày đầu tiên của tháng */}
                        {Array.from({ length: moment(currentMonth).startOf("month").day() }).map((_, index) => (
                            <div key={`empty-${index}`} className="h-16 md:h-22 p-1"></div>
                        ))}

                        {/* Hiển thị các ngày trong tháng */}
                        {daysInMonth.map((day) => {
                            const attendanceRecord = getAttendanceStatus(day)
                            const isTodayDate = isToday(day)
                            const isPast = isPastDay(day)
                            const isFuture = day.isAfter(moment(), "day")
                            const isWeekend = day.day() === 0 || day.day() === 6

                            // Xác định màu sắc dựa trên trạng thái chấm công
                            let bgColor = "bg-white"
                            let borderColor = "border-gray-200"
                            let statusText = ""
                            let textColor = isWeekend ? "text-gray-400" : "text-gray-700"

                            if (attendanceRecord) {
                                bgColor = "bg-blue-100"
                                borderColor = "border-blue-500"
                                statusText = isTodayDate ? "Đã chấm công" : "Đi làm"
                                textColor = "text-blue-700"
                            } else if (isPast && !isFuture) {
                                // Ngày trong quá khứ mà không có bản ghi thì mặc định là "Nghỉ"
                                bgColor = "bg-red-100"
                                borderColor = "border-red-500"
                                statusText = "Nghỉ"
                                textColor = "text-red-700"
                            } else if (isTodayDate) {
                                bgColor = "bg-teal-100"
                                borderColor = "border-teal-400"
                                textColor = "text-teal-700"
                            } else if (isPast) {
                                bgColor = "bg-gray-50"
                            }

                            return (
                                <div
                                    key={day.format()}
                                    className={`h-16 md:h-22 mb-1 p-0.5 rounded-lg flex flex-col transition-all ${isTodayDate ? "ring-2 ring-blue-500 shadow-md" : `border ${borderColor}`} ${bgColor} hover:shadow-md`}
                                >
                                    <div className={`text-right p-0.5 font-medium text-xs ${isTodayDate ? "text-blue-700" : textColor}`}>
                                        {day.format("D")}
                                    </div>

                                    {(attendanceRecord || (isPast && !isFuture && !attendanceRecord)) && !isFuture && (
                                        <div
                                            className={`text-center text-xs font-medium ${attendanceRecord ? (isTodayDate ? "text-blue-700" : "text-blue-700") : "text-red-700"}`}
                                        >
                                            {statusText}
                                        </div>
                                    )}

                                    <div className="flex-grow flex items-end justify-center p-0.5">
                                        {isTodayDate && !attendanceRecord ? (
                                            <div className="w-full flex justify-center">
                                                <button
                                                    className={`py-1 px-2 text-xs rounded-lg transition-all bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-teal-300 ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                                                    onClick={() => handleAttendance(day)}
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? "Đang xử lý..." : "Chấm công"}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
