import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardNav } from "@/components/DashboardNav";
import { useBookings } from "@/hooks/useBookings";
import { SkeletonStats } from "@/components/SkeletonCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { formatPrice } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useBookings("All");

  const bookings = data?.results ?? [];
  const counts = {
    total: data?.count ?? bookings.length,
    pending: bookings.filter((b) => b.booking_status === "Pending").length,
    confirmed: bookings.filter((b) => b.booking_status === "Confirmed").length,
    completed: bookings.filter((b) => b.booking_status === "Completed").length,
  };

  return (
    <div className="gn-container py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="gn-eyebrow text-primary">Client Control Panel</span>
          <h1 className="mt-1 font-display text-4xl text-foreground">
            Welcome back, {user?.profile?.full_name?.split(" ")[0] ?? user?.username ?? "Client"}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your scheduled salon visits and doorstep beauty treatments.
          </p>
        </div>

        <div className="flex gap-3">
          <Link to="/services" className="gn-btn gn-btn-primary">
            + Book New Service
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <DashboardNav />
      </div>

      {isLoading ? (
        <div className="mt-8">
          <SkeletonStats />
        </div>
      ) : error ? (
        <div className="mt-8">
          <ErrorMessage error={error} onRetry={() => void refetch()} />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Bookings", value: counts.total, icon: "fa-regular fa-calendar" },
              { label: "Pending Approval", value: counts.pending, icon: "fa-regular fa-clock" },
              { label: "Confirmed", value: counts.confirmed, icon: "fa-solid fa-check" },
              { label: "Completed", value: counts.completed, icon: "fa-solid fa-award" },
            ].map((s) => (
              <div key={s.label} className="gn-card p-5 border border-border">
                <i className={`${s.icon} text-primary text-xl`} aria-hidden="true" />
                <p className="mt-3 font-display text-3xl text-foreground">{s.value}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-foreground">Recent Appointments</h2>
              <Link to="/bookings" className="text-sm font-semibold text-primary hover:underline">
                View All &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {bookings.slice(0, 5).map((b) => (
                <Link
                  key={b.bid}
                  to={`/bookings/${b.bid}`}
                  className="gn-card flex flex-wrap items-center justify-between gap-3 p-5 border border-border hover:border-primary/50 transition-colors"
                >
                  <div>
                    <p className="font-bold text-foreground">
                      {b.service?.title ?? b.service_title ?? "Beauty Appointment"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(b.scheduled_date)} &middot; {b.scheduled_time} &middot; {b.service_type} visit
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="gn-badge bg-secondary text-secondary-foreground font-semibold">
                      {b.booking_status}
                    </span>
                    <span className="font-display text-xl text-foreground">
                      {formatPrice(b.total)}
                    </span>
                  </div>
                </Link>
              ))}

              {bookings.length === 0 ? (
                <div className="gn-card p-8 text-center text-muted-foreground">
                  <p className="text-base font-semibold">No appointments found</p>
                  <p className="mt-1 text-xs">Explore services and book your first appointment today!</p>
                  <Link to="/services" className="gn-btn gn-btn-primary mt-4 inline-block">
                    Explore Services
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
