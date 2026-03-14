"use client";

import { useEffect, useState } from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{children}</>;

  return (
    <>
      {/* Global Atmosphere */}
      <div className="fixed inset-0 gradient-mesh opacity-20 pointer-events-none -z-10 will-change-opacity" />
      <div className="fixed inset-0 hud-grid pointer-events-none -z-10 opacity-30" />
      
      {children}
    </>
  );
}
