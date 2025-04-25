"use client"
import { HotTable } from "@handsontable/react-wrapper"
import { registerAllModules } from "handsontable/registry"
import "./custom-table.css"
import Handsontable from "handsontable"
import "handsontable/styles/handsontable.css"
import "handsontable/styles/ht-theme-main.css"
import "handsontable/styles/ht-theme-horizon.css"
import { useEffect, useState, useCallback } from "react"
import { ref, onValue, update, get, set } from "firebase/database"
import { database } from "@/lib/firebase"
import getUserInfo from "@/components/userInfo"
import ChatDialog from "./components/ChatDialog"
import sheetApiRequest from "@/apiRequests/sheet"

registerAllModules()

type NestedColumnHeader = {
    label: string
    colspan: number
}

interface ChatMessage {
    text: string
    sender: string
    senderRole: string
    timestamp: number
    ngayChat: string
    name?: string
    supplierName?: string
}

export default function PageBody() {
    const [tableData, setTableData] = useState<any[]>([])
    const userInfo = getUserInfo()
    const [chatDialogOpen, setChatDialogOpen] = useState(false)
    const [currentChatOrderId, setCurrentChatOrderId] = useState<string | null>(null)
    const [currentChatMessages, setCurrentChatMessages] = useState<any[]>([])
    const [newChatMessage, setNewChatMessage] = useState("")

    const parseNumberWithComma = (value: any): number => {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        // Thay thế dấu phẩy bằng dấu chấm và chuyển đổi thành số
        return parseFloat(value.toString().replace(/,/g, '')) || 0;
    };

    // Add summary calculation function
    const calculateSummary = (data: any[]) => {
        const summary = {
            totalGiaBan: 0,
            totalGiaMua: 0,
            totalLN: 0,
            totalTTNCC: 0,
            count: 0,
            cancelledGiaBan: 0,
            cancelledGiaMua: 0,
            cancelledLN: 0,
            cancelledTTNCC: 0,
            cancelledCount: 0,
            pendingGiaBan: 0,
            pendingGiaMua: 0,
            pendingLN: 0,
            pendingTTNCC: 0,
            pendingCount: 0
        }

        data.forEach(row => {
            if (row[0] && !row[0].includes("Tổng")) { // Skip summary rows
                const giaBan = parseNumberWithComma(row[12]) || 0
                const giaMua = parseNumberWithComma(row[13]) || 0
                const ln = parseNumberWithComma(row[14]) || 0
                const ttncc = parseNumberWithComma(row[15]) || 0
                const tinhTrangKH = row[18]
                const tinhTrangNCC = row[19]

                // Calculate totals for all orders
                if ((tinhTrangKH === "Đã nhập" || tinhTrangKH === "Đơn OK" || tinhTrangKH === "Y/C Hủy đơn") && (tinhTrangNCC === "Đã lên bài" || tinhTrangNCC === "Từ chối hủy")) {
                    summary.totalGiaBan += giaBan
                    summary.totalGiaMua += giaMua
                    summary.totalLN += ln
                    summary.totalTTNCC += ttncc
                    summary.count++
                }

                // Calculate totals for cancelled orders
                if (tinhTrangKH === "Hủy đơn" || (tinhTrangKH === "Y/C Hủy đơn" && tinhTrangNCC === "Đồng ý hoàn")) {
                    summary.cancelledGiaBan += giaBan
                    summary.cancelledGiaMua += giaMua
                    summary.cancelledLN += ln
                    summary.cancelledTTNCC += ttncc
                    summary.cancelledCount++
                }

                // Calculate totals for pending orders
                if ((tinhTrangKH === "Chưa nhập" || tinhTrangKH === "Đã nhập") && tinhTrangNCC === "Chưa nhận") {
                    summary.pendingGiaBan += giaBan
                    summary.pendingGiaMua += giaMua
                    summary.pendingLN += ln
                    summary.pendingTTNCC += ttncc
                    summary.pendingCount++
                }
            }
        })

        // Format numbers to 2 decimal places
        summary.totalGiaBan = Number(summary.totalGiaBan.toFixed(2))
        summary.totalGiaMua = Number(summary.totalGiaMua.toFixed(2))
        summary.totalLN = Number(summary.totalLN.toFixed(2))
        summary.totalTTNCC = Number(summary.totalTTNCC.toFixed(2))
        summary.cancelledGiaBan = Number(summary.cancelledGiaBan.toFixed(2))
        summary.cancelledGiaMua = Number(summary.cancelledGiaMua.toFixed(2))
        summary.cancelledLN = Number(summary.cancelledLN.toFixed(2))
        summary.cancelledTTNCC = Number(summary.cancelledTTNCC.toFixed(2))
        summary.pendingGiaBan = Number(summary.pendingGiaBan.toFixed(2))
        summary.pendingGiaMua = Number(summary.pendingGiaMua.toFixed(2))
        summary.pendingLN = Number(summary.pendingLN.toFixed(2))
        summary.pendingTTNCC = Number(summary.pendingTTNCC.toFixed(2))

        return summary
    }

    useEffect(() => {
        const ordersRef = ref(database, 'content')

        const unsubscribe = onValue(ordersRef, (snapshot) => {
            const data = snapshot.val()
            if (data) {
                // Transform the data into table format
                const formattedData = Object.entries(data)
                    .map(([orderId, order]: [string, any]) => {
                        const giaBan = parseNumberWithComma(order.GiaBan);
                        const giaMua = parseNumberWithComma(order.GiaMua);
                        const ln = giaBan - giaMua;

                        return [
                            orderId, // Mã ĐH
                            order.TenSP, // Loại
                            order.NgayOrder, // Ngày order
                            order.KHNote, // KH note
                            order.ChuDe, // Chủ Đề
                            order.Anchor1, // Anchor 1
                            order.URL1, // URL 1
                            order.Anchor2, // Anchor 2
                            order.URL2, // URL 2
                            order.LinkKQ, // LINK KQ
                            order.Deadline, // Deadline
                            order.Note, // NOTE
                            giaBan, // Giá Bán
                            giaMua, // Giá Mua
                            ln, // LN
                            order.TTNCC, // TT NCC
                            order.TenNCC, // Tên NCC
                            order.MaNCC, // Mã NCC
                            order.TinhTrangKH, // Tình Trạng
                            order.TinhTrangNCC, // Tình Trạng
                            order.Chat || "", // Chat
                        ]
                    })
                    .filter(row => {
                        if (userInfo?.role === "NCC") {
                            return row[17] === userInfo?.username; // Filter by MaNCC
                        } else if (userInfo?.role === "Khách hàng") {
                            const MaKH = row[0];
                            const MaKHBeforeDash = MaKH.split('-')[0];
                            return MaKHBeforeDash === userInfo?.username; // Filter by MaKH
                        }
                        return true; // Show all for other roles
                    });

                // Calculate summary
                const summary = calculateSummary(formattedData)

                // Create summary rows
                const totalRow = [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Tổng",
                    summary.totalGiaBan,
                    summary.totalGiaMua,
                    summary.totalLN,
                    summary.totalTTNCC,
                    "",
                    "",
                    "",
                    "",
                    "",
                ]

                const cancelledRow = [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Đơn hủy",
                    summary.cancelledGiaBan,
                    summary.cancelledGiaMua,
                    summary.cancelledLN,
                    summary.cancelledTTNCC,
                    "",
                    "",
                    "",
                    "",
                    "",
                ]

                const pendingRow = [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "Chưa nhập",
                    summary.pendingGiaBan,
                    summary.pendingGiaMua,
                    summary.pendingLN,
                    summary.pendingTTNCC,
                    "",
                    "",
                    "",
                    "",
                    "",
                ]

                // Group orders by status
                const activeOrders = formattedData.filter(row =>
                    (row[18] === "Đã nhập" ||
                        row[18] === "Đơn OK" || row[18] === "Y/C Hủy đơn") &&
                    (row[19] === "Đã lên bài" ||
                        row[19] === "Từ chối hoàn")
                );
                const cancelledOrders = formattedData.filter(row => row[18] === "Hủy đơn" || (row[18] === "Y/C Hủy đơn" && row[19] === "Đồng ý hoàn"));
                const pendingOrders = formattedData.filter(row =>
                    (row[18] === "Chưa nhập" || row[18] === "Đã nhập") && row[19] === "Chưa nhận"
                );

                // Combine all data with summary rows in appropriate positions
                const finalData = [
                    totalRow,
                    ...activeOrders,
                    pendingRow,
                    ...pendingOrders,
                    cancelledRow,
                    ...cancelledOrders,
                ];

                setTableData(finalData);
            } else {
                setTableData([])
            }
        })

        return () => unsubscribe()
    }, [])

    // Load chat messages when currentChatOrderId changes
    useEffect(() => {
        if (!currentChatOrderId) return

        const ordersRef = ref(database, 'content')

        const onOrdersChange = (snapshot: any) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                const order = data[currentChatOrderId]

                if (order && order.chat) {
                    const messages = Array.isArray(order.chat) ? order.chat : Object.values(order.chat)
                    messages.sort((a: any, b: any) => a.timestamp - b.timestamp)
                    setCurrentChatMessages(messages)
                } else {
                    setCurrentChatMessages([])
                }
            } else {
                setCurrentChatMessages([])
            }
        }

        const unsubscribe = onValue(ordersRef, onOrdersChange)

        return () => {
            unsubscribe()
        }
    }, [currentChatOrderId])

    const handleAfterChange = async (changes: any, source: any) => {
        // Chỉ xử lý khi thay đổi từ người dùng
        if (source !== 'edit' && source !== 'paste') return;
        if (!changes) return;

        const ordersRef = ref(database, 'content');

        changes.forEach(async ([row, prop, oldValue, newValue]: [number, string, any, any]) => {
            const orderId = tableData[row][0]; // Get the order ID from the first column
            const updates: any = {};

            // Map table columns to Firebase fields
            const fieldMap: { [key: number]: string } = {
                1: 'TenSP',
                2: 'NgayOrder',
                3: 'KHNote',
                4: 'ChuDe',
                5: 'Anchor1',
                6: 'URL1',
                7: 'Anchor2',
                8: 'URL2',
                9: 'LinkKQ',
                10: 'Deadline',
                11: 'Note',
                12: 'GiaBan',
                13: 'GiaMua',
                15: 'TTNCC',
                16: 'TenNCC',
                17: 'MaNCC',
                18: 'TinhTrangKH',
                19: 'TinhTrangNCC',
                20: 'Chat'
            };

            const fieldName = fieldMap[prop as unknown as number];
            if (fieldName) {
                // Convert values to appropriate types
                let valueToUpdate = newValue;
                if (fieldName === 'GiaBan' || fieldName === 'GiaMua') {
                    valueToUpdate = parseNumberWithComma(newValue);
                } else if (fieldName === 'NgayOrder' || fieldName === 'Deadline') {
                    // Xử lý ngày tháng
                    if (typeof newValue === 'string' && newValue.includes('/')) {
                        const [day, month, year] = newValue.split('/');
                        valueToUpdate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                } else if (fieldName === 'Chat') {
                    // Xử lý trường chat
                    valueToUpdate = newValue || "";
                }

                updates[`${orderId}/${fieldName}`] = valueToUpdate;

                // Update TinhTrangNCC when LinkKQ is entered
                if (fieldName === 'LinkKQ' && newValue && newValue.trim() !== '') {
                    const currentTinhTrangNCC = tableData[row][19]; // Get current TinhTrangNCC
                    if (currentTinhTrangNCC === "Chưa nhận") {
                        updates[`${orderId}/TinhTrangNCC`] = "Đã lên bài";
                        const MaKH = tableData[row][0];
                        const MaKHBeforeDash = MaKH.split('-')[0];
                        const MaNCC = tableData[row][17];
                        const giaMua = parseNumberWithComma(tableData[row][13]); // Get GiaMua value

                        // Add money to NCC's account
                        const nccBalanceRef = ref(database, `money/${MaNCC}`);
                        const nccBalanceSnapshot = await get(nccBalanceRef);
                        let currentNccBalance = 0;
                        if (nccBalanceSnapshot.exists()) {
                            const balanceData = nccBalanceSnapshot.val();
                            currentNccBalance = parseFloat(balanceData.amount.toString().replace(',', '.'));
                        }

                        // Calculate new balance for NCC
                        const newNccBalance = currentNccBalance + giaMua;

                        // Update NCC's balance
                        await set(ref(database, `money/${MaNCC}`), {
                            amount: newNccBalance.toFixed(2)
                        });

                        sheetApiRequest.getIDKH(MaKHBeforeDash, `Đơn ${orderId} đã xong, kiểm tra tại http://ylink.shop/content`);
                    }
                }

                // Kiểm tra và cập nhật TinhTrangKH khi thay đổi các trường liên quan
                if (['ChuDe', 'Anchor1', 'URL1', 'Anchor2', 'URL2'].includes(fieldName)) {
                    const currentData = tableData[row];
                    const currentStatus = currentData[18]; // Get current TinhTrangKH
                    console.log(currentStatus);

                    // Chỉ cập nhật TinhTrangKH nếu chưa ở trạng thái hủy
                    const hasChuDe = currentData[4] && currentData[4].trim() !== '';
                    const hasAnchor1 = currentData[5] && currentData[5].trim() !== '';
                    const hasURL1 = currentData[6] && currentData[6].trim() !== '';
                    const hasAnchor2 = currentData[7] && currentData[7].trim() !== '';
                    const hasURL2 = currentData[8] && currentData[8].trim() !== '';

                    if (hasChuDe && ((hasAnchor1 && hasURL1) || (hasAnchor2 && hasURL2))) {
                        if (currentStatus === "Chưa nhập") {
                            console.log(currentStatus);
                            updates[`${orderId}/TinhTrangKH`] = "Đã nhập";
                            const MaNCC = tableData[row][17];
                            sheetApiRequest.getIDNCC(MaNCC, `Đơn ${orderId} đang chờ được xử lý, vui lòng vào http://ylink.shop/content`);
                        }
                    } else {
                        if (currentStatus === "Đã nhập") {
                            updates[`${orderId}/TinhTrangKH`] = "Chưa nhập";
                        }
                    }

                }
            }

            if (Object.keys(updates).length > 0) {
                update(ordersRef, updates)
                    .then(() => {
                        console.log('Data updated successfully');
                    })
                    .catch((error) => {
                        console.error('Error updating data:', error);
                    });
            }
        });
    };

    const handleAfterPaste = (data: any[][], coords: any[]) => {
        if (!data || !coords) return;

        const ordersRef = ref(database, 'content');
        const updates: any = {};

        coords.forEach((coord, index) => {
            const startRow = coord.startRow;
            const startCol = coord.startCol;
            const endRow = coord.endRow;
            const endCol = coord.endCol;

            // Map table columns to Firebase fields
            const fieldMap: { [key: number]: string } = {
                1: 'TenSP',
                2: 'NgayOrder',
                3: 'KHNote',
                4: 'ChuDe',
                5: 'Anchor1',
                6: 'URL1',
                7: 'Anchor2',
                8: 'URL2',
                9: 'LinkKQ',
                10: 'Deadline',
                11: 'Note',
                12: 'GiaBan',
                13: 'GiaMua',
                15: 'TTNCC',
                16: 'TenNCC',
                17: 'MaNCC',
                18: 'TinhTrangKH',
                19: 'TinhTrangNCC',
                20: 'Chat'
            };

            // Xử lý từng ô trong vùng dán
            for (let row = startRow; row <= endRow; row++) {
                const orderId = tableData[row][0]; // Get the order ID from the first column
                if (!updates[orderId]) {
                    updates[orderId] = {};
                }

                // Lấy dữ liệu hiện tại từ Firebase cho đơn hàng này
                const currentOrderData = tableData[row];
                const currentFirebaseData: { [key: string]: any } = {
                    TenSP: currentOrderData[1] || "",
                    NgayOrder: currentOrderData[2] || "",
                    KHNote: currentOrderData[3] || "",
                    ChuDe: currentOrderData[4] || "",
                    Anchor1: currentOrderData[5] || "",
                    URL1: currentOrderData[6] || "",
                    Anchor2: currentOrderData[7] || "",
                    URL2: currentOrderData[8] || "",
                    LinkKQ: currentOrderData[9] || "",
                    Deadline: currentOrderData[10] || "",
                    Note: currentOrderData[11] || "",
                    GiaBan: parseNumberWithComma(currentOrderData[12]),
                    GiaMua: parseNumberWithComma(currentOrderData[13]),
                    TTNCC: currentOrderData[15] || "",
                    TenNCC: currentOrderData[16] || "",
                    MaNCC: currentOrderData[17] || "",
                    TinhTrangKH: currentOrderData[18] || "",
                    TinhTrangNCC: currentOrderData[19] || "",
                    Chat: currentOrderData[20] || ""
                };

                // Sao chép dữ liệu hiện tại vào updates
                updates[orderId] = { ...currentFirebaseData };

                for (let col = startCol; col <= endCol; col++) {
                    const fieldName = fieldMap[col];
                    if (fieldName) {
                        const dataRow = row - startRow;
                        const dataCol = col - startCol;
                        const newValue = data[dataRow]?.[dataCol];

                        if (newValue !== undefined && newValue !== null && newValue !== '') {
                            let valueToUpdate = newValue;

                            // Xử lý các trường đặc biệt
                            if (fieldName === 'GiaBan' || fieldName === 'GiaMua') {
                                valueToUpdate = parseNumberWithComma(newValue);
                            } else if (fieldName === 'NgayOrder' || fieldName === 'Deadline') {
                                // Xử lý ngày tháng
                                if (typeof newValue === 'string' && newValue.includes('/')) {
                                    const [day, month, year] = newValue.split('/');
                                    valueToUpdate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                }
                            } else if (fieldName === 'Chat') {
                                // Xử lý trường chat
                                valueToUpdate = newValue || "";
                            }

                            updates[orderId][fieldName] = valueToUpdate;
                        }
                    }
                }

                // Kiểm tra và cập nhật Tình trạng sau khi dán
                const hasChuDe = updates[orderId].ChuDe && updates[orderId].ChuDe.trim() !== '';
                const hasAnchor1 = updates[orderId].Anchor1 && updates[orderId].Anchor1.trim() !== '';
                const hasURL1 = updates[orderId].URL1 && updates[orderId].URL1.trim() !== '';
                const hasAnchor2 = updates[orderId].Anchor2 && updates[orderId].Anchor2.trim() !== '';
                const hasURL2 = updates[orderId].URL2 && updates[orderId].URL2.trim() !== '';

                if (hasChuDe && ((hasAnchor1 && hasURL1) || (hasAnchor2 && hasURL2))) {
                    if (updates[orderId].TinhTrangKH === "Chưa nhập") {
                        updates[orderId].TinhTrangKH = "Đã nhập";
                    }
                } else {
                    if (updates[orderId].TinhTrangKH === "Đã nhập") {
                        updates[orderId].TinhTrangKH = "Chưa nhập";
                    }
                }
            }
        });

        // Kiểm tra và loại bỏ các giá trị undefined
        Object.keys(updates).forEach(orderId => {
            Object.keys(updates[orderId]).forEach(field => {
                if (updates[orderId][field] === undefined) {
                    updates[orderId][field] = "";
                }
            });
        });

        if (Object.keys(updates).length > 0) {
            update(ordersRef, updates)
                .then(() => {
                    console.log('Data updated successfully after paste');
                })
                .catch((error) => {
                    console.error('Error updating data after paste:', error);
                });
        }
    };

    const handleContextMenuAction = async (row: number, action: string) => {
        const orderId = tableData[row][0];
        const ordersRef = ref(database, `content/${orderId}`);
        const linkKQ = tableData[row][9]; // Get LinkKQ value
        const MaNCC = tableData[row][17];
        const MaKH = tableData[row][0];
        const MaKHBeforeDash = MaKH.split('-')[0];
        const giaBan = parseNumberWithComma(tableData[row][12]); // Get GiaBan value
        const giaMua = parseNumberWithComma(tableData[row][13]); // Get GiaMua value

        try {
            if (action === 'cancelOrder') {
                const newStatus = linkKQ && linkKQ.trim() !== '' ? "Y/C Hủy đơn" : "Hủy đơn";

                // If order is being cancelled directly (not just requesting cancellation)
                if (newStatus === "Hủy đơn") {
                    // Get current balance
                    const userBalanceRef = ref(database, `money/${MaKHBeforeDash}`);
                    const balanceSnapshot = await get(userBalanceRef);
                    let currentBalance = 0;
                    if (balanceSnapshot.exists()) {
                        const balanceData = balanceSnapshot.val();
                        currentBalance = parseFloat(balanceData.amount.toString().replace(',', '.'));
                    }

                    // Get NCC's current balance
                    const nccBalanceRef = ref(database, `money/${MaNCC}`);
                    const nccBalanceSnapshot = await get(nccBalanceRef);
                    let currentNccBalance = 0;
                    if (nccBalanceSnapshot.exists()) {
                        const balanceData = nccBalanceSnapshot.val();
                        currentNccBalance = parseFloat(balanceData.amount.toString().replace(',', '.'));
                    }

                    // Calculate new balance for NCC (subtract giaMua)
                    const newNccBalance = currentNccBalance - giaMua;

                    // Calculate new balance after refund
                    const newBalance = currentBalance + giaBan;

                    // Update order status, refund money to customer, and subtract money from NCC
                    await Promise.all([
                        update(ordersRef, {
                            TinhTrangKH: newStatus
                        }),
                        set(ref(database, `money/${MaKHBeforeDash}`), {
                            amount: newBalance.toFixed(2)
                        }),
                        set(ref(database, `money/${MaNCC}`), {
                            amount: newNccBalance.toFixed(2)
                        })
                    ]);

                    sheetApiRequest.getIDKH(MaKHBeforeDash, `Đơn hàng ${orderId} đã bị hủy, số tiền ${giaBan.toLocaleString("vi-VN")} USDT đã được hoàn vào tài khoản của bạn. Kiểm tra tại http://ylink.shop/content`);
                } else {
                    // Just update status for cancellation request
                    await update(ordersRef, {
                        TinhTrangKH: newStatus
                    });
                    sheetApiRequest.getIDNCC(MaNCC, `Khách hàng đã yêu cầu hủy đơn ${orderId}, xử lý tại http://ylink.shop/content`);
                }
            } else if (action === 'approveRefund') {
                // Get current balance
                const userBalanceRef = ref(database, `money/${MaKHBeforeDash}`);
                const balanceSnapshot = await get(userBalanceRef);
                let currentBalance = 0;
                if (balanceSnapshot.exists()) {
                    const balanceData = balanceSnapshot.val();
                    currentBalance = parseFloat(balanceData.amount.toString().replace(',', '.'));
                }

                // Get NCC's current balance
                const nccBalanceRef = ref(database, `money/${MaNCC}`);
                const nccBalanceSnapshot = await get(nccBalanceRef);
                let currentNccBalance = 0;
                if (nccBalanceSnapshot.exists()) {
                    const balanceData = nccBalanceSnapshot.val();
                    currentNccBalance = parseFloat(balanceData.amount.toString().replace(',', '.'));
                }

                // Calculate new balance for NCC (subtract giaMua)
                const newNccBalance = currentNccBalance - giaMua;

                // Calculate new balance after refund
                const newBalance = currentBalance + giaBan;

                // Update order status, refund money to customer, and subtract money from NCC
                await Promise.all([
                    update(ordersRef, {
                        TinhTrangNCC: "Đồng ý hoàn"
                    }),
                    set(ref(database, `money/${MaKHBeforeDash}`), {
                        amount: newBalance.toFixed(2)
                    }),
                    set(ref(database, `money/${MaNCC}`), {
                        amount: newNccBalance.toFixed(2)
                    })
                ]);

                sheetApiRequest.getIDKH(MaKHBeforeDash, `NCC đã đồng ý hoàn tiền cho đơn ${orderId}, số tiền ${giaBan.toLocaleString("vi-VN")} USDT đã được hoàn vào tài khoản của bạn. Kiểm tra tại http://ylink.shop/content`);
            } else if (action === 'rejectRefund') {
                await update(ordersRef, {
                    TinhTrangNCC: "Từ chối hoàn"
                });
                sheetApiRequest.getIDKH(MaKHBeforeDash, `NCC đã từ chối hoàn tiền cho đơn ${orderId}, kiểm tra tại http://ylink.shop/content`);
            } else if (action === 'okOrder') {
                await update(ordersRef, {
                    TinhTrangKH: "Đơn OK"
                });
            }
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const RowHeader1: NestedColumnHeader[] = [
        { label: `Đơn Hàng`, colspan: 3 },
        { label: "INFO Bài", colspan: 6 },
        { label: "Kểt Quả", colspan: 2 },
        { label: "", colspan: 1 },
        { label: "TIỀN NÈ", colspan: 4 },
        { label: "", colspan: 2 },
        { label: "Trạng Thái", colspan: 2 },
        { label: "", colspan: 1 },
    ]

    const RowHeader2 = [
        "Mã ĐH",
        "Loại",
        "Ngày order",
        "KH note",
        "Chủ Đề",
        "Anchor 1",
        "URL 1",
        "Anchor 2",
        "URL 2",
        "LINK KQ",
        "Deadline",
        "NOTE",
        "Giá Bán",
        "Giá Mua",
        "LN",
        "TT NCC",
        "Tên NCC",
        "Mã NCC",
        "Khách Hàng",
        "NCC",
        "Chat",
    ]

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Chưa nhập":
            case "Chưa nhận":
                return { bg: '#FFA500', text: '#FFF7ED' }; // Orange bg, orange-50 text
            case "Đơn OK":
            case "Đã lên bài":
            case "Từ chối hoàn":
                return { bg: '#16A34A', text: '#F0FDF4' }; // Green-600 bg, green-50 text
            case "Hủy đơn":
            case "Y/C Hủy đơn":
            case "Đồng ý hoàn":
                return { bg: '#DC2626', text: '#FEF2F2' }; // Red-600 bg, red-50 text
            case "Đã nhập":
                return { bg: '#9333EA', text: '#FAF5FF' }; // Purple-600 bg, purple-50 text
            default:
                return { bg: '', text: '' };
        }
    }

    const getHiddenColumns = () => {
        if (userInfo?.role === "NCC") {
            return {
                columns: [12, 14], // Giá Bán (12), LN (14)
                indicators: true
            };
        } else if (userInfo?.role === "Khách hàng") {
            return {
                columns: [13, 14, 15, 16, 17], // Giá Mua (13), LN (14), TT NCC (15), Tên NCC (16), Mã NCC (17)
                indicators: true
            };
        }
        return {
            indicators: true
        };
    };

    const isEditable = (col: number) => {
        if (userInfo?.role === "NCC") {
            return col === 9; // Only LinkKQ is editable for NCC
        } else if (userInfo?.role === "Khách hàng") {
            // Only these columns are editable for Khách hàng
            const editableColumns = [2, 3, 4, 5, 6, 7, 8, 10]; // Ngày order, KH note, Chủ Đề, Anchor 1, URL 1, Anchor 2, URL 2, Deadline
            return editableColumns.includes(col);
        }
        return true; // All columns editable for other roles
    };

    // Function to send a new chat message
    const sendChatMessage = useCallback(async () => {
        if (!currentChatOrderId || !newChatMessage.trim()) return

        // Get current date in DD/MM/YYYY format
        const now = new Date()
        const day = String(now.getDate()).padStart(2, "0")
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const year = now.getFullYear()
        const ngayChat = `${day}/${month}/${year}`

        // Create the message object with the appropriate name fields
        const message: ChatMessage = {
            text: newChatMessage.trim(),
            sender: userInfo?.displayName || userInfo?.username || "Unknown User",
            senderRole: userInfo?.role || "NCC",
            timestamp: Date.now(),
            ngayChat: ngayChat,
        }

        // Add the appropriate name field based on role
        if (userInfo?.role === "NCC") {
            message.supplierName = userInfo?.name || userInfo?.displayName || ""
        } else if (userInfo?.role === "Khách hàng") {
            message.name = userInfo?.username || userInfo?.name || userInfo?.displayName || ""
        }

        try {
            const ordersRef = ref(database, `content/${currentChatOrderId}`)
            const snapshot = await get(ordersRef)

            if (snapshot.exists()) {
                const order = snapshot.val()
                const updatedOrder = {
                    ...order,
                    chat: [...(order.chat || []), message],
                }

                await set(ordersRef, updatedOrder)
                setNewChatMessage("")
            }
        } catch (error) {
            console.error("Error sending message:", error)
        }
    }, [currentChatOrderId, newChatMessage, userInfo])

    const cells = function (this: Handsontable.CellProperties, row: number, col: number, prop: string | number): Handsontable.CellMeta {
        const cellProperties: Handsontable.CellMeta = {};

        // Check if this is a summary row
        const isSummaryRow = row < tableData.length && (tableData[row][11] === "Tổng" || tableData[row][11] === "Đơn hủy" || tableData[row][11] === "Chưa nhập");

        if (isSummaryRow) {
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties
            ) {
                Handsontable.renderers.TextRenderer.apply(this, [
                    instance,
                    td,
                    row,
                    col,
                    prop,
                    value,
                    cellProperties
                ]);
                td.style.backgroundColor = '#ffb3b3';
                td.style.color = '#991b1b'; // red-800
                td.style.fontWeight = '600';
                if (col >= 12 && col <= 15) { // Giá Bán, Giá Mua, LN, TT NCC
                    td.style.textAlign = 'right';
                    // Format number to 2 decimal places
                    if (value !== undefined && value !== null && value !== '') {
                        td.textContent = Number(value).toFixed(2);
                    }
                }
            };
            cellProperties.readOnly = true;
            return cellProperties;
        }

        // Apply colors to TinhTrangKH (column 18) and TinhTrangNCC (column 19)
        if (col === 18 || col === 19) {
            const status = this.instance.getDataAtCell(row, col);
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties
            ) {
                Handsontable.renderers.TextRenderer.apply(this, [
                    instance,
                    td,
                    row,
                    col,
                    prop,
                    value,
                    cellProperties
                ]);
                const colors = getStatusColor(value);
                td.style.backgroundColor = colors.bg;
                td.style.color = colors.text;
            };
        } else if (col === 20) { // Chat column
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties
            ) {
                Handsontable.renderers.TextRenderer.apply(this, [
                    instance,
                    td,
                    row,
                    col,
                    prop,
                    value,
                    cellProperties
                ]);

                // Add chat button
                const button = document.createElement("button");
                button.textContent = "Chat";
                button.className = "w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-xs font-semibold text-green-50 rounded transition-colors duration-200";
                button.onclick = (e) => {
                    e.stopPropagation();
                    const orderId = instance.getDataAtCell(row, 0);
                    setCurrentChatOrderId(orderId);
                    setChatDialogOpen(true);
                };

                // Clear existing content and set styles for td
                td.innerHTML = '';
                td.style.padding = '0';
                td.appendChild(button);
            };
        } else {
            // For all other cells, apply read-only styling
            cellProperties.renderer = function (
                instance: Handsontable.Core,
                td: HTMLTableCellElement,
                row: number,
                col: number,
                prop: string | number,
                value: any,
                cellProperties: Handsontable.CellProperties
            ) {
                Handsontable.renderers.TextRenderer.apply(this, [
                    instance,
                    td,
                    row,
                    col,
                    prop,
                    value,
                    cellProperties
                ]);
                if (!isEditable(col)) {
                    td.style.backgroundColor = '#d3d3d3';
                    td.style.color = '#000000';
                }
            };
        }

        // Set read-only property based on role
        cellProperties.readOnly = !isEditable(col);

        return cellProperties;
    };

    return (
        <>
            <HotTable
                themeName="ht-theme-main"
                nestedHeaders={[RowHeader1, RowHeader2]}
                data={tableData}
                filters={true}
                width="100%"
                autoColumnSize={true}
                manualColumnResize={true}
                height="100vh"
                stretchH="all"
                manualRowMove={true}
                manualColumnMove={true}
                manualRowResize={true}
                className="custom-table"
                licenseKey="non-commercial-and-evaluation"
                rowHeaders={false}
                hiddenColumns={getHiddenColumns()}
                cells={cells}
                contextMenu={{
                    items: {
                        cancelOrder: {
                            name: 'Hủy Đơn',
                            callback: function (this: any, key: string, selection: any, clickEvent: any) {
                                const row = selection[0].start.row;
                                handleContextMenuAction(row, key);
                            },
                            hidden: function (this: any) {
                                if (userInfo?.role === "NCC") return true;
                                const selected = this.getSelectedLast();
                                if (!selected || !Array.isArray(selected) || selected.length < 4) return true;
                                const selectedRow = selected[0];
                                if (selectedRow < 0 || selectedRow >= tableData.length) return true;
                                if (!tableData[selectedRow] || !tableData[selectedRow][18]) return true;
                                const tinhTrang = tableData[selectedRow][18];
                                return tinhTrang === "Y/C Hủy đơn" || tinhTrang === "Hủy đơn" || tinhTrang === "Đơn OK";
                            }
                        },
                        okOrder: {
                            name: 'Đơn OK',
                            callback: function (this: any, key: string, selection: any, clickEvent: any) {
                                const row = selection[0].start.row;
                                handleContextMenuAction(row, key);
                            },
                            hidden: function (this: any) {
                                if (userInfo?.role === "NCC") return true;
                                const selected = this.getSelectedLast();
                                if (!selected || !Array.isArray(selected) || selected.length < 4) return true;
                                const selectedRow = selected[0];
                                if (selectedRow < 0 || selectedRow >= tableData.length) return true;
                                if (!tableData[selectedRow] || !tableData[selectedRow][18]) return true;
                                const tinhTrang = tableData[selectedRow][18];
                                const tinhTrangNCC = tableData[selectedRow][19];
                                return tinhTrang === "Đơn OK" || tinhTrang === "Y/C Hủy đơn" || tinhTrang === "Chưa nhập" || tinhTrang === "Hủy đơn" || tinhTrangNCC === "Chưa nhận";
                            }
                        },
                        approveRefund: {
                            name: 'Đồng ý hoàn',
                            callback: function (this: any, key: string, selection: any, clickEvent: any) {
                                const row = selection[0].start.row;
                                handleContextMenuAction(row, key);
                            },
                            hidden: function (this: any) {
                                if (userInfo?.role === "Khách hàng") return true;
                                const selected = this.getSelectedLast();
                                if (!selected || !Array.isArray(selected) || selected.length < 4) return true;
                                const selectedRow = selected[0];
                                if (selectedRow < 0 || selectedRow >= tableData.length) return true;
                                if (!tableData[selectedRow] || !tableData[selectedRow][18]) return true;
                                const tinhTrangKH = tableData[selectedRow][18]
                                const tinhTrangNCC = tableData[selectedRow][19]
                                return tinhTrangKH !== "Y/C Hủy đơn" || tinhTrangNCC === "Đồng ý hoàn" || tinhTrangNCC === "Từ chối hoàn";
                            }
                        },
                        rejectRefund: {
                            name: 'Từ chối hoàn',
                            callback: function (this: any, key: string, selection: any, clickEvent: any) {
                                const row = selection[0].start.row;
                                handleContextMenuAction(row, key);
                            },
                            hidden: function (this: any) {
                                if (userInfo?.role === "Khách hàng") return true;
                                const selected = this.getSelectedLast();
                                if (!selected || !Array.isArray(selected) || selected.length < 4) return true;
                                const selectedRow = selected[0];
                                if (selectedRow < 0 || selectedRow >= tableData.length) return true;
                                if (!tableData[selectedRow] || !tableData[selectedRow][18]) return true;
                                const tinhTrangKH = tableData[selectedRow][18]
                                const tinhTrangNCC = tableData[selectedRow][19]
                                return tinhTrangKH !== "Y/C Hủy đơn" || tinhTrangNCC === "Đồng ý hoàn" || tinhTrangNCC === "Từ chối hoàn";
                            }
                        }
                    }
                }}
                dropdownMenu={false}
                columnSorting={false}
                columnHeaderHeight={30}
                afterChange={handleAfterChange}
                afterPaste={handleAfterPaste}
            />
            <ChatDialog
                chatDialogOpen={chatDialogOpen}
                setChatDialogOpen={setChatDialogOpen}
                currentChatOrderId={currentChatOrderId}
                currentChatMessages={currentChatMessages}
                newChatMessage={newChatMessage}
                setNewChatMessage={setNewChatMessage}
                sendChatMessage={sendChatMessage}
                role={userInfo?.role}
                supplierName={userInfo?.name}
                user={userInfo}
            />
        </>
    )
}
