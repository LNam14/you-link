export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7678598532:AAFeyTmZacHfu1_8AaX7ugs5bUdSvt67G8U"
export const DEFAULT_CHAT_ID = process.env.TELEGRAM_DEFAULT_CHAT_ID || "-4618711960"
export const FALLBACK_CHAT_ID = process.env.TELEGRAM_FALLBACK_CHAT_ID || "-4618711960"

// Database configuration
export const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "world_seo",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
}

// Payment configuration
export const PAYMENT_CONFIG = {
  minAmount: 10,
  maxAmount: 10000,
  supportedMethods: ["Bank Transfer", "Cash", "Credit Card", "Momo", "Zalo Pay", "VNPay"],
  defaultChatId: "-1001234567890"
} 