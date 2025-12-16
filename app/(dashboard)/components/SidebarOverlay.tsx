interface SidebarOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SidebarOverlay({ isOpen, onClose }: SidebarOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-white/30 backdrop-blur-sm z-[45] transition-opacity"
      onClick={onClose}
    />
  );
}

