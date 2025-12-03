"use client"

import { useState, useEffect, useMemo } from "react"
import moment from "moment"
import "moment/locale/vi"
import { ChevronLeft, ChevronRight, Calendar, User, CheckCircle, DollarSign, RefreshCw, X } from "lucide-react"
import attendanceApiRequest from "@/apiRequests/attendance"
import getUserInfo from "@/components/userInfo"
import { toast, Toaster } from "sonner"
// Remove these imports
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { ViewIcon as ViewList, ViewIcon as ViewGrid } from 'lucide-react'

// Add these imports instead
import { ListFilter, Grid } from "lucide-react"

// Định nghĩa kiểu dữ liệu cho bản ghi chấm công
interface AttendanceRecord {
    username: string
    date: string
}

// Định nghĩa kiểu dữ liệu cho câu hỏi
interface QuizQuestion {
    CâuHỏi: string
    ĐápÁn: {
        A: string
        B: string
        C: string
    }
    ĐápÁnĐúng: "A" | "B" | "C"
}

// Danh sách câu hỏi
const quizQuestions: QuizQuestion[] = [
    {
      CâuHỏi: "Content thường giá sao?",
      ĐápÁn: {
        A: "Hình như odr 1 và 7 là 60k thì phải",
        B: "Thường thì odr nào viết giá 50-60k là content viết tay, 25-30k là viết AI",
        C: "Hỏi ad cho nhanh"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "Có bao nhiêu vị trí text?",
      ĐápÁn: {
        A: "Có 1 vị trí là footer",
        B: "Text Footer và home",
        C: "Text Footer, home và header"
      },
      ĐápÁnĐúng: "C"
    },
    {
      CâuHỏi: "Cty tên gì, slogan là gì?",
      ĐápÁn: {
        A: "Chang You - tự do, hòa bình, tình yêu, phẩm giá",
        B: "Panda - tự do, hoà bình, tình yêu, phẩm giá",
        C: "Mỗi team 1 tên slogan là tự do, hoà bình, tình yêu, phẩm giá"
      },
      ĐápÁnĐúng: "A"
    },
    {
      CâuHỏi: "Con mèo của cty tên gì?",
      ĐápÁn: {
        A: "Mi",
        B: "Si",
        C: "Di"
      },
      ĐápÁnĐúng: "A"
    },
    {
      CâuHỏi: "Hiện tại công việc của chúng ta làm gì?",
      ĐápÁn: {
        A: "Bán backlink",
        B: "Chúng ta kinh doanh, công việc là Kinh Doanh",
        C: "SEO mớ website để bán backlink"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "Giờ nên làm gì?",
      ĐápÁn: {
        A: "Toả sáng và nổi bật",
        B: "Ngẫm về cuộc đời và tương lai",
        C: "Ngẫm về quá khứ và sai lầm"
      },
      ĐápÁnĐúng: "A"
    },
    {
      CâuHỏi: "Khách hỏi mình có phải chủ site không thì nói sao?",
      ĐápÁn: {
        A: "Em chủ site khoảng 50 site và giá tốt trên thị trường",
        B: "Bên em ctv thôi",
        C: "Em ctv cấp 1 giá tốt"
      },
      ĐápÁnĐúng: "A"
    },
    {
      CâuHỏi: "Có cần check lại content khi lên GP không?",
      ĐápÁn: {
        A: "Lên luôn khỏi check vì bên content đã làm rồi hoặc khách đã đưa",
        B: "Check qua xem anchor và link đã chèn đúng chưa hoặc chưa chèn",
        C: "Đủ số lượng là được"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "Payment: KH đang check đi đơn mà site ngưng không có trong file báo giá thì xử lý sao?",
      ĐápÁn: {
        A: "Báo data fix lại",
        B: "Có thể tự fix trên youlink và cập nhật phần ghi chú là 'Ngưng GP' hoặc 'Ngưng Text'",
        C: "A, B hoặc báo AD xử lý cho nhanh"
      },
      ĐápÁnĐúng: "C"
    },
    {
      CâuHỏi: "Payment: site gia hạn bị gỡ text do NCC miss, payment phạt tiền, bán hàng nên làm gì?",
      ĐápÁn: {
        A: "Báo chủ site về vấn đề họ miss và đề nghị họ chịu 100% hoặc chia 50-50",
        B: "Báo chủ site huỷ text gia hạn để không bị phạt",
        C: "Báo khách về việc chủ site chịu bù ngày gia hạn, NCC và BH tự thương lượng"
      },
      ĐápÁnĐúng: "C"
    },
    {
      CâuHỏi: "Payment check nghiệm thu nhưng giá GP đã thay đổi, bán hàng nên làm gì?",
      ĐápÁn: {
        A: "Cân nhắc thay đổi giá linh hoạt cho khách",
        B: "Cứng nhắc không deal lại giá",
        C: "Linh hoạt theo giá khách và xin họ chụp lại báo giá thời điểm đó"
      },
      ĐápÁnĐúng: "C"
    },
    {
      CâuHỏi: "Chủ site báo cần thêm đuôi //3399,... thì bán hàng nên làm gì?",
      ĐápÁn: {
        A: "Lơ đi",
        B: "Check khách có lên bài không và báo khách",
        C: "Tag ad, data, Phương Tuấn vào nhận thông tin"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "Một bài GP có bao nhiêu link Dofollow?",
      ĐápÁn: {
        A: "Nhiều link tùy NCC",
        B: "1–2 link Dofollow",
        C: "Không có link dofollow"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "Link Nofollow trong bài GP có chấp nhận không?",
      ĐápÁn: {
        A: "Không, phải là link dofollow",
        B: "Có, đủ anchor url là được",
        C: "Cả 2"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "Căn nguyên mọi vấn đề do đâu?",
      ĐápÁn: {
        A: "Do thị trường",
        B: "Do bản thân mình",
        C: "Do yếu tố xung quanh"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "Đâu là mã ví thanh toán Tron (USDT)?",
      ĐápÁn: {
        A: "TRC20\nTVFNucFznW6sDxU2uA2c2z9wmy2Xmd3qMV",
        B: "TRC20\nTVFNucFznW6sDxU2uA2c2z9wmy2Xmd0sRX",
        C: "TRC20\n0x8ae92d5cd95c0bec95a352df16f40eacb83837b8"
      },
      ĐápÁnĐúng: "A"
    },
    {
      CâuHỏi: "Khi check site phát hiện giá sai trên hệ thống thì làm gì?",
      ĐápÁn: {
        A: "Báo lại data check giá và đợi phản hồi",
        B: "Chủ động check file NCC rồi báo data fix",
        C: "Thấy lời thì bán"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "Tại sao BH spam mãi nhưng không có đơn?",
      ĐápÁn: {
        A: "Chưa có niềm tin và lý tưởng công việc",
        B: "Giao tiếp kém, sợ bị nói",
        C: "Lười online"
      },
      ĐápÁnĐúng: "A"
    },
    {
      CâuHỏi: "Đâu là mã ví thanh toán BSC (USDT)?",
      ĐápÁn: {
        A: "Bep20\n0x8ae92d5cd95c0bec95a352df16f40eacb83837b8",
        B: "Bep20\nTVFNucFznW6sDxU2uA2c2z9wmy2Xmd3qMV",
        C: "Bep20\n0x8ae92d5cd95c0bec95a352df16f40eacb8388b37"
      },
      ĐápÁnĐúng: "A"
    },
    {
      CâuHỏi: "Tỉ giá USD hiện nay là bao nhiêu VNĐ?",
      ĐápÁn: {
        A: "27.000 VNĐ",
        B: "27.500 VNĐ",
        C: "28.000 VNĐ"
      },
      ĐápÁnĐúng: "C"
    },
    {
      CâuHỏi: "Khách muốn lọc site GP traffic >50k, DR >20, giá <2tr thì lọc cột nào?",
      ĐápÁn: {
        A: "DR, link out, giá GP",
        B: "DR, traffic, giá GP",
        C: "DR, traffic, giá text"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "Khách đặt text 10 ngày rồi báo huỷ, xử lý sao?",
      ĐápÁn: {
        A: "Đồng ý huỷ và báo NCC gỡ text",
        B: "Xin huỷ NCC — NCC nào cho huỷ thì OK, NCC nào không thì tính tiền số ngày đã đặt",
        C: "Không cho huỷ vì đã 10 ngày"
      },
      ĐápÁnĐúng: "B"
    },
    {
      CâuHỏi: "GP: sau bao lâu không index thì nên huỷ bài?",
      ĐápÁn: {
        A: "Khoảng 2 tuần",
        B: "Khoảng 10 ngày",
        C: "Khoảng 20 ngày"
      },
      ĐápÁnĐúng: "A"
    },
    {
      CâuHỏi: "Khách mua text bị âm 5u sau CK8% thì xử lý sao?",
      ĐápÁn: {
        A: "Báo data kê giá cao lên 1 chút",
        B: "Kệ, đi luôn",
        C: "Báo data kê giá để tránh âm, sau đó báo lại giá mới cho khách"
      },
      ĐápÁnĐúng: "C"
    }
  ];
  
  

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
    const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar")
    const [allEmployeesData, setAllEmployeesData] = useState<{ [key: string]: any }[]>([])
    
    // Quiz modal states
    const [showQuizModal, setShowQuizModal] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null)
    const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | "C" | null>(null)
    const [pendingAttendanceDay, setPendingAttendanceDay] = useState<moment.Moment | null>(null)
    const [correctAnswersCount, setCorrectAnswersCount] = useState(0)
    const [wrongAnswers, setWrongAnswers] = useState<string[]>([])
    const requiredCorrectAnswers = 3

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
                        const numA = Number.parseInt(a.replace("BH", "")) || 0
                        const numB = Number.parseInt(b.replace("BH", "")) || 0
                        return numA - numB
                    })
                    setUniqueUsernames(sortedUsernames)
                    // Nếu chưa chọn username, mặc định chọn username đầu tiên
                    if (!selectedUsername && sortedUsernames.length > 0) {
                        setSelectedUsername(sortedUsernames[0])
                    }
                    // Organize data for table view if admin
                    if (role === "Admin" && response && Array.isArray(response)) {
                        // Group attendance by username
                        const attendanceByUser = sortedUsernames.map((username) => {
                            const userAttendance = response.filter((record) => record.username === username)
                            let presentDays = userAttendance.length
                            let cappedDays = presentDays > 26.5 ? 26.5 : presentDays
                            let totalSalary = cappedDays * dailyRate
                            if (totalSalary > 8000) totalSalary = 8000

                            return {
                                username,
                                presentDays: cappedDays,
                                totalSalary,
                                lastAttendance:
                                    userAttendance.length > 0
                                        ? moment(userAttendance[userAttendance.length - 1].date).format("DD/MM/YYYY")
                                        : "Chưa chấm công",
                            }
                        })

                        setAllEmployeesData(attendanceByUser)
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
    const sendTelegramNotification = async (username: string, wrongAnswersList: string[]): Promise<boolean> => {
        try {
            const dateString = moment().format("DD/MM/YYYY")
            
            let messageText = ""
            
            if (wrongAnswersList.length === 0) {
                // Trả lời đúng hết 3 câu
                messageText = `✅ ${username} đã trả lời đúng 3 câu và chấm công thành công ngày ${dateString}!`
            } else {
                // Có câu sai nhưng vẫn vượt qua (đúng 3 câu liên tiếp cuối cùng)
                messageText = `⚠️ ${username} đã vượt qua bài kiểm tra và chấm công ngày ${dateString}.\n\n❌ Các câu đã trả lời sai:\n${wrongAnswersList.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
            }

            const url = `https://ylink.qctl44.workers.dev/bot8438379827:AAGA5omDiX3vektnojY57Y23cMGDv6baD5U/sendMessage`
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
    const openQuizModal = (day: moment.Moment) => {
        const question = getRandomQuestion()
        setCurrentQuestion(question)
        setSelectedAnswer(null)
        setPendingAttendanceDay(day)
        setCorrectAnswersCount(0)
        setWrongAnswers([])
        setShowQuizModal(true)
    }

    // Đóng modal quiz
    const closeQuizModal = () => {
        setShowQuizModal(false)
        setCurrentQuestion(null)
        setSelectedAnswer(null)
        setPendingAttendanceDay(null)
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
                // Đã đủ 3 câu đúng - tiếp tục chấm công
                toast.success("Hoàn thành! Đang chấm công...")
                const currentWrongAnswers = [...wrongAnswers]
                closeQuizModal()
                if (pendingAttendanceDay) {
                    processAttendance(pendingAttendanceDay, currentWrongAnswers)
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

    // Xử lý chấm công (được gọi khi nhấn nút chấm công)
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

        // Mở modal quiz thay vì chấm công trực tiếp
        openQuizModal(day)
    }

    // Xử lý chấm công thực tế (được gọi sau khi trả lời đúng câu hỏi)
    const processAttendance = async (day: moment.Moment, wrongAnswersList: string[]) => {
        const dateString = day.format("YYYY-MM-DD")

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
            await sendTelegramNotification(`${username}-${userInfo?.name || "No Name"}`, wrongAnswersList)
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

        let presentDays = monthRecords.length
        let cappedDays = presentDays > 26.5 ? 26.5 : presentDays
        let totalSalary = cappedDays * dailyRate
        if (totalSalary > 8000) totalSalary = 8000

        // Thông báo nếu đã đủ công tháng này (chỉ cho nhân viên, không phải admin)
        if (role !== "Admin" && presentDays > 26.5) {
            toast.info("Bạn đã đủ công tháng này")
        }

        return { presentDays: cappedDays, totalSalary }
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
                            <div className="flex items-center gap-2">
                                {role === "Admin" && (
                                    <div className="flex bg-blue-700/50 border border-blue-400 rounded-md overflow-hidden">
                                        <button
                                            onClick={() => setViewMode("calendar")}
                                            className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "calendar" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                                }`}
                                        >
                                            <Grid className="h-4 w-4 mr-1" />
                                            Lịch
                                        </button>
                                        <button
                                            onClick={() => setViewMode("table")}
                                            className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "table" ? "bg-blue-100 text-blue-900" : "text-white hover:bg-blue-600"
                                                }`}
                                        >
                                            <ListFilter className="h-4 w-4 mr-1" />
                                            Bảng
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={fetchAttendanceData}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500 shadow-md"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>
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
                        <div className="flex items-center gap-2 text-gray-500 font-medium mr-4">
                            <span className="text-xs italic">Chỉ giới hạn tối đa 26.5 công/tháng</span>
                        </div>
                    </div>
                </div>

                {viewMode === "calendar" && (
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
                                        <div
                                            className={`text-center p-0.5 font-medium text-xs ${isTodayDate ? "text-blue-700" : textColor}`}
                                        >
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
                )}
                {/* Table View for Admin */}
                {role === "Admin" && viewMode === "table" && (
                    <div className="bg-white rounded-b-2xl shadow-xl pt-4 pb-4 px-4 mt-4">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]"
                                        >
                                            Mã NV
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Ngày Công
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Lương Tháng Này
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Chấm Công Gần Nhất
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Thao Tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {allEmployeesData.map((employee) => (
                                        <tr key={employee.username} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium text-gray-900">
                                                {employee.username}
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500">{employee.presentDays} ngày</td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500">
                                                {formatCurrency(employee.totalSalary)}
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500">{employee.lastAttendance}</td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap text-center text-sm font-medium">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUsername(employee.username)
                                                        setViewMode("calendar")
                                                    }}
                                                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
                                                >
                                                    Xem chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Quiz Modal */}
            {showQuizModal && currentQuestion && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-900 p-6 rounded-t-2xl">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xl font-bold text-white">Câu Hỏi Chấm Công</h3>
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
    )
}
