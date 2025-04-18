"use client"
import { useState, useEffect, useRef } from "react"
import { Modal, Button, Tooltip, Steps } from "antd"
import { QuestionCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons"

type HelpButtonProps = {
    userRole: string
    currentOrder: any
}

type HelpStep = {
    title: string
    description: string
    role: string
    highlight?: {
        row: number
        col: number
    }
}

const HelpButton = ({ userRole, currentOrder }: HelpButtonProps) => {
    const [visible, setVisible] = useState(false)
    const [showHelpText, setShowHelpText] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [highlightedCell, setHighlightedCell] = useState<{ row: number; col: number } | null>(null)
    const inactivityTimer = useRef<NodeJS.Timeout>()
    const helpTextRef = useRef<HTMLDivElement>(null)

    // Reset timer on any user interaction
    useEffect(() => {
        const resetTimer = () => {
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current)
            }
            setShowHelpText(false)
            inactivityTimer.current = setTimeout(() => {
                setShowHelpText(true)
            }, 20000)
        }

        window.addEventListener("mousemove", resetTimer)
        window.addEventListener("keydown", resetTimer)
        window.addEventListener("click", resetTimer)

        resetTimer()

        return () => {
            window.removeEventListener("mousemove", resetTimer)
            window.removeEventListener("keydown", resetTimer)
            window.removeEventListener("click", resetTimer)
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current)
            }
        }
    }, [])

    const getGeneralHelpContent = (): HelpStep[] => {
        if (userRole === "Khách hàng") {
            return [
                {
                    title: "Bước 1: Xử lý đơn hàng",
                    description: `
                        <div class="space-y-4">
                            <div>
                                <strong class="text-blue-600 text-md">Đơn GP:</strong>
                                <ul class="list-disc pl-5 mt-2">
                                    <li>Nhập bài viết vào cột <span class="text-blue-500">Bài viết</span></li>
                                    <li>Kiểm tra và cập nhật trạng thái <span class="text-green-500">Index</span></li>
                                </ul>
                            </div>
                            <div>
                                <strong class="text-blue-600 text-md">Đơn Text:</strong>
                                <ul class="list-disc pl-5 mt-2">
                                    <li>Nhập Anchor và Link vào các cột tương ứng</li>
                                    <li>Theo dõi trạng thái NCC về đơn hàng</li>
                                </ul>
                            </div>
                            <div>
                                <strong class="text-blue-600 text-md">Hủy đơn:</strong>
                                <ul class="list-disc pl-5 mt-2">
                                    <li>Chuột phải chọn <span class="text-red-100 text-sm bg-red-500 px-2 py-1 rounded-md">Hủy đơn</span> để hủy đơn hàng</li>
                                    <li>Đối với đơn đã index hoặc đã lên text, NCC sẽ xem xét và phản hồi</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    role: "Khách hàng"
                },
                {
                    title: "Bước 2: Khiếu nại",
                    description: `
                        <div class="space-y-4">
                            <div>
                                <strong class="text-blue-600 text-md">Nếu GP mất hoặc Text mất, có thể khiếu nại:</strong>
                                <ul class="list-disc pl-5 mt-2">
                                    <li>Vào mục Trao đổi và chọn 
                                        <button class="p-2 text-gray-600 bg-gray-200 rounded-full hover:text-gray-800 focus:outline-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                         ở góc trái
                                    </li>
                                    <li>Chọn tình huống cần khiếu nại</li>
                                    <li>NCC sẽ xem xét và phản hồi <span class="text-blue-100 text-sm bg-blue-500 px-2 py-1 rounded-md">Đồng ý hoàn</span>
                                     hoặc <span class="text-red-100 text-sm bg-red-500 px-2 py-1 rounded-md">Từ chối hoàn</span></li>
                                </ul>
                            </div>
                        </div>
                    `,
                    role: "Khách hàng"
                },
                {
                    title: "Bước 3: Trao đổi",
                    description: `
                    <div class="space-y-4">
                        <div>
                            <strong class="text-blue-600 text-md">Nếu cần trao đổi thêm với NCC:</strong>
                            <ul class="list-disc pl-5 mt-2">
                                <li>Nhấp vào nút <span class='text-green-100 text-sm bg-green-700 px-2 py-1 rounded-md'>Trao đổi</span> để mở chat với NCC</li>
                             </ul>
                        </div>
                    </div>
                `,
                    role: "Khách hàng"
                }
            ]
        } else {
            return [
                {
                    title: "Bước 1: Xử lý đơn hàng",
                    description: `
                        <div class="space-y-4">
                            <div>
                                <strong class="text-blue-600 text-md">Đơn GP:</strong>
                                <ul class="list-disc pl-5 mt-2">
                                    <li>Nhập link kết quả vào cột <span class="text-blue-500">Link KQ</span></li>
                                    <li>Kiểm tra và cập nhật trạng thái Index</li>
                                </ul>
                            </div>
                            <div>
                                <strong class="text-blue-600 text-md">Đơn Text:</strong>
                                <ul class="list-disc pl-5 mt-2">
                                    <li>Chuột phải chọn  <span class="text-blue-100 bg-blue-500 px-2 py-1 rounded-md text-sm">Đơn OK</span> để hoàn thành đơn</li>
                                </ul>
                            </div>
                            <div>
                                <strong class="text-blue-600 text-md">Hủy đơn:</strong>
                                <ul class="list-disc pl-5 mt-2">
                                    <li>Chuột phải chọn  <span class="text-red-100 bg-red-500 px-2 py-1 rounded-md text-sm">Hủy đơn</span> để hủy đơn hàng</li>
                                    <li>Đối với yêu cầu hủy đơn của khách hàng đối với đơn đã index hoặc đã lên bài:</br> - Chuột phải chọn
                                      <span class="text-blue-100 bg-blue-500 px-2 py-1 rounded-md text-sm">Đồng ý hủy</span> hoặc 
                                       <span class="text-red-100 bg-red-500 px-2 py-1 rounded-md text-sm">Từ chối hủy</span></li>
                                </ul>
                            </div>
                        </div>
                    `,
                    role: "NCC"
                },
                {
                    title: "Bước 2: Xử lý khiếu nại",
                    description: `
                        <div class="space-y-4">
                            <div>
                                <strong class="text-blue-600 text-md">Trường hợp mất GP hoặc mất Text</strong>
                                 <br/> Xem xét thời gian mất bài để quyết định mức hoàn tiền <br/>
                                   Chọn <span class="text-blue-100 bg-blue-500 px-2 py-1 rounded-md text-sm">Đồng ý hoàn</span> hoặc <span class="text-red-100 bg-red-500 px-2 py-1 rounded-md text-sm">Từ chối hoàn</span> 
                            </div>
                        </div>
                    `,
                    role: "NCC"
                },
                {
                    title: "Bước 3: Trao đổi",
                    description: `
                    <div class="space-y-4">
                        <div>
                            <strong class="text-blue-600 text-md">Nếu cần trao đổi thêm với Khách hàng:</strong>
                            <ul class="list-disc pl-5 mt-2">
                                <li>Nhấp vào nút <span class='text-green-100 text-sm bg-green-700 px-2 py-1 rounded-md'>Trao đổi</span> để mở chat với Khách hàng</li>
                             </ul>
                        </div>
                    </div>
                `,
                    role: "NCC"
                }
            ]
        }
    }

    const getOrderSpecificHelpContent = (): HelpStep[] | null => {
        if (!currentOrder) return null

        const isNewOrder = currentOrder.TinhTrangKH === "Chưa nhập" &&
            currentOrder.TinhTrangNCC === "Chưa nhận đơn"

        if (!isNewOrder) return null

        if (currentOrder.Loai === "GP") {
            return [
                {
                    title: "Bước 1: Nhập bài viết",
                    description: "Khách hàng nhập nội dung bài viết vào ô Bài viết",
                    highlight: { row: 0, col: 12 },
                    role: "Khách hàng"
                },
                {
                    title: "Bước 2: NCC trả kết quả",
                    description: "NCC nhập link kết quả vào ô Link KQ",
                    highlight: { row: 0, col: 13 },
                    role: "NCC"
                },
                {
                    title: "Bước 3: Kiểm tra Index",
                    description: "Cả NCC và Khách hàng đều có thể kiểm tra và chuyển trạng thái Index từ No sang Indexed",
                    highlight: { row: 0, col: 19 },
                    role: "both"
                }
            ]
        } else {
            return [
                {
                    title: "Bước 1: Nhập Anchor và Link",
                    description: "Khách hàng nhập Anchor 1 và Link 1",
                    highlight: { row: 0, col: 14 },
                    role: "Khách hàng"
                },
                {
                    title: "Bước 2: NCC xử lý",
                    description: "NCC chuột phải và chọn 'Đơn OK' hoặc 'Hủy đơn'",
                    role: "NCC"
                }
            ]
        }
    }

    const helpContent = currentOrder ? getOrderSpecificHelpContent() : getGeneralHelpContent()
    const currentHelpStep = helpContent?.[currentStep]

    const handleNext = () => {
        if (helpContent && currentStep < helpContent.length - 1) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleHelpClick = () => {
        setVisible(true)
        setShowHelpText(false)
        setCurrentStep(0) // Reset to first step
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current)
        }
    }

    return (
        <>
            {showHelpText && (
                <div
                    ref={helpTextRef}
                    className="fixed bottom-24 right-8 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer hover:bg-blue-600 transition-colors"
                    onClick={handleHelpClick}
                >
                    Bạn cần mình giúp đỡ gì không?
                </div>
            )}

            <Button
                type="primary"
                shape="circle"
                icon={<QuestionCircleOutlined />}
                size="large"
                className="bg-blue-600 hover:bg-blue-400 fixed bottom-8 right-8 shadow-lg"
                onClick={handleHelpClick}
            />

            <Modal
                title=""
                open={visible}
                onCancel={() => setVisible(false)}
                footer={null}
                width={600}
            >
                {helpContent ? (
                    <div className="mt-4">

                        <div className="bg-gray-50 p-6 rounded-lg mb-6">
                            <div className="text-center">
                                <h3 className="text-xl font-semibold mb-4 text-blue-600">
                                    {currentHelpStep?.title}
                                </h3>
                                <div
                                    className="text-lg mb-4 text-left"
                                    dangerouslySetInnerHTML={{ __html: currentHelpStep?.description || '' }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <Button
                                type="default"
                                onClick={handlePrev}
                                disabled={currentStep === 0}
                                icon={<ArrowLeftOutlined />}
                                className={`bg-white border border-blue-400 text-blue-600 flex items-center gap-2`}
                            >
                                Quay lại
                            </Button>
                            <div className="text-gray-500">
                                Bước {currentStep + 1}/{helpContent.length}
                            </div>
                            <Button
                                type="primary"
                                onClick={handleNext}
                                disabled={currentStep === helpContent.length - 1}
                                icon={<ArrowRightOutlined />}
                                className={`bg-blue-500 ${currentStep === helpContent.length - 1 ? '' : 'hover:bg-blue-600'}  flex items-center gap-2`}
                            >
                                Tiếp theo
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-lg">
                            Đơn hàng này không cần hướng dẫn hoặc đã hoàn thành các bước cần thiết.
                        </p>
                    </div>
                )}
            </Modal >

            {currentHelpStep?.highlight && (
                <Tooltip
                    title={currentHelpStep.description}
                    open={true}
                    placement="top"
                >
                    <div
                        className="absolute border-2 border-blue-500 rounded animate-pulse"
                        style={{
                            top: `${currentHelpStep.highlight.row * 30}px`,
                            left: `${currentHelpStep.highlight.col * 100}px`,
                            width: "100px",
                            height: "30px",
                            zIndex: 1000
                        }}
                    />
                </Tooltip>
            )
            }
        </>
    )
}

export default HelpButton 