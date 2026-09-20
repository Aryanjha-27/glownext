import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const links = [
  ["/vendor/dashboard", "Dashboard", "fa-solid fa-gauge-high"],
  ["/vendor/services", "Services", "fa-solid fa-scissors"],
  ["/vendor/bookings", "Bookings", "fa-regular fa-calendar-check"],
  ["/vendor/earnings", "Earnings", "fa-solid fa-wallet"],
  ["/vendor/payouts", "Payouts", "fa-solid fa-money-bill-transfer"],
  ["/vendor/disputes", "Disputes", "fa-solid fa-scale-balanced"],
  ["/vendor/notifications", "Notifications", "fa-regular fa-bell"],
  ["/vendor/profile", "Profile", "fa-regular fa-user"],
];

export default function VendorLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6">
        <div>
          <p className="font-display text-xl text-foreground">Glow<span className="text-primary">Next</span></p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vendor Panel</p>
        </div>
      </header>
      <div className="flex flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-border bg-card p-4 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-72 lg:border-b-0 lg:border-r">
          <nav className="flex flex-col gap-1" aria-label="Vendor navigation">
            {links.map(([to, label, icon]) => {
              const active = location.pathname === to || (to === "/vendor/dashboard" && location.pathname === "/vendor");
              return <Link key={to} to={to} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><i className={icon} aria-hidden="true" />{label}</Link>;
            })}
          </nav>
          <button type="button" onClick={handleLogout} className="mt-6 flex w-full items-center gap-3 border-t border-border px-3 pt-5 text-left text-sm font-semibold text-red-600"><i className="fa-solid fa-right-from-bracket" aria-hidden="true" />Logout</button>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
