"use client";

import * as React from "react";
import { createPortal } from "react-dom";

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextType | null>(null);

function useAlertDialog() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error("AlertDialog components must be used within an <AlertDialog>");
  }
  return context;
}

export interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AlertDialog({ children, open: controlledOpen, onOpenChange }: AlertDialogProps) {
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
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export function AlertDialogTrigger({ asChild, children, onClick, ...props }: AlertDialogTriggerProps) {
  const { setOpen } = useAlertDialog();

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

export interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const emptySubscribe = () => () => {};

export function AlertDialogContent({ children, className = "", ...props }: AlertDialogContentProps) {
  const { open, setOpen } = useAlertDialog();
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

      {/* Dialog box */}
      <div
        role="alertdialog"
        aria-modal="true"
        className={`relative z-10 w-full max-w-md bg-void-surface border border-void-border rounded-2xl p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 fade-in duration-200 ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function AlertDialogHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`space-y-2 text-left ${className}`} {...props} />;
}

export function AlertDialogTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-lg sm:text-xl font-black text-white tracking-tight ${className}`} {...props} />;
}

export function AlertDialogDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs sm:text-sm text-gray-400 leading-relaxed ${className}`} {...props} />;
}

export function AlertDialogFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-void-border/50 ${className}`}
      {...props}
    />
  );
}

export function AlertDialogCancel({
  className = "",
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useAlertDialog();

  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border border-void-border bg-void-deep text-xs font-semibold text-gray-300 hover:text-white hover:border-gray-500 transition-colors cursor-pointer ${className}`}
      {...props}
    />
  );
}

export function AlertDialogAction({
  className = "",
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useAlertDialog();

  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={`w-full sm:w-auto px-4 py-2.5 rounded-xl bg-nova-flare hover:bg-nova-flare/90 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,46,99,0.3)] cursor-pointer ${className}`}
      {...props}
    />
  );
}
