export type StatusType = "Hoàn thành" | "Lỗi" | "Đang chờ"

export interface Transaction {
    id: string
    amount: string
    deposit_date: string
    method: string
    description: string
    name: string
    status: StatusType
    customer_id?: string
}

export interface TransactionCreateRequest {
    amount: string
    deposit_date: string
    method: string
    description: string
    name: string
    customer_id?: string
}

export interface TransactionUpdateRequest {
    transaction_id: string
    status: StatusType
} 