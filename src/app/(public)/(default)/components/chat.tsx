"use client"
import { useState, useRef } from "react"
import type React from "react"

import { Avatar, Input } from "antd"
import dayjs from "dayjs"
import { SendOutlined, SmileOutlined } from "@ant-design/icons"

const { TextArea } = Input
import getUserInfo from "@/components/userInfo"

const filterBadWords = (message: string, blacklist: string[]): string => {
  let filteredMessage = message
  blacklist.forEach((badWord) => {
    const regex = new RegExp(`\\b${badWord}\\b`, "gi")
    filteredMessage = filteredMessage.replace(regex, "***")
  })
  return filteredMessage
}

export default function Chat({ title }: any) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [userName, setUserName] = useState<string | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false)
  const user = getUserInfo()

  const handleEmojiClick = (emojiData: any) => {
    setNewMessage((prevMessage) => prevMessage + emojiData.emoji)
  }

  // useEffect(() => {
  //   if (user) {
  //     setUserName(user?.Ten);
  //   }
  //   const messagesRef = ref(database, "messages");
  //   const unsubscribe = onValue(
  //     messagesRef,
  //     (snapshot) => {
  //       const data = snapshot.val();
  //       const messagesList = data ? Object.values(data) : [];
  //       setMessages(messagesList);
  //     },
  //     (error) => {
  //       console.error("Error reading messages:", error);
  //     }
  //   );

  //   return () => unsubscribe();
  // }, []);

  // useEffect(() => {
  //   if (chatContainerRef.current) {
  //     chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  //   }
  // }, [messages]);

  const handleSendMessage = async () => {
    // if (!user) {
    //   message.info("Vui lòng đăng nhập để thực hiện hàng động này!")
    //   return;
    // }
    // if (newMessage.trim() === "") return;
    // const cleanedMessage = ""//filterBadWords(newMessage, blackList); // Thay thế từ bậy bằng ***
    // try {
    //   const timestamp = Date.now();
    //   const newMessageRef = ref(database, `messages/${timestamp}`);
    //   await set(newMessageRef, {
    //     text: cleanedMessage, // Gửi tin nhắn đã được lọc
    //     timestamp: new Date().toISOString(),
    //     userName,
    //   });
    //   setNewMessage("");
    // } catch (error) {
    //   console.error("Error sending message:", error);
    // }
  }

  const formatTimestamp = (timestamp: string) => {
    const now = dayjs()
    const messageDate = dayjs(timestamp)

    if (now.isSame(messageDate, "day")) {
      return messageDate.format("HH:mm")
    } else {
      return messageDate.format("DD/MM/YYYY HH:mm")
    }
  }

  const uniqueUsers = Array.from(new Set(messages.map((message: any) => message.userName))).length

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Sample messages for demonstration
  const sampleMessages = [
    {
      text: "Chào mọi người, có ai đang online không?",
      timestamp: new Date().toISOString(),
      userName: "Minh Anh",
    },
    {
      text: "Chào bạn, tôi đang online. Bạn cần hỗ trợ gì không?",
      timestamp: new Date().toISOString(),
      userName: "Hải Đăng",
    },
    {
      text: "Tôi muốn hỏi về dịch vụ backlink của các bạn",
      timestamp: new Date().toISOString(),
      userName: "Minh Anh",
    },
    {
      text: "Vâng, chúng tôi có nhiều gói dịch vụ backlink khác nhau. Bạn có thể xem chi tiết ở mục Sản phẩm nhé!",
      timestamp: new Date().toISOString(),
      userName: "Hải Đăng",
    },
  ]

  return (
    <section className="bg-gradient-to-b from-white to-gray-100 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 relative inline-block">
            {title}
            <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-pink-500 transform -translate-y-1"></span>
          </h2>
          <p className="text-gray-600">Kết nối và trò chuyện với cộng đồng</p>
        </div>

        <div className="bg-white rounded shadow overflow-hidden border border-gray-100">
          {/* Chat header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 flex items-center">
            <Avatar className="w-10 h-10 border-2 border-white shadow-md" src={"/images/logo-circle.png"} />
            <div className="ml-3">
              <h3 className="text-white font-medium">Nhóm chat YouLink</h3>
              <p className="text-blue-100 text-xs">{uniqueUsers || 2} Thành viên</p>
            </div>
          </div>

          {/* Chat messages */}
          <div ref={chatContainerRef} className="h-[400px] overflow-y-auto p-4 space-y-3 bg-gray-50">
            {(messages.length > 0 ? messages : sampleMessages).map((message: any, index) => {
              const isCurrentUser = message.userName === userName
              const showAvatar =
                index === 0 ||
                (messages.length > 0 ? messages : sampleMessages)[index - 1]?.userName !== message.userName

              return (
                <div
                  key={index}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} ${showAvatar ? "mt-4" : "mt-1"}`}
                >
                  {!isCurrentUser && showAvatar && (
                    <div
                      title={message.userName}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-400 text-white flex items-center justify-center text-xs font-bold mr-2 shadow-sm"
                    >
                      {message.userName ? message.userName.substring(0, 2).toUpperCase() : ""}
                    </div>
                  )}

                  <div className={`max-w-[75%] group`}>
                    {showAvatar && !isCurrentUser && (
                      <div className="text-xs text-gray-500 ml-2 mb-1">{message.userName}</div>
                    )}

                    <div
                      className={`px-4 py-2 rounded-2xl text-sm shadow-sm
                        ${isCurrentUser
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-none"
                          : "bg-white border border-gray-200 rounded-tl-none"
                        }
                      `}
                    >
                      <span style={{ whiteSpace: "pre-wrap" }}>{message.text}</span>
                      <span className={`text-xs ml-2 opacity-70 ${isCurrentUser ? "text-blue-100" : "text-gray-500"}`}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  </div>

                  {isCurrentUser && showAvatar && (
                    <div
                      title={message.userName}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-white flex items-center justify-center text-xs font-bold ml-2 shadow-sm"
                    >
                      {message.userName ? message.userName.substring(0, 2).toUpperCase() : ""}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Chat input */}
          <div className="p-4 bg-white border-t border-gray-100 flex items-center">
            <button
              onClick={() => setIsEmojiPickerVisible(!isEmojiPickerVisible)}
              className="p-2 rounded-full text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <SmileOutlined className="text-xl" />
            </button>

            <TextArea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow mx-3 rounded-2xl border-gray-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all text-sm py-2 px-4"
              placeholder="Nhập tin nhắn..."
              autoSize={{ minRows: 1, maxRows: 4 }}
            />


            <SendOutlined onClick={handleSendMessage} className="text-md mx-4 text-blue-800" />
          </div>
        </div>
      </div>
    </section>
  )
}

