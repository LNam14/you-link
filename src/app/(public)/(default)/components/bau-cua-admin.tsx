"use client"

import { useState } from "react"
import { toast } from "sonner"
import { bauCuaApiService } from "@/apiServices/bau-cua"

export default function BauCuaAdmin() {
    const [isProcessing, setIsProcessing] = useState(false)

    const handleProcessResult = async () => {
        setIsProcessing(true)
        try {
            const result = await bauCuaApiService.processResult()
            toast.success("Đã xử lý kết quả thành công!")
            console.log('Result:', result)
        } catch (error: any) {
            console.error('Error processing result:', error)
            toast.error(`Lỗi: ${error.message}`)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleManualCron = async () => {
        setIsProcessing(true)
        try {
            const result = await bauCuaApiService.runCronJob()
            toast.success("Đã chạy cron job thành công!")
            console.log('Cron result:', result)
        } catch (error: any) {
            console.error('Error running cron:', error)
            toast.error(`Lỗi: ${error.message}`)
        } finally {
            setIsProcessing(false)
        }
    }


    const handleCreateTestData = async () => {
        setIsProcessing(true)
        try {
            const result = await bauCuaApiService.createTestData()
            toast.success("Đã tạo test data thành công!")
            console.log('Test data result:', result)
        } catch (error: any) {
            console.error('Error creating test data:', error)
            toast.error(`Lỗi: ${error.message}`)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCreateEmptyTestData = async () => {
        setIsProcessing(true)
        try {
            const result = await bauCuaApiService.createEmptyTestData()
            toast.success("Đã tạo test data trống thành công!")
            console.log('Empty test data result:', result)
        } catch (error: any) {
            console.error('Error creating empty test data:', error)
            toast.error(`Lỗi: ${error.message}`)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCreateAllChosenTestData = async () => {
        setIsProcessing(true)
        try {
            const result = await bauCuaApiService.createAllChosenTestData()
            toast.success("Đã tạo test data (tất cả con vật được chọn) thành công!")
            console.log('All chosen test data result:', result)
        } catch (error: any) {
            console.error('Error creating all chosen test data:', error)
            toast.error(`Lỗi: ${error.message}`)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCreateMultipleWinnersTestData = async () => {
        setIsProcessing(true)
        try {
            const result = await bauCuaApiService.createMultipleWinnersTestData()
            toast.success("Đã tạo test data (nhiều con vật thắng) thành công!")
            console.log('Multiple winners test data result:', result)
        } catch (error: any) {
            console.error('Error creating multiple winners test data:', error)
            toast.error(`Lỗi: ${error.message}`)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                🎯 Quản lý Bầu Cua
            </h3>
            
            <div className="space-y-4">
                <button
                    onClick={handleProcessResult}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                    {isProcessing ? "Đang xử lý..." : "Xử lý kết quả hôm nay"}
                </button>

                <button
                    onClick={handleManualCron}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                >
                    {isProcessing ? "Đang chạy..." : "Chạy cron job thủ công"}
                </button>


                <button
                    onClick={handleCreateTestData}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50"
                >
                    {isProcessing ? "Đang tạo..." : "Tạo Test Data"}
                </button>

                <button
                    onClick={handleCreateEmptyTestData}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50"
                >
                    {isProcessing ? "Đang tạo..." : "Test Không Ai Chọn"}
                </button>

                <button
                    onClick={handleCreateAllChosenTestData}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-blue-700 transition-all disabled:opacity-50"
                >
                    {isProcessing ? "Đang tạo..." : "Test Tất Cả Được Chọn"}
                </button>

                <button
                    onClick={handleCreateMultipleWinnersTestData}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50"
                >
                    {isProcessing ? "Đang tạo..." : "Test Nhiều Con Vật Thắng"}
                </button>
            </div>

            <div className="mt-4 text-sm text-gray-600 text-center">
                <p>• Xử lý kết quả: Tìm con vật ít người chọn nhất</p>
                <p>• Tự động tạo wheel reward cho người thắng</p>
                <p>• Gửi thông báo kết quả tới Telegram</p>
            </div>
        </div>
    )
}
