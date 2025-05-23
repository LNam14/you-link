import { database } from "@/app/firebase/firebase";
import getUserInfo from "@/components/userInfo";
import { Divider, message, Spin, Tooltip } from "antd";
import { get, ref, set } from "firebase/database";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaChevronLeft, FaChevronRight, FaInfoCircle, FaShoppingCart } from "react-icons/fa";

export default function CardProduct({ data, loading }: { data: any[]; loading: boolean }) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [startIndex, setStartIndex] = useState(0);
    const [direction, setDirection] = useState<"left" | "right" | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const handlePrev = () => {
        if (startIndex > 0) {
            setDirection("left");
            setStartIndex((prevIndex) => Math.max(0, prevIndex - 8));
        }
    };

    const handleNext = () => {
        if (startIndex + 8 < data.length) {
            setDirection("right");
            setStartIndex((prevIndex) => Math.min(data.length - 8, prevIndex + 8));
        }
    };

    const isPrevDisabled = startIndex === 0;
    const isNextDisabled = startIndex + 8 >= data.length;
    const user = getUserInfo()
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const handleAddCart = async (item: any) => {
        try {
            // Truy vấn tất cả các mục trong `data`
            if (user) {
                const dataRef = ref(database, 'data');
                const snapshot = await get(dataRef);

                const itemCount = snapshot.exists() ? snapshot.size : 0;
                const newItemRef = ref(database, `data/${user.ID + itemCount}`);

                await set(newItemRef, {
                    id: user.ID + itemCount,
                    type: item.TenSP,
                    Loai: item.Loai,
                    TenCombo: item.TenGoi,
                    DonGia: item.DonGia || item.ThanhTien,
                    ThanhTien: item.ThanhTien,
                    SanPham: item.SanPham,
                    He: item.He || 0,
                    GiaMua: item.GiaMua,
                    SoLuong: item.SoLuong || 1,
                    idUser: user.ID,
                    NCC: item.NCC || 'Chưa xác định',
                    MaNCC: item.MaNCC || 'Chưa xác định'
                });
                alert("Thêm sản phẩm vào giỏ hàng thành công!");
            } else {
                message.error("Vui lòng đăng nhập để mua hàng!");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            message.error("Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng.");
        }
    };

    return (
        <Spin spinning={loading} className="min-h-[400px]">
            <div className="relative">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6"
                        key={startIndex}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {data.slice(startIndex, startIndex + 8).map((item: any, index: any) => (
                            <motion.div
                                key={index}
                                className="rounded-xl bg-white shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105"
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div className="bg-gradient-to-r to-blue-500 from-[#ff6807] py-2 px-4">
                                    <h2 className="text-lg font-semibold text-white flex justify-between items-center">
                                        <p>{item.TenGoi}</p>
                                        {item.Demo && (<a target="_blank" rel="noopener noreferrer" href={item.Demo} className="text-sm text-white">
                                            <u><i>Link demo</i></u>
                                        </a>)}
                                    </h2>
                                </div>
                                <div className="relative">
                                    <img
                                        src="https://seomarket88.com/images/backlink.jpg"
                                        alt={item.TenGoi}
                                    />
                                    <div className="absolute top-2 right-2 z-10">
                                        <Tooltip
                                            placement="bottom"
                                            title={item.SanPham}
                                            open={hoveredIndex === index}
                                            overlayClassName="custom-tooltip-modal"
                                            color="blue"

                                            overlayStyle={{
                                                padding: "2px",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                                                zIndex: 1000,
                                            }}
                                        >
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="text-white hover:text-blue-200 transition-colors duration-300"
                                                title={item.SanPham}
                                            >
                                                <FaInfoCircle size={20} />
                                            </motion.button>
                                        </Tooltip>
                                    </div>
                                </div>
                                <div className="py-2 px-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-md font-bold">
                                            {item.SanPham.length > 30 ? `${item.SanPham.slice(0, 30)}...` : item.SanPham}
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-center mt-4">
                                        <p className="text-[#F52B88] font-semibold text-md ">{(parseInt(item.ThanhTien) * 1000).toLocaleString('vi-VN')} đ</p>
                                        <span className="text-sm text-gray-500">
                                            Số lượng: {item.SoLuong > 0 ? `${item.SoLuong}` : 1}
                                        </span>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={() => handleAddCart(item)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="w-full mt-0 bg-blue-500 text-white py-1 rounded-[0.375rem] hover:bg-blue-600 transition-colors duration-300 flex items-center justify-center"
                                    aria-label={`Add ${item.Loai} to cart`}
                                >
                                    <FaShoppingCart className="mr-2" />
                                    Thêm vào giỏ hàng
                                </motion.button>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
                {!loading && (
                    <div className="flex justify-center">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePrev}
                            disabled={isPrevDisabled}
                            className="absolute -left-20 top-[190px] m-2 p-2 rounded-full shadow-md bg-white hover:bg-gray-100 text-blue-500 transition-colors duration-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                            aria-label="Previous packages"
                        >
                            <FaChevronLeft size={24} />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleNext}
                            disabled={isNextDisabled}
                            className="absolute -right-20 top-[190px] m-2 p-2 rounded-full shadow-md bg-white hover:bg-gray-100 text-blue-500 transition-colors duration-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                            aria-label="Next packages"
                        >
                            <FaChevronRight size={24} />
                        </motion.button>
                    </div>
                )}
            </div>
        </Spin>
    );
}
