import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { listNotifications, markNotificationRead } from "@/api/notificationApi";

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
  const { logout, isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setNotifications([]);
      return () => {
        active = false;
      };
    }

    listNotifications().then((items) => {
      if (active) setNotifications(items ?? []);
    }).catch(() => {
      if (active) setNotifications([]);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id]);

  const unreadCount = notifications.filter((item) => !item.seen).length;

  const handleNotificationClick = async (item) => {
    try {
      await markNotificationRead(item.id);
    } catch {
      // Keep the UI responsive even when the backend rejects the read flag update.
    }
    setNotifications((prev) => prev.map((notification) => (notification.id === item.id ? { ...notification, seen: true } : notification)));
    setOpen(false);
    const bookingId = item.booking?.bid;
    if (bookingId) {
      navigate("/vendor/bookings");
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
                onClick={() => setOpen((prev) => !prev)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
                aria-label="Open notifications"
              >
                <i className="fa-regular fa-bell" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {open ? (
                <div className="absolute right-0 mt-2 w-[22rem] rounded-xl border border-border bg-card p-2 shadow-lg">
                  <div className="flex items-center justify-between border-b border-border px-2 pb-2">
                    <span className="text-sm font-bold text-foreground">Notifications</span>
                    <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                  </div>
                  <div className="mt-2 max-h-80 space-y-2 overflow-auto">
                    {notifications.length ? notifications.slice(0, 8).map((item) => (
                      <button
                        key={item.id ?? item.nid}
                        type="button"
                        onClick={() => handleNotificationClick(item)}
                        className={`block w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          item.seen ? "border-border bg-transparent text-muted-foreground" : "border-primary/30 bg-primary/5 text-foreground"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{item.title ?? item.type ?? "Update"}</p>
                            <p className="mt-1 text-xs">{item.message}</p>
                          </div>
                          {!item.seen ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" aria-label="Unread notification" /> : null}
                        </div>
                      </button>
                    )) : (
                      <p className="px-2 py-4 text-sm text-muted-foreground">No notifications yet.</p>
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
