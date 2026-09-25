import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/api/apiClient";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About Us" },
  { to: "/vendors", label: "Salons" },
];

function BellIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function Navbar() {
  const { isAuthenticated, user, userType, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifications = Array.isArray(user?.notifications) ? user.notifications : [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markNotificationRead = async (notificationId) => {
    if (!notificationId) return;
    try {
      await apiClient.patch(`/notifications/${notificationId}/`, { read: true });
      setUser((prev) => {
        if (!prev?.notifications) return prev;
        return {
          ...prev,
          notifications: prev.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        };
      });
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleToggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);

    if (!nextState) return;

    const unreadNotifications = notifications.filter((item) => !item.read);
    if (unreadNotifications.length === 0) return;

    await Promise.all(
      unreadNotifications.map((notification) =>
        apiClient.patch(`/notifications/${notification.id}/`, { read: true }),
      ),
    );

    setUser((prev) => {
      if (!prev?.notifications) return prev;
      return {
        ...prev,
        notifications: prev.notifications.map((notification) =>
          unreadNotifications.some((item) => item.id === notification.id) ? { ...notification, read: true } : notification,
        ),
      };
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="gn-container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="font-display text-2xl tracking-wide text-foreground">
          Glow<span className="text-primary">Next</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`border-b-2 py-1 text-sm font-semibold transition-colors ${isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
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

              {userType === "Vendor" ? (
                <Link to="/vendor" className="gn-btn gn-btn-outline">
                  Vendor Panel
                </Link>
              ) : null}
              <Link to="/dashboard" className="gn-btn gn-btn-ink">
                {user?.profile?.full_name?.split(" ")[0] ?? user?.username ?? "Profile"}
              </Link>
              <button type="button" onClick={handleLogout} className="gn-btn gn-btn-ghost text-red-500 hover:text-red-600">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="gn-btn gn-btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="gn-btn gn-btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="gn-btn gn-btn-outline px-3 lg:hidden"
        >
          <i className={isMobileMenuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} aria-hidden="true" />
        </button>
      </div>


      {isMobileMenuOpen ? (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="gn-container flex flex-col gap-2 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}

            <hr className="my-2 border-border" />

            {isAuthenticated ? (
              <>
                {notifications.length > 0 ? (
                  <div className="rounded-xl border border-border bg-amber-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">Notifications</p>
                    {notifications.slice(0, 3).map((item) => (
                      <p key={item.id} className="text-sm text-amber-900">• {item.message}</p>
                    ))}
                  </div>
                ) : null}

                {userType === "Vendor" ? (
                  <Link
                    to="/vendor"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-primary"
                  >
                    Vendor Panel
                  </Link>
                ) : null}
                <Link
                  to="/bookings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground"
                >
                  My Bookings
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-3">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="gn-btn gn-btn-outline flex-1 text-center">
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="gn-btn gn-btn-primary flex-1 text-center"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export { Navbar };
export default Navbar;
