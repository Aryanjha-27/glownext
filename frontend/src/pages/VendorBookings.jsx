import { useEffect, useState } from "react";
import { vendorBookingApi } from "@/api/bookingApi";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { formatDate } from "@/utils/formatDate";
import { formatPrice } from "@/utils/formatPrice";

export default function VendorBookings() {
  return <ProtectedRoute requireUserType="Vendor"><VendorBookingsContent /></ProtectedRoute>;
}

function VendorBookingsContent() {
  const [filter, setFilter] = useState("All");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vendorBookingApi.list(filter);
      setBookings(data.results ?? []);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const act = async (booking, action) => {
    setBusy(`${booking.bid}:${action}`);
    setError(null);
    try {
      await vendorBookingApi[action](booking.bid, action === "decline" ? "Declined by vendor" : undefined);
      await load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="gn-container py-12">
      <p className="gn-eyebrow text-primary">Vendor Bookings</p>
      <h1 className="mt-1 font-display text-4xl text-foreground">Appointments for your studio</h1>
      <div className="mt-6 flex flex-wrap gap-2">{["All", "Pending", "Confirmed", "Completed", "Declined", "Cancelled"].map((status) => <button key={status} onClick={() => setFilter(status)} className={`gn-chip ${filter === status ? "bg-primary text-primary-foreground font-bold" : ""}`}>{status}</button>)}</div>
      {error ? <div className="mt-6"><ErrorMessage error={error} onRetry={load} /></div> : null}
      {loading ? <div className="mt-8"><LoadingSpinner label="Loading your bookings..." /></div> : <div className="mt-8 space-y-4">{bookings.map((booking) => { const service = booking.service; const key = (action) => `${booking.bid}:${action}`; return <article key={booking.bid} className="gn-card border border-border p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-bold">{service?.title || "Service booking"}</h2><p className="mt-1 text-sm text-muted-foreground">{booking.customer?.profile?.full_name || booking.customer?.username || booking.customer?.email} · {formatDate(booking.scheduled_date)} · {booking.scheduled_time}</p><p className="mt-1 text-sm text-muted-foreground">{booking.service_type} visit · {formatPrice(booking.total)}</p></div><span className="gn-badge bg-secondary text-secondary-foreground">{booking.booking_status}</span></div>{booking.booking_status === "Pending" ? <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy === key("confirm")} onClick={() => act(booking, "confirm")} className="gn-btn gn-btn-primary">Confirm</button><button disabled={busy === key("decline")} onClick={() => act(booking, "decline")} className="gn-btn gn-btn-outline">Decline</button></div> : null}{booking.booking_status === "Confirmed" ? <button disabled={busy === key("complete")} onClick={() => act(booking, "complete")} className="gn-btn gn-btn-primary mt-5">Mark completed</button> : null}</article>; })}{!bookings.length ? <div className="gn-card border border-border p-8 text-center text-muted-foreground">No bookings match this filter.</div> : null}</div>}
    </div>
  );
}
