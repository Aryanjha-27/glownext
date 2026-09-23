import { Link, useLocation } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Overview", icon: "fa-solid fa-gauge-high" },
  { to: "/bookings", label: "My Bookings", icon: "fa-regular fa-calendar-check" },
  { to: "/disputes", label: "Disputes", icon: "fa-solid fa-scale-balanced" },
  { to: "/reviews", label: "Reviews", icon: "fa-regular fa-star" },
  { to: "/profile", label: "Profile", icon: "fa-regular fa-user" },
];

function DashboardNav() {
  const location = useLocation();

  return (
    <nav aria-label="Dashboard" className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = location.pathname === item.to || (item.to === "/disputes" && location.pathname.startsWith("/disputes/"));
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

export { DashboardNav };
