import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";
import { disputeApi } from "@/api/disputeApi";
import { formatDate } from "@/utils/formatDate";
import { formatPrice } from "@/utils/formatPrice";

export default function VendorDisputes() {
  return (
    <ProtectedRoute requireUserType="Vendor">
      <VendorDisputesContent />
    </ProtectedRoute>
  );
}

function VendorDisputesContent() {
  const [filter, setFilter] = useState("All");
  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await disputeApi.listVendorDisputes({ status: filter });
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
      <span className="gn-eyebrow text-primary">Vendor Panel</span>
      <h1 className="mt-1 font-display text-4xl text-foreground">Disputes &amp; Claims</h1>


      {/* Filter Chips */}
      <div className="mt-6 flex flex-wrap gap-2">
        {["All", "Open", "Waiting for Vendor", "Under Review", "Resolved", "Rejected"].map((f) => (
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
                to={`/vendor/disputes/${d.did || d.id}`}
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
                    {d.status === "Waiting for Vendor" && !d.vendor_response ? (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Action Required
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-bold text-lg text-foreground">
                    {d.reason} {d.subject ? `— ${d.subject}` : ""}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Customer: <strong className="text-foreground">{d.customer_name || "Customer"}</strong> &middot; Booking: #{d.booking_bid || d.booking}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Opened on {formatDate(d.date)}
                  </p>
                </div>

                <div className="text-right">
                  <div className="font-display text-lg text-primary">{formatPrice(d.amount)}</div>
                  <span className="mt-1 inline-flex items-center text-xs font-semibold text-primary">
                    Review &amp; Respond &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No disputes found"
            description="Great news! You have no open disputes from customers matching this status."
          />
        )}
      </div>
    </div>
  );
}
