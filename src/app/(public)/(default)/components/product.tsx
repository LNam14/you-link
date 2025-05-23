"use client"

import { useEffect, useState } from "react"
import GPTextVN from "./gp-text-vn"
import getUserInfo from "@/components/userInfo"
import sheetApiRequest from "@/apiRequests/sheet"
import { Database, Globe, Link, Layers, School, BookOpen, RefreshCw } from "lucide-react"
import { database } from "@/lib/firebase"
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
  // const [dataEntity, setDataEntity] = useState<any[]>([]);
  // const [dataEduGOV, setDataEduGOV] = useState<any[]>([]);
  // const [dataBacklink, setDataBacklink] = useState<any[]>([]);

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
      // setDataEntity(data.entity);
      // setDataEduGOV(data.Edu);
      // setDataBacklink(data.backlink);
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
        const productsRef = ref(database, 'data')
        onValue(productsRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val()
            // Chuyển đổi dữ liệu từ object sang array
            const productsArray = Object.entries(data).flatMap(([userId, userData]: [string, any]) => {
              if (userData.Products) {
                return Object.entries(userData.Products).map(([productId, product]: [string, any]) => ({
                  id: productId,
                  name: product.Site || product.name || 'Không có tên',
                  price: parseFloat(product.Price || product.price) || 0,
                  description: product.Description || product.description || '',
                  status: product.Status || product.status || 'available',
                  Type: product.Type || 'default'
                }))
              }
              return []
            })

            console.log('Fetched products:', productsArray)
            setProducts(productsArray)
          } else {
            console.log('No products found')
            setProducts([])
          }
          setLoading(false)
        }, (error: Error) => {
          console.error("Firebase data fetch error:", error)
          toast.error("Lỗi khi tải dữ liệu")
          setLoading(false)
        })
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
        quantity: 1
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
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-48 w-full bg-gray-200 mb-4 rounded" />
            <div className="h-6 w-3/4 bg-gray-200 mb-2 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 mb-4 rounded" />
            <div className="h-10 w-full bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <section className="bg-gradient-to-b from-white to-gray-100 py-16">
      <div className="w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 relative inline-block">
              {title}
              <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-pink-500 transform -translate-y-1"></span>
            </h2>
            <p className="text-gray-600">Khám phá các dịch vụ backlink chất lượng cao</p>
          </div>
        </div>
        {userInfo ? (
          <div>
            {dataLoaded ? (
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="flex flex-wrap justify-start gap-3 md:gap-4 w-full">
                  {tabItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTabs(item.id)}
                      className={`
                        flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300
                        ${tabs === item.id
                          ? "bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md"
                          : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }
                      `}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                onClick={loading ? undefined : fetchData}
                className={`m-2 flex flex-col items-center justify-center py-4 px-6 bg-white rounded-2xl shadow-xl max-w-2xl mx-auto transition-all duration-300 ease-in-out border border-gray-100 ${loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-2xl hover:scale-[1.02] cursor-pointer"}`}
              >
                {loading ? (
                  <div className="animate-spin h-16 w-16 text-orange-500 mb-8">
                    <RefreshCw className="h-full w-full" />
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-orange-500 to-pink-600 p-5 rounded-full text-white mb-4 shadow-lg">
                    <Database className="h-10 w-10" />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  {loading ? "Đang tải dữ liệu..." : "Sẵn sàng để nạp dữ liệu"}
                </h2>
                <p className="text-md text-gray-600 mb-4 text-center max-w-md">
                  {loading
                    ? "Vui lòng đợi trong khi chúng tôi nạp dữ liệu mới nhất."
                    : "Bấm vào đây để nạp dữ liệu mới nhất về các dịch vụ backlink của chúng tôi."}
                </p>
                {!loading && (
                  <button className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-medium rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300">
                    <RefreshCw className="w-5 h-5" />
                    Nạp dữ liệu
                  </button>
                )}
              </div>
            )}

            {dataLoaded && (
              <div className="shadow-lg overflow-hidden w-full">
                {tabs === "GP-Text VN" && <GPTextVN fetchData={fetchData} data={dataGPTextVN} loading={loading} />}
                {tabs === "GP-Text NN" && <GPTextVN fetchData={fetchData} data={dataGPTextNN} loading={loading} />}
                {tabs === "Content" && <Content fetchData={fetchData} data={dataContent} loading={loading} />}
                {/* {tabs === "Backlink" && <Backlink data={dataBacklink} loading={loading} />}
                {tabs === "Entity" && <Entity data={dataEntity} loading={loading} />}
                {tabs === "EDU GOV" && <EDUGOV data={dataEduGOV} loading={loading} />}
                {tabs === "Book-Bao" && <BookBao data={dataBookBao} loading={loading} />} */}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
            <div className="bg-orange-100 text-orange-600 p-4 rounded-full inline-flex mb-6">
              <Database className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Vui lòng đăng nhập</h3>
            <p className="text-gray-600 mb-6">Đăng nhập để xem các dịch vụ backlink của chúng tôi</p>
            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-medium rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300">
              Đăng nhập
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default Product

