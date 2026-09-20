import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardNav } from "@/components/DashboardNav";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";
import { disputeApi } from "@/api/disputeApi";
import { formatDate } from "@/utils/formatDate";
import { formatPrice } from "@/utils/formatPrice";

export default function Disputes() {
  return (
    <ProtectedRoute>
      <DisputesContent />
    </ProtectedRoute>
  );
}

function DisputesContent() {
  const [filter, setFilter] = useState("All");
  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await disputeApi.listDisputes({ status: filter });
      setDisputes(data.results ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Open":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Under Review":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Waiting for Vendor":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "Resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Rejected":
      case "Closed":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="gn-container py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="gn-eyebrow text-primary">Resolution Center</span>
          <h1 className="mt-1 font-display text-4xl text-foreground">My Disputes</h1>
        </div>
      </div>

      <div className="mt-6">
        <DashboardNav />
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {["All", "Open", "Under Review", "Waiting for Vendor", "Resolved", "Rejected", "Closed"].map((f) => (
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
          <SkeletonGrid count={3} />
        ) : error ? (
          <ErrorMessage error={error} onRetry={fetchDisputes} />
        ) : disputes.length > 0 ? (
          <div className="space-y-4">
            {disputes.map((d) => (
              <Link
                key={d.did || d.id}
                to={`/disputes/${d.did || d.id}`}
                className="gn-card flex flex-wrap items-center justify-between gap-4 p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      #{d.did || d.id}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(d.status)}`}>
                      {d.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-foreground">
                    {d.reason} {d.subject ? `— ${d.subject}` : ""}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Vendor: <strong className="text-foreground">{d.vendor_name || "Assigned Salon"}</strong> &middot; Booking: #{d.booking_bid || d.booking}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Opened on {formatDate(d.date)}
                  </p>
                </div>

                <div className="text-right">
                  {d.amount && Number(d.amount) > 0 ? (
                    <div className="font-display text-lg text-primary">{formatPrice(d.amount)}</div>
                  ) : null}
                  <span className="mt-1 inline-flex items-center text-xs font-semibold text-primary">
                    View Details &amp; Chat &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No disputes found"
            description="You don't have any disputes matching this filter. If you have an issue with an appointment, you can raise a dispute directly from your booking details page."
            actionLabel="View My Bookings"
            actionTo="/bookings"
          />
        )}
      </div>
    </div>
  );
}
