"use client";
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error";
interface ToastData { message: string; type: ToastType; id: number }
const ToastContext = createContext<{ toast: (msg: string, type?: ToastType) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const add = useCallback((message: string, type: ToastType = "success") => {
    setToasts(p => [...p, { message, type, id: Date.now() }]);
  }, []);
  const rm = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toast: add }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map(t => <ToastItem key={t.id} data={t} onDismiss={() => rm(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ data, onDismiss }: { data: ToastData; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div className={cn(
      "pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[85vw]",
      data.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 backdrop-blur-xl" : "bg-rose-500/10 border-rose-500/20 text-rose-400 backdrop-blur-xl"
    )}>
      {data.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      <span className="text-[10px] font-black uppercase tracking-widest">{data.message}</span>
      <button onClick={onDismiss} className="ml-1 opacity-40 hover:opacity-100"><X size={12} /></button>
    </div>
  );
}
