import { ReactNode, useEffect, useRef } from "react";
import { toast } from "sonner";

interface AlertProps {
  type?: "success" | "error" | "warning" | "info";
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export default function Alert({
  type = "info",
  children,
  className = "",
  onClose,
}: AlertProps) {
  const prevMessageRef = useRef<string>("");

  useEffect(() => {
    // Show toast when component mounts or message changes
    const message = typeof children === "string" ? children : String(children);
    
    // Only show toast if message changed
    if (message && message !== prevMessageRef.current) {
      prevMessageRef.current = message;
      
      switch (type) {
        case "success":
          toast.success(message);
          break;
        case "error":
          toast.error(message);
          break;
        case "warning":
          toast.warning(message);
          break;
        case "info":
        default:
          toast.info(message);
          break;
      }

      // Call onClose after showing toast (toast auto-dismisses)
      if (onClose) {
        const timer = setTimeout(() => {
          onClose();
        }, 4000); // Auto close after 4 seconds
        return () => clearTimeout(timer);
      }
    }
  }, [type, children, onClose]);

  // Don't render anything, toast handles the display
  return null;
}

