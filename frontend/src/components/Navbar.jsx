import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

// Navigation links list for BCA Project Presentation
const navLinks = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/how-we-work", label: "How We Work" },
  { to: "/about", label: "About Us" },
  { to: "/vendors", label: "Salons" },
];

/**
 * Navbar Component - React + react-router-dom
 * Beginner-friendly code for 4th Sem BCA Project Defense
 */
function Navbar() {
  const { isAuthenticated, user, userType, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle user logout
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="gn-container flex h-16 items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="font-display text-2xl tracking-wide text-foreground">
          Glow<span className="text-primary">Next</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-semibold transition-colors ${isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons (Right side) */}
        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <Link to="/notifications" title="Notifications" className="gn-btn gn-btn-ghost px-3">
                <i className="fa-regular fa-bell text-base" aria-hidden="true" />
              </Link>
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

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="gn-btn gn-btn-outline px-3 lg:hidden"
        >
          <i className={isMobileMenuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} aria-hidden="true" />
        </button>
      </div>

      {/* Mobile Drawer Menu */}
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
