import { Link, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { getBooking, cancelBooking, confirmCashPayment } from "@/api/bookingApi";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ReviewForm } from "@/components/ReviewForm";

export default function BookingDetail() {
  return (
    <ProtectedRoute>
      <BookingDetailContent />
    </ProtectedRoute>
  );
}

function BookingDetailContent() {
  const { bid } = useParams();

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr] = useState(null);
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [cashError, setCashError] = useState(null);

  const fetchBooking = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBooking(bid);
      setBooking(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [bid]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  if (isLoading) return <LoadingSpinner label="Loading appointment details..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchBooking} />;
  if (!booking) return null;

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);
    setCancelErr(null);
    try {
      await cancelBooking(bid);
      await fetchBooking();
    } catch (err) {
      setCancelErr(err);
    } finally {
      setCancelling(false);
    }
  };

  const handleCashConfirmation = async () => {
    setConfirmingCash(true);
    setCashError(null);
    try {
      await confirmCashPayment(bid);
      await fetchBooking();
    } catch (err) {
      setCashError(err);
    } finally {
      setConfirmingCash(false);
    }
  };

  return (
    <div className="gn-container py-12">
      <Link to="/bookings" className="text-sm font-semibold text-primary hover:underline">
        &larr; Back to my bookings
      </Link>

      <div className="mt-6 mx-auto max-w-2xl">
        <div className="gn-card p-8 border border-border">
          <div className="flex items-center justify-between border-b border-border pb-6">
            <div>
              <span className="gn-eyebrow text-primary">Booking #{booking.bid}</span>
              <h1 className="mt-1 font-display text-3xl text-foreground">
                {booking.service_title ?? "Beauty Appointment"}
              </h1>
            </div>
            <span className="gn-badge bg-secondary text-secondary-foreground font-bold text-sm">
              {booking.booking_status}
            </span>
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Scheduled Date:</span>
              <span className="font-semibold text-foreground">{formatDate(booking.scheduled_date)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Time Slot:</span>
              <span className="font-semibold text-foreground">{booking.scheduled_time}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Service Duration:</span>
              <span className="font-semibold text-foreground">{formatDuration(booking.service?.duration_minutes)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Service Location:</span>
              <span className="font-semibold text-foreground">{booking.service_type} Visit</span>
            </div>
            {booking.address ? (
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Delivery Address:</span>
                <span className="font-semibold text-foreground">{booking.address}</span>
              </div>
            ) : null}
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Total Price:</span>
              <span className="font-display text-2xl text-primary">{formatPrice(booking.total)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Payment:</span>
              <span className="font-semibold text-foreground">{booking.payment_status}{booking.payment_method === "COD" && booking.payment_status === "Paid" ? " with Cash" : ""}</span>
            </div>
          </div>

          {cancelErr ? (
            <div className="mt-4">
              <ErrorMessage error={cancelErr} />
            </div>
          ) : null}

          {cashError ? <div className="mt-4"><ErrorMessage error={cashError} /></div> : null}

          {booking.booking_status === "Completed" && booking.payment_method === "COD" && booking.payment_status !== "Paid" ? (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="font-display text-xl text-foreground">Service completed</h2>
              <p className="mt-1 text-sm text-muted-foreground">Did you pay for this service with cash?</p>
              <button type="button" onClick={handleCashConfirmation} disabled={confirmingCash} className="gn-btn gn-btn-primary mt-4">
                {confirmingCash ? "Recording payment..." : "Yes, I paid with cash"}
              </button>
            </div>
          ) : null}

          {booking.booking_status === "Pending" || booking.booking_status === "Confirmed" ? (
            <div className="mt-8 pt-6 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="gn-btn bg-red-600 text-white hover:bg-red-700"
              >
                {cancelling ? "Cancelling..." : "Cancel Appointment"}
              </button>
            </div>
          ) : null}

          {booking.booking_status === "Completed" && !booking.has_review && booking.service ? (
            <div className="mt-8 border-t border-border pt-6">
              <ReviewForm
                sid={booking.service.slug}
                bid={booking.bid}
                onDone={fetchBooking}
              />
            </div>
          ) : null}
          {booking.booking_status === "Completed" && booking.has_review ? (
            <p className="mt-8 border-t border-border pt-6 text-sm font-semibold text-muted-foreground">
              You have already reviewed this completed appointment.
            </p>
          ) : null}

          {/* Dispute / Issue resolution section */}
          <BookingDisputeSection booking={booking} onDisputeCreated={fetchBooking} />
        </div>
      </div>
    </div>
  );
}

function formatDuration(minutes = 60) {
  const value = Number(minutes) || 60;
  const hours = Math.floor(value / 60);
  const remaining = value % 60;
  if (!hours) return `${remaining} minutes`;
  if (!remaining) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours} ${hours === 1 ? "hour" : "hours"} ${remaining} minutes`;
}

function BookingDisputeSection({ booking, onDisputeCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("Service Quality");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const { disputeApi } = await import("@/api/disputeApi");
      await disputeApi.createDispute({
        booking: booking.id || booking.bid,
        reason,
        subject,
        description,
      });
      setSuccess(true);
      if (onDisputeCreated) onDisputeCreated();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Need help with this appointment?</h3>
          <p className="text-xs text-muted-foreground">
            Encountered an issue with service quality, vendor no-show, or billing?
          </p>
        </div>
        {!isOpen && !success ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="gn-btn bg-secondary text-secondary-foreground text-xs hover:bg-secondary/80"
          >
            <i className="fa-solid fa-triangle-exclamation mr-1.5" /> Raise a Dispute
          </button>
        ) : null}
      </div>

      {success ? (
        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-2">
          <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
            ✓ Dispute submitted successfully! Our resolution team and the vendor have been notified.
          </p>
          <Link to="/disputes" className="inline-block text-primary font-bold hover:underline">
            Go to My Disputes to view thread &rarr;
          </Link>
        </div>
      ) : isOpen ? (
        <form onSubmit={handleSubmit} className="mt-4 p-4 rounded-xl bg-muted/30 border border-border space-y-3 text-sm">
          {error ? <ErrorMessage error={error} /> : null}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Reason for Dispute</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Service Quality">Service Quality</option>
              <option value="Vendor No Show">Vendor No Show</option>
              <option value="Billing Issue">Billing Issue</option>
              <option value="Safety Issue">Safety Issue</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Subject / Summary</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Stylist was 45 minutes late and incomplete service"
              className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Detailed Explanation</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide full details of what occurred..."
              className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="gn-btn bg-muted text-foreground text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="gn-btn bg-primary text-primary-foreground text-xs font-semibold"
            >
              {submitting ? "Submitting Dispute..." : "Submit Formal Dispute"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
