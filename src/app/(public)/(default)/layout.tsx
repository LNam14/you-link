"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence, m, motion } from "framer-motion"
import { Trash, ShoppingBag, ShoppingCart, X, Search, DollarSign, Tag, Clock, Plus, Minus, User } from "lucide-react"
import getUserInfo from "@/components/userInfo"
import { ref, onValue, remove, update, get, set } from "firebase/database"
import { message } from "antd"
import { database } from "@/app/firebase/firebase"
import Header from "./components/ui/header"
import Footer from "./components/ui/footer"
import Script from "next/script"

interface CartItem {
  MaDon: string
  GiaBanGP?: string
  GiaBanText?: string
  GiaBanTextHeader?: string
  GiaBanTextHome?: string
  GiaMuaGP?: string
  GiaMuaText?: string
  GiaMuaTextHeader?: number
  GiaMuaTextHome?: number
  HoaHongGP?: string
  HoaHongText?: string
  Site?: string
  Loai?: string
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [musicAudio, setMusicAudio] = useState<HTMLAudioElement | null>(null)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [itemQuantities, setItemQuantities] = useState<{ [key: string]: number }>({})
  const [customerName, setCustomerName] = useState("")
  const [customerNameError, setCustomerNameError] = useState("")
  const [discount, setDiscount] = useState("")
  const [cartSummary, setCartSummary] = useState({
    totalItems: 0,
    totalPrice: 0,
    byLoai: {
      GP: { count: 0, price: 0 },
      Text: { count: 0, price: 0 },
      TextHeader: { count: 0, price: 0 },
      TextHome: { count: 0, price: 0 },
    },
  })
  const cartRef = useRef<HTMLDivElement>(null)
  const user = getUserInfo()
  const [isProcessing, setIsProcessing] = useState(false)

  // Check if user has Admin or Nhân viên role
  const isAdminOrStaff = user?.role === "Admin" || user?.role === "Nhân viên"

  // Get the effective username (either customer name for admin/staff or user's username)
  const getEffectiveUsername = () => {
    if (isAdminOrStaff && customerName.trim()) {
      return customerName.trim()
    }
    return user?.username || ""
  }

  useEffect(() => {
    if (!user) return

    const cartRef = ref(database, `data/${user.id}`)

    const unsubscribe = onValue(cartRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        let cartArray = []

        // Check if Products array exists directly under user ID
        if (data.Products && Array.isArray(data.Products)) {
          cartArray = data.Products.map((product: any, index: any) => ({
            id: index.toString(),
            ...product,
          })).filter((product: any) => product.Status === "Đang xử lý")
        }
        // Check if products object exists
        else if (data.products) {
          cartArray = Object.entries(data.products)
            .map(([productId, product]: [string, any]) => ({
              id: productId,
              ...product,
            }))
            .filter((product: any) => product.Status === "cart")
        }
        // Backward compatibility with old structure
        else {
          cartArray = Object.entries(data)
            .filter(
              ([key, value]: [string, any]) =>
                key.startsWith("KH") &&
                value.Products &&
                Object.values(value.Products).some((p: any) => p.Status === "cart"),
            )
            .flatMap(([key, value]: [string, any]) =>
              Object.entries(value.Products)
                .map(([productId, product]: [string, any]) => ({
                  id: productId,
                  khId: key,
                  ...product,
                }))
                .filter((product: any) => product.Status === "cart"),
            )
        }

        // Only update state if cart items have actually changed
        if (JSON.stringify(cartArray) !== JSON.stringify(cartItems)) {
          setCartItems(cartArray)

          // Calculate cart summary
          const summary: any = {
            totalItems: cartArray.length,
            totalPrice: 0,
            byLoai: {
              GP: { count: 0, price: 0 },
              Text: { count: 0, price: 0 },
              TextHeader: { count: 0, price: 0 },
              TextHome: { count: 0, price: 0 },
            },
          }

          cartArray.forEach((item: any) => {
            const type = item.Loai || "GP"
            const price = Number(
              type === "GP"
                ? item.GiaBanGP || 0
                : type === "Text"
                  ? item.GiaBanText || 0
                  : type === "TextHome"
                    ? item.GiaBanTextHome || 0
                    : item.GiaBanTextHeader || 0,
            )

            summary.totalPrice += price
            summary.byLoai[type].count += 1
            summary.byLoai[type].price += price
          })

          setCartSummary(summary)
        }
      } else {
        // Only update state if cart is not already empty
        if (cartItems.length > 0) {
          setCartItems([])
          setCartSummary({
            totalItems: 0,
            totalPrice: 0,
            byLoai: {
              GP: { count: 0, price: 0 },
              Text: { count: 0, price: 0 },
              TextHeader: { count: 0, price: 0 },
              TextHome: { count: 0, price: 0 },
            },
          })
        }
      }
    })

