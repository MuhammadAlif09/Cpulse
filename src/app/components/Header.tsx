import React from "react";
import { Bell, Settings, Menu, X } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import AppLogo from "../../assets/app-icon.png";
import { cn } from "./ui/utils";
import { P } from "../../design/tokens";

interface Notification {
  id: number;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

export interface HeaderProps {
  appName: string;
  appVersion: string;
  isAdmin: boolean;
  time: Date;
  lang: string;
  t: (lang: string, text: string) => string;
  tab: string;
  setTab: (tab: string) => void;
  unreadCount: number;
  showNotif: boolean;
  setShowNotif: (v: boolean) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export function Header({
  appName,
  appVersion,
  isAdmin,
  time,
  lang,
  t,
  tab,
  setTab,
  unreadCount,
  showNotif,
  setShowNotif,
  notifications,
  setNotifications,
  mobileMenuOpen,
  onToggleMobileMenu,
}: HeaderProps) {
  return (
    <div className="relative z-50 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b bg-card flex-shrink-0 border-border">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile menu toggle button */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition cursor-pointer flex-shrink-0"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center overflow-hidden border border-border bg-background flex-shrink-0">
          <img src={AppLogo} alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
        </div>
        <div className="min-w-0 truncate">
          <span className="text-xs sm:text-sm font-bold text-foreground truncate">{appName}</span>
          <span
            className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-medium inline-block"
            style={{
              backgroundColor: `${P.teal}18`,
              color: P.teal,
              border: `1px solid ${P.teal}30`,
            }}
          >
            v{appVersion}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {isAdmin ? (
          <div
            className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border"
            style={{
              color: P.warn,
              backgroundColor: `${P.warn}15`,
              borderColor: `${P.warn}35`,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: P.warn }} />
            <span className="hidden sm:inline">{t(lang, "Administrator Mode")}</span>
            <span className="sm:hidden">Admin</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border"
            style={{
              color: P.good,
              backgroundColor: `${P.good}15`,
              borderColor: `${P.good}35`,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: P.good }} />
            <span className="hidden sm:inline">{t(lang, "Standard Mode")}</span>
            <span className="sm:hidden">Standard</span>
          </div>
        )}
        <span className="hidden sm:inline text-xs text-muted-foreground font-mono">
          {time.toLocaleTimeString()}
        </span>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "relative w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer",
                  showNotif
                    ? "bg-background text-foreground border border-border"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                )}
                onClick={() => setShowNotif(!showNotif)}
                aria-label={showNotif ? t(lang, "Close notifications") : t(lang, "Open notifications")}
                aria-expanded={showNotif}
                aria-controls="notification-panel"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-card"
                    style={{ backgroundColor: P.warn }}
                    aria-label={`${unreadCount} unread notifications`}
                  />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t(lang, "Notifications")}
            </TooltipContent>
          </Tooltip>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-popover border border-border overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
                <span className="text-sm font-semibold text-foreground">
                  {t(lang, "Notifications")}
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => setNotifications([])}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    {t(lang, "Clear all")}
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Bell size={24} className="mb-2 opacity-50" />
                    <span className="text-xs text-center">{t(lang, "No new notifications.")}</span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="px-4 py-3 border-b border-border hover:bg-background transition cursor-default"
                        style={{
                          backgroundColor: n.unread ? `${P.teal}10` : undefined,
                        }}
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x))
                          )
                        }
                      >
                        <div className="flex gap-3">
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 transition-all"
                            style={{
                              backgroundColor: n.unread ? P.teal : "transparent",
                            }}
                          />
                          <div>
                            <div
                              className={cn(
                                "text-sm mb-0.5 transition-colors",
                                n.unread ? "font-semibold" : "font-medium text-foreground"
                              )}
                              style={n.unread ? { color: P.teal } : undefined}
                            >
                              {n.title}
                            </div>
                            <div className="text-xs text-muted-foreground leading-snug">
                              {n.desc}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                              {n.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer",
                tab === "settings"
                  ? "bg-background text-foreground border border-border"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              )}
              onClick={() => setTab("settings")}
              aria-label={t(lang, "Open settings")}
            >
              <Settings size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t(lang, "Settings")}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
