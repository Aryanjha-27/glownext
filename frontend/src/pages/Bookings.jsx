import { Link } from "react-router-dom";
import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardNav } from "@/components/DashboardNav";
import { useBookings } from "@/hooks/useBookings";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";
import { formatPrice } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";

export default function Bookings() {
  return (
    <ProtectedRoute>
      <BookingsList />
    </ProtectedRoute>
  );
}

function BookingsList() {
  const [filter, setFilter] = useState("All");
  const { data, isLoading, error, refetch } = useBookings(filter);

  const bookings = data?.results ?? [];

  return (
    <div className="gn-container py-12">
      <span className="gn-eyebrow text-primary">History</span>
      <h1 className="mt-1 font-display text-4xl text-foreground">My Appointments</h1>

      <div className="mt-6">
        <DashboardNav />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {["All", "Pending", "Confirmed", "Completed", "Cancelled"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`gn-chip ${filter === f ? "bg-primary text-primary-foreground font-bold" : ""}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {isLoading ? (
          <SkeletonGrid count={4} />
        ) : error ? (
          <ErrorMessage error={error} onRetry={() => void refetch()} />
        ) : bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((b) => (
              <Link
                key={b.bid}
                to={`/bookings/${b.bid}`}
                className="gn-card flex flex-wrap items-center justify-between gap-4 p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-lg text-foreground">
                    {b.service?.title ?? b.service_title ?? "Beauty Appointment"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(b.scheduled_date)} &middot; {b.scheduled_time} &middot; {b.service_type} visit
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="gn-badge bg-secondary text-secondary-foreground font-semibold">
                    {b.booking_status}
                  </span>
                  <span className="font-display text-2xl text-foreground">
                    {formatPrice(b.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No appointments found"
            description="You don't have any bookings matching this status filter."
            actionLabel="Browse Services"
            actionTo="/services"
          />
        )}
      </div>
    </div>
  );
}