    return () => unsubscribe()
  }, [user]) // Only depend on user changes

  // Separate useEffect for initializing quantities
  useEffect(() => {
    const newQuantities = { ...itemQuantities }
    let hasNewItems = false

    cartItems.forEach((item: any) => {
      if (!newQuantities[item.id]) {
        newQuantities[item.id] = 1
        hasNewItems = true
      }
    })

    if (hasNewItems) {
      setItemQuantities(newQuantities)
    }
  }, [cartItems]) // Only depend on cartItems changes

  // Validate customer name for Admin and Staff
  useEffect(() => {
    if (isAdminOrStaff) {
      if (customerName.includes("-") || customerName.includes("/")) {
        setCustomerNameError("Tên khách hàng không được chứa dấu '-' hoặc dấu '/'!")
      } else {
        setCustomerNameError("")
      }
    } else {
      setCustomerNameError("")
    }
  }, [customerName, isAdminOrStaff])

  const toggleCart = () => setIsOpen(!isOpen)

  const handleDelete = (productId: string) => {
    if (!user) return
    // Use the new path structure
    const itemRef = ref(database, `data/${user.id}/Products/${productId}`)
    remove(itemRef)
      .then(() => {
        setCartItems(cartItems.filter((item: any) => item.id !== productId))
        message.success("Xóa sản phẩm thành công!")
      })
      .catch((error) => {
        console.error("Lỗi khi xóa từ Firebase:", error)
        message.error("Lỗi khi xóa sản phẩm. Vui lòng thử lại.")
      })
  }

  const handleDeleteSelected = () => {
    if (!user || selectedItems.length === 0) return

    Promise.all(
      selectedItems.map((id) => {
        const itemRef = ref(database, `data/${user.id}/Products/${id}`)
        return remove(itemRef)
      }),
    )
      .then(() => {
        message.success(`Đã xóa ${selectedItems.length} sản phẩm thành công!`)
        setSelectedItems([])
      })
      .catch((error) => {
        console.error("Lỗi khi xóa sản phẩm:", error)
        message.error("Có lỗi xảy ra khi xóa sản phẩm")
      })
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredCartItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredCartItems.map((item) => item.id))
    }
  }

  const filteredCartItems = cartItems.filter((item) => {
    // Filter by tab
    if (activeTab !== "all" && item.Loai !== activeTab) {
      return false
    }

    // Filter by search
    if (searchQuery && !item.Site?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    return true
  })

  const getItemPrice = (item: any) => {
    return Number(
      item.Loai === "GP"
        ? item.GiaBanGP || 0
        : item.Loai === "Text"
          ? item.GiaBanText || 0
          : item.Loai === "TextHome"
            ? item.GiaBanTextHome || 0
            : item.GiaBanTextHeader || 0,
    )
  }

  const subtotal =
    selectedItems.length > 0
      ? selectedItems.reduce((acc, id) => {
        const item: any = cartItems.find((item) => item.id === id)
        return item ? acc + getItemPrice(item) * (itemQuantities[id] || 1) : acc
      }, 0)
      : cartItems.reduce((acc, item) => {
        return acc + getItemPrice(item) * (itemQuantities[item.id] || 1)
      }, 0)

  // Calculate discount amount and final total
  const discountAmount = discount ? (subtotal * parseFloat(discount) / 100) : 0
  const finalTotal = subtotal - discountAmount

  // Scroll to top of cart when tab changes
  useEffect(() => {
    if (cartRef.current) {
      cartRef.current.scrollTop = 0
    }
  }, [activeTab])

  // Handle quantity change
  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setItemQuantities((prev) => ({
      ...prev,
      [id]: newQuantity,
    }))
  }

  // Replace the findNextAvailableId function with this updated version
  const findNextAvailableId = (username: string, orders: any[]): { orderNumber: number; nextId: string } => {
    // Find the highest order number (X) for this username
    let highestOrderNumber = 0

    orders.forEach((order) => {
      if (order.MaDon && order.MaDon.startsWith(username)) {
        const parts = order.MaDon.split("-")
        if (parts.length >= 2) {
          const orderNumber = Number.parseInt(parts[1], 10)
          if (!isNaN(orderNumber) && orderNumber > highestOrderNumber) {
            highestOrderNumber = orderNumber
          }
        }
      }
    })

    // For a new order, increment the highest order number
    const nextOrderNumber = highestOrderNumber + 1

    // Return the next order number and the first ID in the sequence
    return {
      orderNumber: nextOrderNumber,
      nextId: `${username}-${nextOrderNumber}-1`,
    }
  }

  // Process checkout with item duplication
  const processCheckout = async () => {
    if (!user || cartItems.length === 0) return

    // Validate customer name for Admin and Staff
    if (isAdminOrStaff && !customerName.trim()) {
      message.error("Vui lòng nhập tên khách hàng trước khi lên đơn!")
      return
    }
    if (isAdminOrStaff && customerNameError) {
      message.error(customerNameError)
      return
    }

    try {
      setIsProcessing(true)
      // Get existing orders
      const ordersRef = ref(database, "orders")
      const ordersSnapshot = await get(ordersRef)

      // Initialize orders array
      let existingOrders = []

      // If orders exist, get them
      if (ordersSnapshot.exists()) {
        const ordersData = ordersSnapshot.val()
        // Check if it's already an array
        if (Array.isArray(ordersData)) {
          existingOrders = ordersData
        } else {
          // Convert object to array if needed
          existingOrders = Object.values(ordersData)
        }
      }

      // Clean existing orders to remove any undefined values
      existingOrders = existingOrders.filter(order => order !== null && order !== undefined)

      const { orderNumber } = findNextAvailableId(getEffectiveUsername(), existingOrders)

      // Group items by their base MaDon
      const groupedItems = new Map()
      let globalSequentialNumber = 1

      cartItems.forEach((item: any) => {
        const quantity = itemQuantities[item.id] || 1
        const baseMaDon = `${getEffectiveUsername()}-${orderNumber}`

        if (!groupedItems.has(baseMaDon)) {
          groupedItems.set(baseMaDon, {
            items: [],
            totalUSDT: 0,
            totalGiaMua: 0,
            itemTypes: new Set()
          })
        }

        const group = groupedItems.get(baseMaDon)

        // Add items to the group
        for (let i = 0; i < quantity; i++) {
          const orderId = `${baseMaDon}-${globalSequentialNumber++}`
          const itemPrice = Number(
            item.Loai === "GP"
              ? item.GiaBanGP || 0
              : item.Loai === "Text"
                ? item.GiaBanText || 0
                : item.Loai === "TextHome"
                  ? item.GiaBanTextHome || 0
                  : item.GiaBanTextHeader || 0
          )
          const itemGiaMua = Number(
            item.Loai === "GP"
              ? item.GiaMuaGP || 0
              : item.Loai === "Text"
                ? item.GiaMuaText || 0
                : item.Loai === "TextHome"
                  ? item.GiaMuaTextHome || 0
                  : item.GiaMuaTextHeader || 0
          )

          // Create a clean item object with all required properties and no undefined values
          const cleanItem = {
            MaDon: orderId,
            KHMua: getEffectiveUsername(),
            Status: "Đang xử lý",
            TTNCC: "",
            TinhTrangNCC: "Chưa nhận đơn",
            TinhTrangKH: "Chưa nhập",
            NgayBan: "",
            Index: "No",
            BaiViet: "",
            LinkKQ: "",
            Anchor1: "",
            Link1: "",
            Anchor2: "",
            Link2: "",
            TimeText: 1,
            // Copy item properties with defaults to avoid undefined values
            Site: item.Site || "",
            Loai: item.Loai || "GP",
            GiaBanGP: item.GiaBanGP || "",
            GiaBanText: item.GiaBanText || "",
            GiaBanTextHeader: item.GiaBanTextHeader || "",
            GiaBanTextHome: item.GiaBanTextHome || "",
            GiaMuaGP: item.GiaMuaGP || "",
            GiaMuaText: item.GiaMuaText || "",
            GiaMuaTextHeader: item.GiaMuaTextHeader || "",
            GiaMuaTextHome: item.GiaMuaTextHome || "",
            HoaHongGP: item.HoaHongGP || "",
            HoaHongText: item.HoaHongText || "",
            TenCombo: item.TenCombo || "",
            id: item.id || "",
            khId: item.khId || "",
            TenNCC: item.TenNCC || "",
            TeleNCC: item.TeleNCC || ""
          }

          group.items.push(cleanItem)

          group.totalUSDT += itemPrice
          group.totalGiaMua += itemGiaMua
          group.itemTypes.add(item.Loai)
        }
      })

      // Create order summaries and detailed orders
      const newOrders = []
      for (const [baseMaDon, group] of groupedItems) {
        // Calculate HangMuc by counting actual items
        const itemTypeCounts = new Map<string, number>()
        group.items.forEach((item: any) => {
          const type = item.Loai
          itemTypeCounts.set(type, (itemTypeCounts.get(type) || 0) + 1)
        })

        const hangMucParts = []
        for (const [type, count] of itemTypeCounts) {
          hangMucParts.push(`${count}${type}`)
        }
        const hangMuc = hangMucParts.join(' - ')

        // Calculate final total with discount
        const discountAmount = discount ? (group.totalUSDT * parseFloat(discount) / 100) : 0
        const finalTotal = group.totalUSDT - discountAmount

        // Create order summary with all required properties
        const orderSummary = {
          MaDon: baseMaDon,
          NDD: user.username || "",
          Ngay: new Date().toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          TenNV: "",
          IDNV: "",
          Domain: "",
          HangMuc: hangMuc,
          Note1: discount ? `Chiết khấu: ${discount}% (-${discountAmount.toLocaleString("vi-VI")} $)` : "",
          TinhTrang: "dang_lam",
          TongTien: finalTotal,
          TiGia: "",
          VND: "",
          TKNhan: "",
          ThanhToan: "",
          LinkBill: "",
          Note2: "",
          KTXacNhan: "",
          ChiTietDonHang: group.items,
          ChietKhau: discount ? parseFloat(discount) : 0
        }

        newOrders.push(orderSummary)
      }

      // Combine existing and new orders
      const updatedOrders = [...existingOrders, ...newOrders]

      // Set the entire orders array
      await set(ordersRef, updatedOrders)

      // Delete all items from cart
      const deletePromises = cartItems.map((item: any) => {
        const itemRef = ref(database, `data/${user.id}/Products/${item.id}`)
        return remove(itemRef)
      })

      await Promise.all(deletePromises)

      message.success("Đơn hàng đã được tạo thành công!")
      setCartItems([])
      setIsOpen(false)
      window.open("/gp-text", "_blank")
    } catch (error) {
      console.error("Lỗi khi xử lý đơn hàng:", error)
      message.error("Có lỗi xảy ra khi xử lý đơn hàng. Vui lòng thử lại.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main onClick={() => setIsOpen(false)} className="flex-grow">
        {children}
      </main>
      <Footer border={true} />

      {/* <Script src="https://cdn.botpress.cloud/webchat/v2.5/inject.js" strategy="afterInteractive"></Script>
      <Script src="https://files.bpcontent.cloud/2025/05/16/10/20250516103809-ABWVLW5J.js" strategy="afterInteractive"></Script> */}
      {cartItems.length > 0 && (
        <button
          onClick={toggleCart}
          className="fixed bottom-4
           mb-1 right-4 p-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-40"
          aria-label="Mở giỏ hàng"
        >
          <div className="relative">
            <ShoppingCart className="h-7 w-7" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cartSummary.totalItems}
            </span>
          </div>
        </button>
      )}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 bg-gradient-to-br from-indigo-50 via-blue-50 to-white shadow-2xl z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-indigo-100 bg-white bg-opacity-90 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <ShoppingCart className="h-5 w-5 text-indigo-600 mr-2" />
                  <h2 className="text-xl font-semibold text-indigo-800">Giỏ hàng</h2>
                  <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {cartSummary.totalItems} sản phẩm
                  </span>
                </div>
                <button
                  onClick={toggleCart}
                  className="text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded-full p-1 transition-colors duration-200"
                  aria-label="Đóng giỏ hàng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Customer Name Input for Admin and Staff */}
              {isAdminOrStaff && (
                <div className="mt-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Nhập tên khách hàng..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border ${customerNameError ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm`}
                    />
                  </div>
                  {customerNameError && (
                    <div className="mt-1 text-xs text-red-600 font-medium">
                      {customerNameError}
                    </div>
                  )}
                  {customerName.trim() && !customerNameError && (
                    <div className="mt-1 text-xs text-indigo-600 font-medium">
                      Đơn hàng sẽ được tạo cho: {customerName.trim()}
                    </div>
                  )}
                </div>
              )}

              {/* Discount Input */}
              <div className="mt-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="Chiết khấu (%)"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                {discount && parseFloat(discount) > 0 && (
                  <div className="mt-1 text-xs text-green-600 font-medium">
                    Giảm: {discountAmount.toLocaleString("vi-VI")} $ ({discount}%)
                  </div>
                )}
              </div>

              <div className="mt-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm kiếm trong giỏ hàng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex mt-4 border-b border-indigo-100">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex-1 py-2 text-sm font-medium ${activeTab === "all"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-indigo-600"
                    }`}
                >
                  Tất cả ({cartSummary.totalItems})
                </button>
                <button
                  onClick={() => setActiveTab("GP")}
                  className={`flex-1 py-2 text-sm font-medium ${activeTab === "GP"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-indigo-600"
                    }`}
                >
                  GP ({cartSummary.byLoai.GP.count})
                </button>
                <button
                  onClick={() => setActiveTab("Text")}
                  className={`flex-1 py-2 text-sm font-medium ${activeTab === "Text"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-indigo-600"
                    }`}
                >
                  Text ({cartSummary.byLoai.Text.count})
                </button>
                <button
                  onClick={() => setActiveTab("TextHome")}
                  className={`flex-1 py-2 text-sm font-medium ${activeTab === "TextHome"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-indigo-600"
                    }`}
                >
                  Home ({cartSummary.byLoai.TextHome.count})
                </button>
              </div>
            </div>

            <div className="flex-grow p-4 overflow-y-auto" ref={cartRef} style={{ scrollbarWidth: "thin" }}>
              {filteredCartItems.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === filteredCartItems.length && filteredCartItems.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        {selectedItems.length > 0 ? `Đã chọn ${selectedItems.length} sản phẩm` : "Chọn tất cả"}
                      </span>
                    </div>

                    {selectedItems.length > 0 && (
                      <button
                        onClick={handleDeleteSelected}
                        className="text-red-500 hover:text-red-700 text-sm flex items-center"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Xóa đã chọn
                      </button>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {filteredCartItems.map((item: any) => {
                      const isSelected = selectedItems.includes(item.id)
                      const price = getItemPrice(item)
                      const quantity = itemQuantities[item.id] || 1
                      const totalPrice = price * quantity

                      return (
                        <li
                          key={item.id}
                          className={`rounded-xl flex items-start p-3 transition-all duration-200 ${isSelected
                            ? "bg-indigo-50 border border-indigo-200"
                            : "bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-sm"
                            }`}
                        >
                          <div className="flex items-center h-full mr-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectItem(item.id)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                          </div>

                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mr-3">
                            <ShoppingBag className="w-6 h-6 text-white" />
                          </div>

                          <div className="flex-grow">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-sm font-medium text-gray-900 break-all line-clamp-1">
                                  {item.Site || item.TenCombo}
                                </h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="inline-flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {item.Loai}
                                  </span>
                                  <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                    <DollarSign className="w-3 h-3 mr-1" />
                                    {price.toLocaleString("vi-VI")}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-gray-400 hover:text-red-500 focus:outline-none transition-colors duration-200 ml-2"
                                aria-label={`Xóa ${item.Loai} khỏi giỏ hàng`}
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <select
                                className="text-xs py-1 px-2 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer text-gray-700"
                                value={item.Loai}
                                onChange={(e) => {
                                  const newLoai = e.target.value
                                  // Update the item in Firebase
                                  const itemRef = ref(database, `data/${user?.id}/Products/${item.id}`)
                                  update(itemRef, {
                                    Loai: newLoai,
                                  })
                                }}
                              >
                                <option value="GP">Guest Post</option>
                                <option value="Text">Text Footer</option>
                                <option value="TextHeader">Text Header</option>
                                <option value="TextHome">Text Home</option>
                              </select>

                              <div className="flex items-center border border-gray-200 rounded bg-white">
                                <button
                                  className="px-2 py-1 text-gray-500 hover:text-indigo-600 focus:outline-none"
                                  onClick={() => handleQuantityChange(item.id, Math.max(1, quantity - 1))}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(item.id, Math.max(1, Number.parseInt(e.target.value) || 1))
                                  }
                                  className="w-10 text-center text-xs border-0 focus:outline-none focus:ring-0"
                                />
                                <button
                                  className="px-2 py-1 text-gray-500 hover:text-indigo-600 focus:outline-none"
                                  onClick={() => handleQuantityChange(item.id, quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {quantity > 1 && (
                              <div className="mt-2 text-right text-xs text-indigo-600 font-medium">
                                Tổng: {totalPrice.toLocaleString("vi-VI")} $
                              </div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                    <ShoppingCart className="w-10 h-10 text-indigo-400" />
                  </div>
                  {searchQuery ? (
                    <>
                      <p className="text-indigo-600 text-lg font-medium mb-2">Không tìm thấy kết quả</p>
                      <p className="text-gray-500 text-sm">Không tìm thấy sản phẩm nào phù hợp với "{searchQuery}"</p>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        Xóa tìm kiếm
                      </button>
                    </>
                  ) : activeTab !== "all" ? (
                    <>
                      <p className="text-indigo-600 text-lg font-medium mb-2">Không có sản phẩm {activeTab}</p>
                      <p className="text-gray-500 text-sm">Bạn chưa thêm sản phẩm nào loại {activeTab} vào giỏ hàng</p>
                      <button
                        onClick={() => setActiveTab("all")}
                        className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        Xem tất cả sản phẩm
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-indigo-600 text-lg font-medium mb-2">Giỏ hàng của bạn đang trống</p>
                      <p className="text-gray-500 text-sm">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-4 border-t border-indigo-100 bg-white bg-opacity-90 backdrop-blur-sm">
              {selectedItems.length > 0 && (
                <div className="mb-3 p-3 bg-indigo-50 rounded-lg">
                  <div className="flex justify-between items-center text-sm text-indigo-800">
                    <span>Đã chọn {selectedItems.length} sản phẩm</span>
                    <span>{subtotal.toLocaleString("vi-VI")} $</span>
                  </div>
                </div>
              )}

              {/* Customer Info for Admin/Staff */}
              {isAdminOrStaff && customerName.trim() && (
                <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center text-sm text-green-800">
                    <User className="w-4 h-4 mr-2" />
                    <span>Khách hàng: <strong>{customerName.trim()}</strong></span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-gray-600 text-sm">Tổng tiền:</span>
                  <span className="ml-2 text-lg font-semibold text-indigo-800">
                    {subtotal.toLocaleString("vi-VI")} $
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Cập nhật theo số lượng</span>
                </div>
              </div>

              {/* Discount Display */}
              {discount && parseFloat(discount) > 0 && (
                <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-800">Chiết khấu ({discount}%):</span>
                    <span className="text-green-800 font-medium">-{discountAmount.toLocaleString("vi-VI")} $</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-lg font-semibold text-green-800">
                    <span>Thành tiền:</span>
                    <span>{finalTotal.toLocaleString("vi-VI")} $</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  className="py-2 px-4 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors duration-200 text-sm font-medium flex items-center justify-center"
                  onClick={() => setIsOpen(false)}
                >
                  Tiếp tục mua sắm
                </button>
                <button
                  className={`py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center shadow-sm hover:shadow ${isAdminOrStaff && (!customerName.trim() || !!customerNameError)
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    }`}
                  onClick={processCheckout}
                  disabled={isAdminOrStaff && (!customerName.trim() || !!customerNameError)}
                  title={
                    isAdminOrStaff && (!customerName.trim() || customerNameError)
                      ? customerNameError || "Vui lòng nhập tên khách hàng trước khi lên đơn"
                      : "Lên đơn hàng"
                  }
                >
                  {isAdminOrStaff && (!customerName.trim() || customerNameError) ? "Nhập tên KH" : "Lên đơn"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
