import { FaFacebook, FaTelegramPlane } from "react-icons/fa"

export default function Contact({ title }: any) {
  return (
    <section className="bg-gradient-to-b from-white to-gray-100 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 relative inline-block">
            {title}
            <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-pink-500 transform -translate-y-1"></span>
          </h2>
          <p className="text-gray-600">Kết nối với chúng tôi qua các kênh truyền thông</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Fanpage */}
          <a
            href="https://www.facebook.com/@fshop88.c0m"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4 group-hover:bg-blue-600 transition-colors duration-300">
                <FaFacebook className="text-3xl text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Fanpage</h3>
                <p className="text-sm text-gray-500">Theo dõi cập nhật mới nhất</p>
              </div>
            </div>
          </a>

          {/* Group Telegram */}
          <a
            href="https://t.me/backlinkf88"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center">
              <div className="bg-blue-50 p-3 rounded-full mr-4 group-hover:bg-blue-500 transition-colors duration-300">
                <FaTelegramPlane className="text-3xl text-blue-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Group Telegram</h3>
                <p className="text-sm text-gray-500">Trao đổi trực tiếp với cộng đồng</p>
              </div>
            </div>
          </a>

          {/* Group Facebook 1 */}
          <a
            href="https://www.facebook.com/groups/1202801100124719/"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4 group-hover:bg-blue-600 transition-colors duration-300">
                <FaFacebook className="text-3xl text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Group Facebook 1</h3>
                <p className="text-sm text-gray-500">Cộng đồng SEO chuyên nghiệp</p>
              </div>
            </div>
          </a>

          {/* Group Facebook 2 */}
          <a
            href="https://www.facebook.com/groups/thietkewebsitef"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4 group-hover:bg-blue-600 transition-colors duration-300">
                <FaFacebook className="text-3xl text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Group Facebook 2</h3>
                <p className="text-sm text-gray-500">Thiết kế website chuyên nghiệp</p>
              </div>
            </div>
          </a>

          {/* Group Facebook 3 */}
          <a
            href="https://www.facebook.com/groups/499244037426209"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4 group-hover:bg-blue-600 transition-colors duration-300">
                <FaFacebook className="text-3xl text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Group Facebook 3</h3>
                <p className="text-sm text-gray-500">Chia sẻ kinh nghiệm SEO</p>
              </div>
            </div>
          </a>

          {/* Group Facebook 4 */}
          <a
            href="https://www.facebook.com/groups/gpviet"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4 group-hover:bg-blue-600 transition-colors duration-300">
                <FaFacebook className="text-3xl text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Group Facebook 4</h3>
                <p className="text-sm text-gray-500">Cộng đồng GP Việt</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}

