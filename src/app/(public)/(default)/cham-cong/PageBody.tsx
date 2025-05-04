"use client"

import { useState, useEffect } from "react"
import moment from "moment"
import "moment/locale/vi"
import { ChevronLeft, ChevronRight, Calendar, User, CheckCircle, XCircle, Info } from "lucide-react"

// Định nghĩa kiểu dữ liệu cho bản ghi chấm công
interface AttendanceRecord {
    id: number
    username: string
    date: string
    status: "OK" | "Nghỉ"
}

export default function AttendanceTracker() {
    // Thiết lập locale tiếng Việt cho moment
    useEffect(() => {
        moment.locale("vi")
    }, [])

    // Mock data ban đầu
    const initialMockData: AttendanceRecord[] = [
        { id: 1, username: "Nam", date: moment().subtract(5, "days").format("YYYY-MM-DD"), status: "OK" },
        { id: 2, username: "Nam", date: moment().subtract(4, "days").format("YYYY-MM-DD"), status: "OK" },
        { id: 4, username: "Nam", date: moment().subtract(2, "days").format("YYYY-MM-DD"), status: "OK" },
        { id: 5, username: "Nam", date: moment().subtract(1, "days").format("YYYY-MM-DD"), status: "OK" },
    ]

    const [currentMonth, setCurrentMonth] = useState(moment())
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>(initialMockData)
    const today = moment().format("YYYY-MM-DD")
    const username = "Nam"

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

    // Xử lý chấm công
    const handleAttendance = (day: moment.Moment) => {
        const dateString = day.format("YYYY-MM-DD")

        // Chỉ cho phép chấm công ngày hiện tại
        if (dateString !== today) return

        // Kiểm tra xem đã chấm công chưa
        const existingRecord = attendanceData.find((record) => record.date === dateString)
        if (existingRecord) return // Nếu đã chấm công rồi thì không làm gì cả

        console.log("Username:", username)

        // Thêm bản ghi chấm công mới
        const newRecord: AttendanceRecord = {
            id: attendanceData.length + 1,
            username,
            date: dateString,
            status: "OK",
        }

        setAttendanceData([...attendanceData, newRecord])
    }

    // Lấy trạng thái chấm công của một ngày
    const getAttendanceStatus = (day: moment.Moment): AttendanceRecord | undefined => {
        const dateString = day.format("YYYY-MM-DD")
        return attendanceData.find((record) => record.date === dateString)
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

        const monthRecords = attendanceData.filter((record) => record.date >= startOfMonth && record.date <= endDate)
        const presentDays = monthRecords.filter((record) => record.status === "OK").length

        // Tính tổng số ngày cần xét (từ đầu tháng đến ngày cuối)
        const startDate = moment(startOfMonth)
        const endDateMoment = moment(endDate)
        const totalDaysToCount = endDateMoment.diff(startDate, 'days') + 1

        const absentDays = totalDaysToCount - presentDays

        return { presentDays, absentDays }
    }

    const monthStats = getMonthStats()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-4 px-4">
            <div className="w-full max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-t-2xl shadow-lg p-4 border-b border-indigo-100">
                    <div className="flex items-center space-x-3 mb-2">
                        <Calendar className="h-8 w-8 text-indigo-600" />
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Hệ Thống Chấm Công</h1>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center space-x-2">
                            <User className="h-5 w-5 text-indigo-500" />
                            <span className="font-medium text-gray-700">{username}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                                <CheckCircle className="h-4 w-4" />
                                <span>Đi làm: {monthStats.presentDays} ngày</span>
                            </div>
                            <div className="flex items-center space-x-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                                <XCircle className="h-4 w-4" />
                                <span>Nghỉ: {monthStats.absentDays} ngày</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calendar Navigation */}
                <div className="bg-white px-6 border-b border-indigo-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <button
                            className="p-2 rounded-full hover:bg-indigo-50 transition-colors text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            onClick={previousMonth}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 capitalize">
                            {currentMonth.format("MMMM YYYY")}
                        </h2>
                        <button
                            className="p-2 rounded-full hover:bg-indigo-50 transition-colors text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            onClick={nextMonth}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-white px-6 py-1 border-b border-indigo-100">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span>Đi làm</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <span>Nghỉ</span>
                        </div>
                    </div>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-b-2xl shadow-lg pt-4">
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
                            <div key={`empty-${index}`} className="h-16 md:h-20 p-1"></div>
                        ))}

                        {/* Hiển thị các ngày trong tháng */}
                        {daysInMonth.map((day) => {
                            const attendanceRecord = getAttendanceStatus(day)
                            const isTodayDate = isToday(day)
                            const isPast = isPastDay(day)
                            const isFuture = day.isAfter(moment(), "day")

                            // Xác định màu sắc dựa trên trạng thái chấm công
                            let bgColor = "bg-white"
                            let borderColor = "border-gray-200"
                            let statusText = ""

                            if (attendanceRecord) {
                                if (attendanceRecord.status === "OK") {
                                    bgColor = "bg-green-100"
                                    borderColor = "border-green-500"
                                    statusText = "Đi làm"
                                } else {
                                    bgColor = "bg-red-100"
                                    borderColor = "border-red-500"
                                    statusText = "Nghỉ"
                                }
                            } else if (isPast && !isFuture) {
                                // Ngày trong quá khứ mà không có bản ghi thì mặc định là "Nghỉ"
                                bgColor = "bg-red-100"
                                borderColor = "border-red-500"
                                statusText = "Nghỉ"
                            } else if (isTodayDate) {
                                bgColor = "bg-indigo-50"
                                borderColor = "border-indigo-300"
                            } else if (isPast) {
                                bgColor = "bg-gray-50"
                            }

                            return (
                                <div
                                    key={day.format()}
                                    className={`h-16 md:h-20 mb-2 p-1 rounded-lg flex flex-col transition-all ${isTodayDate ? "ring-2 ring-indigo-500 shadow-md" : `border ${borderColor}`
                                        } ${bgColor}`}
                                >
                                    <div
                                        className={`text-right p-1 font-medium ${isTodayDate ? "text-indigo-700" : isPast ? "text-gray-500" : "text-gray-700"
                                            }`}
                                    >
                                        {day.format("D")}
                                    </div>

                                    {(attendanceRecord || (isPast && !isFuture && !attendanceRecord)) && !isFuture && (
                                        <div
                                            className={`text-center text-sm font-medium ${attendanceRecord && attendanceRecord.status === "OK" ? "text-green-700" : "text-red-700"
                                                }`}
                                        >
                                            {statusText}
                                        </div>
                                    )}

                                    <div className="flex-grow flex items-end justify-center p-1">
                                        {isTodayDate && !attendanceRecord ? (
                                            <div className="w-full flex justify-center">
                                                <button
                                                    className="py-2 px-4 text-sm rounded-lg transition-all bg-indigo-500 hover:bg-indigo-600 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                    onClick={() => handleAttendance(day)}
                                                >
                                                    Chấm công
                                                </button>
                                            </div>
                                        ) : isTodayDate && attendanceRecord ? (
                                            <div className="w-full py-2 px-2 text-sm rounded-lg text-center bg-gray-100 text-gray-700">
                                                Đã chấm công
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
