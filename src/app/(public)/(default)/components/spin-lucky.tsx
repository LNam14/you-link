import SpinWheel from "./wheel"
import { Gift } from "lucide-react"

export default function SpinLucky({ title }: any) {
  return (
    <section className="bg-gradient-to-b from-white to-gray-100 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 relative inline-block">
            {title}
            <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-pink-500 transform -translate-y-1"></span>
          </h2>
          <p className="text-gray-600">Thử vận may của bạn và nhận những phần quà hấp dẫn</p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16">
          <div className="max-w-md">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-orange-500 to-pink-600 p-2 rounded-full text-white">
                  <Gift className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Các phần quà</h3>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span>100.000 VND</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                  <span>200.000 VND</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>500.000 VND</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>1.000.000 VND</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>10 USDT</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span>20 USDT</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>50 USDT</span>
                </li>
              </ul>
              <p className="mt-4 text-sm text-gray-600">Quay ngay để có cơ hội nhận những phần quà giá trị!</p>
            </div>
          </div>

          {/* <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full opacity-20 blur-xl"></div>
            <div className="relative z-10">
              <SpinWheel />
            </div>
          </div> */}
        </div>
      </div>
    </section>
  )
}

