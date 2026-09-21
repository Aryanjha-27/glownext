import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUnreadNotificationCount, listNotifications, markNotificationRead } from "@/api/notificationApi";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/how-we-work", label: "How We Work" },
  { to: "/about", label: "About Us" },
  { to: "/vendors", label: "Salons" },
];

function Navbar() {
  const { isAuthenticated, user, userType, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setNotifications([]);
      return () => {
        active = false;
      };
    }

    Promise.all([
      listNotifications(),
      getUnreadNotificationCount(),
    ]).then(([items, count]) => {
      if (!active) return;
      setNotifications(items ?? []);
      if (count === 0 && (!items || !items.some((item) => !item.seen))) {
        setNotifications(items ?? []);
      }
    }).catch(() => {
      if (active) setNotifications([]);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id]);

  const unreadNotifications = notifications.filter((item) => !item.seen).length;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleNotificationClick = async (item) => {
    try {
      await markNotificationRead(item.id);
    } catch {
      // The notification still opens even if the backend read flag update fails.
    }
    setDropdownOpen(false);
    setNotifications((prev) => prev.map((notification) => (notification.id === item.id ? { ...notification, seen: true } : notification)));
    const bookingId = item.booking?.bid;
    if (bookingId) {
      navigate(userType === "Vendor" ? "/vendor/bookings" : `/bookings/${bookingId}`);
    }
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
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="gn-btn gn-btn-ghost px-3"
                  aria-label="Open notifications"
                >
                  <i className="fa-regular fa-bell text-base" aria-hidden="true" />
                  {unreadNotifications > 0 ? <span className="ml-1 text-xs font-bold">{unreadNotifications}</span> : null}
                </button>

                {dropdownOpen ? (
                  <div className="absolute right-0 mt-2 w-[22rem] rounded-xl border border-border bg-card p-2 shadow-lg">
                    <div className="flex items-center justify-between border-b border-border px-2 pb-2">
                      <span className="text-sm font-bold text-foreground">Notifications</span>
                      <span className="text-xs text-muted-foreground">{unreadNotifications} unread</span>
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

              {userType === "Vendor" ? (
                <Link to="/vendor" className="gn-btn gn-btn-outline">
                  Vendor Panel
                </Link>
              ) : (
                <Link to="/dashboard" className="gn-btn gn-btn-outline">
                  Dashboard
                </Link>
              )}
              <Link to="/profile" className="gn-btn gn-btn-ink">
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
                <Link
                  to={userType === "Vendor" ? "/vendor" : "/dashboard"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-primary"
                >
                  {userType === "Vendor" ? "Vendor Panel" : "Dashboard"}
                </Link>
                <Link
                  to="/bookings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground"
                >
                  My Bookings
                </Link>
                <Link
                  to="/profile"
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
