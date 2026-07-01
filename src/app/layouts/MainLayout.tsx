import React from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  headerProps: any;
  sidebarProps: any;
}

export function MainLayout({ children, headerProps, sidebarProps }: MainLayoutProps) {
  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden bg-background text-foreground transition-colors duration-300"
      style={{
        fontFamily: "'Satoshi', 'Inter', system-ui, sans-serif",
      }}
    >
      <Header {...headerProps} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar {...sidebarProps} />

        {/* main */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* Ambient glow background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 70% 10%, var(--glow-teal, rgba(20,184,166,0.10)), transparent 70%)",
            }}
          />
          <div className="relative max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
