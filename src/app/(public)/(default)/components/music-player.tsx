"use client"
import { useState, useRef, useEffect } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { toast, Toaster } from "sonner"

export default function MusicPlayer() {
  const [isMuted, setIsMuted] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const toastShownRef = useRef(false) // ✅ flag chặn gọi lại

  useEffect(() => {
    if (!toastShownRef.current) {
      toastShownRef.current = true // ngăn gọi lại
      toast.success("🎵 Phát nhạc nền ngay!", {
        description:
          "Nhấn vào nút âm thanh ở góc dưới bên phải để bật/tắt nhạc",
        duration: 6000,
        className: "!bg-gradient-to-r !from-purple-500 !to-pink-500 !text-white !border-none !shadow-2xl",
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
        action: {
          label: "🔊 Phát nhạc",
          onClick: () => {
            if (audioRef.current) {
              audioRef.current.play().catch((error) => {
                console.log("Play error:", error)
              })
              setIsMuted(false)
            }
          },
        },
      })
    }

    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio("/music/nhac.mp3")
      audioRef.current.loop = true
      audioRef.current.volume = 0.5
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const toggleMute = () => {
    if (!audioRef.current) return
    if (isMuted) {
      audioRef.current.play().catch(console.log)
      setIsMuted(false)
    } else {
      audioRef.current.pause()
      setIsMuted(true)
    }
  }

  return (
    <button
      onClick={toggleMute}
      className="fixed bottom-10 right-4 p-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-40"
    >
      <Toaster position="top-right" expand={true} richColors />
      {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
    </button>
  )
}
