"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a <Dialog>");
  }
  return context;
}

export interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, open: controlledOpen, onOpenChange }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value);
      }
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export function DialogTrigger({ asChild, children, onClick, ...props }: DialogTriggerProps) {
  const { setOpen } = useDialog();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) {
      setOpen(true);
    }
  };

  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<{ onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void }>;
    return React.cloneElement(childElement, {
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        childElement.props.onClick?.(e);
        handleClick(e);
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children?: React.ReactNode;
}

export function DialogClose({ asChild, children, onClick, ...props }: DialogCloseProps) {
  const { setOpen } = useDialog();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) {
      setOpen(false);
    }
  };

  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<{ onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void }>;
    return React.cloneElement(childElement, {
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        childElement.props.onClick?.(e);
        handleClick(e);
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  showCloseButton?: boolean;
}

const emptySubscribe = () => () => {};

export function DialogContent({
  children,
  className = "",
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  const { open, setOpen } = useDialog();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in transition-opacity"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-50 w-full max-w-lg bg-void-surface border border-void-border rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden text-white ${className}`}
        {...props}
      >
        {children}
        {showCloseButton && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-void-deep/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-plasma-cyan cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col space-y-1.5 text-left border-b border-void-border/70 pb-3.5 mb-4 ${className}`}
      {...props}
    />
  );
}

export function DialogFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-2.5 pt-4 mt-5 border-t border-void-border/70 ${className}`}
      {...props}
    />
  );
}

export function DialogTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-base sm:text-lg font-bold leading-snug tracking-tight text-white ${className}`}
      {...props}
    />
  );
}

export function DialogDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-xs sm:text-sm text-gray-400 leading-relaxed ${className}`}
      {...props}
    />
  );
}

