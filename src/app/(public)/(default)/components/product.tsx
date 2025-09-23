"use client"

import { useEffect, useState } from "react"
import DataSite from "./data-site"
import getUserInfo from "@/components/userInfo"
import sheetApiRequest from "@/apiRequests/sheet"
import { Database, Globe, BookOpen, RefreshCw } from "lucide-react"
import { database } from "@/app/firebase/firebase"
import { ref, onValue, set } from "firebase/database"
import { toast } from "sonner"
import Content from "./content"

interface ProductType {
  id: string
  name: string
  price: number
  description?: string
  status: string
}

const Product = ({ title }: { title: string }) => {
  const [tabs, setTabs] = useState("GP-Text VN")
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [dataGPTextVN, setDataGPTextVN] = useState<any[]>([])
  const [dataGPTextNN, setDataGPTextNN] = useState<any[]>([])
  const [products, setProducts] = useState<ProductType[]>([])
  const [dataContent, setDataContent] = useState<any[]>([])

  const handleSelectTabs = (tab: string) => {
    setTabs(tab)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const data: any = await sheetApiRequest.getData()
      setDataGPTextVN(data.gpTextVN)
      setDataGPTextNN(data.gpTextNN)
      setDataContent(data.content)
      console.log(data.content)
      setDataLoaded(true)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const userInfo = getUserInfo()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchProducts = () => {
      try {
        // Lấy dữ liệu từ nhánh products trong Firebase
        const productsRef = ref(database, "data")
        onValue(
          productsRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val()
              // Chuyển đổi dữ liệu từ object sang array
              const productsArray = Object.entries(data).flatMap(([userId, userData]: [string, any]) => {
                if (userData.Products) {
                  return Object.entries(userData.Products).map(([productId, product]: [string, any]) => ({
                    id: productId,
                    name: product.Site || product.name || "Không có tên",
                    price: Number.parseFloat(product.Price || product.price) || 0,
                    description: product.Description || product.description || "",
                    status: product.Status || product.status || "available",
                    Type: product.Type || "default",
                  }))
                }
                return []
              })

              console.log("Fetched products:", productsArray)
              setProducts(productsArray)
            } else {
              console.log("No products found")
              setProducts([])
            }
            setLoading(false)
          },
          (error: Error) => {
            console.error("Firebase data fetch error:", error)
            toast.error("Lỗi khi tải dữ liệu")
            setLoading(false)
          },
        )
      } catch (error) {
        console.error("Error in fetchProducts:", error)
        toast.error("Không thể tải dữ liệu sản phẩm")
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const addToCart = async (product: ProductType) => {
    if (!userInfo) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng")
      return
    }

    try {
      const cartRef = ref(database, `carts/${userInfo?.id}/${product.id}`)
      await set(cartRef, {
        ...product,
        quantity: 1,
      })
      toast.success("Đã thêm vào giỏ hàng")
    } catch (error) {
      console.error("Error adding to cart:", error)
      toast.error("Không thể thêm vào giỏ hàng")
    }
  }

  if (!mounted) {
    return null
  }

  const tabItems = [
    { id: "GP-Text VN", label: "GP Text VN", icon: <Database className="w-4 h-4" /> },
    { id: "GP-Text NN", label: "GP Text NN", icon: <Globe className="w-4 h-4" /> },
    { id: "Content", label: "Content", icon: <BookOpen className="w-4 h-4" /> },
  ]

  if (loading) {
    // Remove the full-page loading state that shows skeleton loaders
    // We'll only show loading state on the button instead
  }

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(90deg,#fff0f3_0%,#ffe6f3_50%,#fff0f3_100%)] py-16">
      {/* Animated background elements (referenced from spin-lucky style) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Bouncing icons (red–pink theme) */}
        <div className="absolute top-16 left-10 animate-bounce delay-1000 opacity-80">
          <Database className="h-8 w-8 text-rose-500" />
        </div>
        <div className="absolute top-16 right-10 animate-bounce delay-1500 opacity-80">
          <Globe className="h-8 w-8 text-pink-500" />
        </div>
        <div className="absolute bottom-24 left-24 animate-bounce delay-3000 opacity-80">
          <BookOpen className="h-12 w-12 text-rose-400" />
        </div>
        <div className="absolute bottom-24 right-24 animate-bounce delay-2500 opacity-80">
          <BookOpen className="h-12 w-12 text-pink-400" />
        </div>
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-gradient-to-r from-rose-100 to-pink-100 rounded-full filter blur-3xl opacity-45 animate-pulse"></div>
        <div className="absolute top-1/4 right-1/5 w-96 h-96 bg-gradient-to-l from-pink-100 to-rose-100 rounded-full filter blur-3xl opacity-45 animate-pulse"></div>
        <div className="absolute bottom-1/5 left-1/4 w-80 h-80 bg-gradient-to-r from-red-100 to-rose-100 rounded-full filter blur-3xl opacity-40 animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/5 right-1/4 w-80 h-80 bg-gradient-to-l from-rose-100 to-red-100 rounded-full filter blur-3xl opacity-40 animate-pulse delay-2000"></div>
      </div>
      <div className="w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12">
            <h2 className="text-center text-3xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-600 via-pink-600 to-red-500 mb-2 drop-shadow">
              {title}
            </h2>
            <p className="text-gray-700 text-base text-center">Khám phá các dịch vụ backlink chất lượng cao</p>
          </div>
        </div>
        <div>
          {dataLoaded ? (
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="flex flex-wrap justify-start gap-3 md:gap-4 w-full p-2 bg-white/80 backdrop-blur rounded-xl border border-gray-200 shadow-md">
                {tabItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTabs(item.id)}
                    className={`
                        flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300
                        ${tabs === item.id
                        ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }
                      `}
                  >
                    <span className={`${idx % 3 === 0 ? "anim-bounce" : idx % 3 === 1 ? "anim-wiggle" : "anim-float"}`} style={{ animationDelay: `${idx * 0.15}s` }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              onClick={loading ? undefined : fetchData}
              data-load-products
              className={`m-2 flex flex-col items-center justify-center py-4 px-6 bg-white rounded-2xl shadow-xl max-w-2xl mx-auto transition-all duration-300 ease-in-out border border-gray-100 ${loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-2xl hover:scale-[1.02] cursor-pointer"}`}
            >
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-5 rounded-full text-white mb-4 shadow-lg">
                <Database className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {loading ? "Đang tải dữ liệu..." : "Sẵn sàng để nạp dữ liệu"}
              </h2>
              <p className="text-md text-gray-600 mb-4 text-center max-w-md">
                {loading
                  ? "Vui lòng đợi trong khi chúng tôi nạp dữ liệu mới nhất."
                  : "Bấm vào đây để nạp dữ liệu mới nhất về các dịch vụ backlink của chúng tôi."}
              </p>
              <button
                onClick={loading ? undefined : fetchData}
                disabled={loading}
                className={`inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Đang nạp..." : "Nạp dữ liệu"}
              </button>
            </div>
          )}

          {dataLoaded && (
            <div className="shadow-2xl rounded-2xl border border-gray-100 bg-white overflow-hidden w-full">
              {tabs === "GP-Text VN" && <DataSite fetchData={fetchData} data={dataGPTextVN} loading={loading} />}
              {tabs === "GP-Text NN" && <DataSite fetchData={fetchData} data={dataGPTextNN} loading={loading} />}
              {tabs === "Content" && <Content fetchData={fetchData} data={dataContent} loading={loading} />}
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-6deg) translateY(-2px); }
          75% { transform: rotate(6deg) translateY(-2px); }
        }
        @keyframes bounceSoft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10%); }
        }
        @keyframes drift {
          0% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(10px, -10px, 0) scale(1.03); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        .anim-float { animation: floatY 2.4s ease-in-out infinite; }
        .anim-wiggle { animation: wiggle 2s ease-in-out infinite; }
        .anim-bounce { animation: bounceSoft 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .anim-drift-slow { animation: drift 10s ease-in-out infinite; }
        .delay-1000 { animation-delay: 1s; }
        .delay-2000 { animation-delay: 2s; }
        .delay-3000 { animation-delay: 3s; }
      `}</style>
    </section>
  )
}

export default Product
