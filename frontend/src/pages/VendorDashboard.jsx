import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { vendorBookingApi } from "@/api/bookingApi";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { formatPrice } from "@/utils/formatPrice";

export default function VendorDashboard() {
  return (
    <ProtectedRoute requireUserType="Vendor">
      <VendorDashboardContent />
    </ProtectedRoute>
  );
}

function VendorDashboardContent() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [period, setPeriod] = useState(30);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    setError(null);
    try {
      const [dashboard, chart, payoutData] = await Promise.all([
        vendorBookingApi.stats(),
        vendorBookingApi.analytics(period),
        vendorBookingApi.payouts(),
      ]);
      setStats(dashboard);
      setAnalytics(chart);
      setPayouts(payoutData);
    } catch (requestError) {
      setError(requestError);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  if (error) return <div className="gn-container py-12"><ErrorMessage error={error} onRetry={loadStats} /></div>;
  if (!stats || !analytics) return <LoadingSpinner label="Loading vendor dashboard..." />;

  const chartMax = Math.max(...(analytics.bookings ?? []).map((item) => item.count), 1);
  const cards = [
    ["Total Services", stats.total_services, "fa-scissors"],
    ["Published Services", stats.published_services, "fa-eye"],
    ["Pending Bookings", stats.pending_bookings, "fa-clock"],
    ["Paid Earnings", formatPrice(stats.total_earned), "fa-wallet"],
  ];

  return (
    <div className="gn-container py-12">
      <p className="gn-eyebrow text-primary">Vendor Control Panel</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mt-1 font-display text-4xl text-foreground">Your studio dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Only your services, bookings, and revenue appear here.</p>
        </div>
        <Link to="/vendor/services" className="gn-btn gn-btn-primary">+ List New Service</Link>
      </div>


      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 p-4">
        <span className={`gn-badge ${stats.is_verified ? "bg-emerald-100 text-emerald-700" : stats.verification_status === "Rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
          {stats.verification_status === "Rejected" ? "Rejected" : stats.is_verified ? "Verified" : "Pending Verification"}
        </span>
        {stats.verification_status === "Rejected" ? (
          <Link to="/vendor/profile" className="gn-btn gn-btn-outline text-sm">Try again</Link>
        ) : !stats.is_verified ? <Link to="/vendor/profile" className="gn-btn gn-btn-outline text-sm">Complete verification steps</Link> : null}
        <div className="flex gap-2">
          {[7, 30, 180].map((days) => (
            <button key={days} type="button" onClick={() => setPeriod(days)} className={`gn-chip ${period === days ? "bg-primary text-primary-foreground font-bold" : ""}`}>
              {days === 180 ? "6 months" : `${days} days`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([label, value, icon]) => (
          <div key={label} className="gn-card border border-border p-5">
            <i className={`fa-solid ${icon} text-primary text-xl`} aria-hidden="true" />
            <p className="mt-3 font-display text-3xl text-foreground">{value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="gn-card border border-border p-6">
          <h2 className="font-display text-2xl text-foreground">Bookings over time</h2>
          <div className="mt-6 space-y-4">
            {(analytics.bookings ?? []).slice(0, 14).map((item) => (
              <div key={item.date}>
                <div className="flex justify-between text-sm font-semibold"><span>{item.date}</span><span>{item.count}</span></div>
                <div className="mt-2 h-3 rounded-full bg-secondary"><div className="h-3 rounded-full bg-primary" style={{ width: `${(item.count / chartMax) * 100}%` }} /></div>
              </div>
            ))}
            {!analytics.bookings?.length ? <p className="text-sm text-muted-foreground">No bookings yet.</p> : null}
          </div>
        </section>
        <section className="gn-card border border-border p-6">
          <h2 className="font-display text-2xl text-foreground">Earnings and payouts</h2>
          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Available:</strong> {formatPrice(stats.available_payout)}</p>
            <p><strong className="text-foreground">Pending:</strong> {formatPrice(stats.pending_earnings)}</p>
            <p><strong className="text-foreground">Paid out:</strong> {formatPrice(stats.total_paid_out)}</p>
          </div>
          <div className="mt-5 space-y-2 text-xs text-muted-foreground">
            {payouts.slice(0, 3).map((payout) => <p key={payout.id}>Payout #{payout.id}: {formatPrice(payout.amount)} · {payout.status}</p>)}
            {!payouts.length ? <p>No payouts recorded yet.</p> : null}
          </div>
          <Link to="/vendor/bookings" className="gn-btn gn-btn-outline mt-6">Manage Bookings</Link>
        </section>
      </div>
    </div>
  );
}
