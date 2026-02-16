import { useEffect, useState } from "react";

interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error";
}

let toastId = 0;
let addToastFn: ((msg: Omit<ToastMessage, "id">) => void) | null = null;

export function showToast(text: string, type: "success" | "error" = "success") {
  if (addToastFn) addToastFn({ text, type });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (msg) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { ...msg, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
    return () => { addToastFn = null; };
  }, []);

  return (
    <div style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 1000, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
