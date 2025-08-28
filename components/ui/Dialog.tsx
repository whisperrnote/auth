import { ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className={
          "relative bg-background border border-border rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto text-foreground " + className
        }
      >
        <button
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xl w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent transition-colors z-10"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
