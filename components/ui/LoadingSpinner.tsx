import { RefreshCw } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
}

export default function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}>
    <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[300px]">
        <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />
        <h3 className="text-xl font-semibold text-gray-800">Đang tải dữ liệu...</h3>
        <p className="text-sm text-gray-500 text-center">Vui lòng đợi trong khi chúng tôi tải dữ liệu mới nhất</p>
        {/* Progress indicator */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
    </div>
</div>
  );
}

