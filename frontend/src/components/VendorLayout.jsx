import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/api/apiClient";

function BellIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

const links = [
  ["/vendor/dashboard", "Dashboard", "fa-solid fa-gauge-high"],
  ["/vendor/services", "Services", "fa-solid fa-scissors"],
  ["/vendor/bookings", "Bookings", "fa-regular fa-calendar-check"],
  ["/vendor/earnings", "Earnings", "fa-solid fa-wallet"],
  ["/vendor/disputes", "Disputes", "fa-solid fa-scale-balanced"],
  ["/vendor/profile", "Profile", "fa-regular fa-user"],
];

export default function VendorLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, refresh } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifications = Array.isArray(user?.notifications) ? user.notifications : [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markNotificationRead = async (notificationId) => {
    if (!notificationId) return;
    try {
      await apiClient.patch(`/notifications/${notificationId}/`, { read: true });
      await refresh();
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleToggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);

    if (!nextState || unreadCount === 0) return;

    for (const notification of notifications.filter((item) => !item.read)) {
      await markNotificationRead(notification.id);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="gn-container flex h-16 items-center justify-between gap-3">
          <div>
            <Link to="/vendor/dashboard" className="font-display text-xl text-foreground">
              Glow<span className="text-primary">Next</span>
            </Link>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vendor Panel</p>
          </div>

          <nav className="hidden items-center gap-4 md:flex" aria-label="Vendor navigation">
            {links.map(([to, label, icon]) => {
              const active = location.pathname === to || (to === "/vendor/dashboard" && location.pathname === "/vendor");
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-2 border-b-2 py-2 text-sm font-semibold transition-colors ${
                    active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  <i className={icon} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={handleToggleNotifications}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80"
                aria-label="Toggle notifications"
              >
                <BellIcon className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {showNotifications ? (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-background shadow-xl">
                  <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
                    Notifications
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => markNotificationRead(item.id)}
                          className="block w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted/50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-foreground">{item.message}</p>
                            {!item.read ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {item.notification_type}
                            {item.created_at ? ` • ${new Date(item.created_at).toLocaleDateString()}` : ""}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground">No new notifications.</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="gn-btn gn-btn-ghost text-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
