import { Link, useLocation } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Overview", icon: "fa-solid fa-gauge-high" },
  { to: "/bookings", label: "My Bookings", icon: "fa-regular fa-calendar-check" },
  { to: "/reviews", label: "Reviews", icon: "fa-regular fa-star" },
  { to: "/addresses", label: "Addresses", icon: "fa-solid fa-location-dot" },
  { to: "/notifications", label: "Notifications", icon: "fa-regular fa-bell" },
  { to: "/profile", label: "Profile", icon: "fa-regular fa-user" },
];

function DashboardNav() {
  const location = useLocation();

  return (
    <nav aria-label="Dashboard" className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`gn-chip ${isActive ? "bg-primary text-primary-foreground font-bold" : ""}`}
          >
            <i className={item.icon} aria-hidden="true" /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const vendorItems = [
  { to: "/vendor", label: "Overview", icon: "fa-solid fa-gauge-high" },
  { to: "/vendor/bookings", label: "Bookings", icon: "fa-regular fa-calendar-check" },
  { to: "/vendor/services", label: "Services", icon: "fa-solid fa-scissors" },
  { to: "/vendor/earnings", label: "Earnings", icon: "fa-solid fa-wallet" },
  { to: "/vendor/profile", label: "Store profile", icon: "fa-solid fa-store" },
];

function VendorNav() {
  const location = useLocation();

  return (
    <nav aria-label="Vendor panel" className="flex flex-wrap gap-2">
      {vendorItems.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`gn-chip ${isActive ? "bg-primary text-primary-foreground font-bold" : ""}`}
          >
            <i className={item.icon} aria-hidden="true" /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { DashboardNav, VendorNav };
