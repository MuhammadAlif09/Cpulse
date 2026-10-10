import React, { useState } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  headerProps: any;
  sidebarProps: any;
}

export function MainLayout({ children, headerProps, sidebarProps }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Wrap setTab to close mobile drawer on selection
  const handleSetTab = (tabId: string) => {
    if (sidebarProps.setTab) sidebarProps.setTab(tabId);
    if (headerProps.setTab) headerProps.setTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden bg-background text-foreground transition-colors duration-300"
      style={{
        fontFamily: "'Satoshi', 'Inter', system-ui, sans-serif",
      }}
    >
      <Header
        {...headerProps}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Overlay Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Container: Drawer on mobile (<768px), persistent sidebar on desktop (>=768px) */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out
            md:static md:z-auto md:w-56 md:translate-x-0 md:bg-transparent md:border-r flex-shrink-0 flex
            ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
          `}
        >
          <Sidebar
            {...sidebarProps}
            setTab={handleSetTab}
            mobileMenuOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 relative w-full min-w-0">
          {/* Ambient glow background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 70% 10%, var(--glow-teal, rgba(20,184,166,0.10)), transparent 70%)",
            }}
          />
          <div className="relative w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

