import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getService } from "@/api/serviceApi";
import { createBooking } from "@/api/bookingApi";
import { initiateKhaltiPayment } from "@/api/paymentApi";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/utils/formatPrice";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function BookService() {
  return (
    <ProtectedRoute requireUserType="Customer">
      <BookingForm />
    </ProtectedRoute>
  );
}

function BookingForm() {
  const { slug, sid } = useParams();
  const serviceIdentifier = slug ?? sid;
  const navigate = useNavigate();
  const draftStorageKey = `glownext.bookingDraft.${serviceIdentifier ?? "unknown"}`;

  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [serviceType, setServiceType] = useState("Home");
  const [paymentMethod, setPaymentMethod] = useState("Khalti");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  useEffect(() => {
    if (!serviceIdentifier || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.date) setDate(saved.date);
      if (saved.time) setTime(saved.time);
      if (saved.serviceType) setServiceType(saved.serviceType);
      if (saved.paymentMethod) setPaymentMethod(saved.paymentMethod);
      if (saved.notes) setNotes(saved.notes);
      if (saved.address) setAddress(saved.address);
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [draftStorageKey, serviceIdentifier]);

  useEffect(() => {
    if (!serviceIdentifier || typeof window === "undefined") return;
    const draft = { date, time, serviceType, paymentMethod, notes, address };
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [address, date, draftStorageKey, notes, paymentMethod, serviceIdentifier, serviceType, time]);

  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const currentTime = `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;
  const dateMin = localDate;
  const timeMin = date === localDate ? currentTime : "00:00";

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    getService(serviceIdentifier)
      .then((data) => {
        if (active) setService(data);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [serviceIdentifier]);

  if (isLoading) return <LoadingSpinner label="Loading service..." />;
  if (error) return <ErrorMessage error={error} />;
  if (!service) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBookingError(null);

    if (!date || !time) {
      setBookingError("Please choose a future appointment date and time.");
      return;
    }

    const selectedDateTime = new Date(`${date}T${time}:00`);
    if (selectedDateTime < new Date()) {
      setBookingError("Past dates and times are not allowed. Please select a future appointment.");
      return;
    }

    setBusy(true);

    try {
      const res = await createBooking({
        service_id: service.id,
        scheduled_date: date,
        scheduled_time: time,
        service_type: serviceType,
        payment_method: paymentMethod,
        notes,
        address,
      });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }
      if (paymentMethod === "Khalti") {
        const payment = await initiateKhaltiPayment(res.id, service.effective_price);
        if (!payment?.payment_url) {
          throw new Error("Khalti did not return a payment URL. Please try again or choose cash on service.");
        }
        window.location.assign(payment.payment_url);
        return;
      }
      navigate(`/booking/success?bid=${res.bid}`);
    } catch (err) {
      setBookingError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gn-container py-12">
      <div className="mx-auto max-w-2xl">
        <span className="gn-eyebrow text-primary">Checkout</span>
        <h1 className="mt-1 font-display text-4xl text-foreground">Book Appointment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm date, time, and service setting for <strong className="text-foreground">{service.title}</strong>.
        </p>

        <form className="gn-card mt-8 p-8 border border-border space-y-6" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-bold text-lg">{service.title}</h3>
              <p className="text-xs text-muted-foreground">by {service.vendor_name}</p>
            </div>
            <div className="text-right font-display text-2xl text-primary">
              {formatPrice(service.effective_price)}
            </div>
          </div>

          <div>
            <label className="gn-label block font-semibold mb-2">Location / Setting:</label>
            <div className="grid grid-cols-2 gap-3">
              {["Home", "Store"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setServiceType(type)}
                  className={`gn-btn py-3 text-sm font-bold border ${serviceType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/40 text-foreground border-border hover:bg-secondary"
                    }`}
                >
                  {type === "Home" ? "🏠 Doorstep Home Visit" : "💈 Salon Studio Visit"}
                </button>
              ))}
            </div>
          </div>

          {serviceType === "Home" ? (
            <div>
              <label className="gn-label" htmlFor="address">
                Your Delivery / Home Address <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                type="text"
                required
                placeholder="e.g. House No. 42, Baneshwor, Kathmandu"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="gn-input mt-1.5 w-full"
              />
            </div>
          ) : null}

          <div>
            <label className="gn-label block font-semibold mb-2">Payment method:</label>
            <div className="grid grid-cols-2 gap-3">
              {["Khalti", "COD"].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`gn-btn py-3 text-sm font-bold border ${paymentMethod === method
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/40 text-foreground border-border hover:bg-secondary"
                    }`}
                >
                  {method === "Khalti" ? "Pay with Khalti" : "Cash on service"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {paymentMethod === "Khalti"
                ? "You will be redirected to Khalti to complete payment."
                : "Pay the specialist after your appointment is completed."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="gn-label" htmlFor="date">
                Scheduled Date <span className="text-red-500">*</span>
              </label>
              <input
                id="date"
                type="date"
                required
                min={dateMin}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="gn-input mt-1.5 w-full"
              />
            </div>
            <div>
              <label className="gn-label" htmlFor="time">
                Preferred Time <span className="text-red-500">*</span>
              </label>
              <input
                id="time"
                type="time"
                required
                min={timeMin}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="gn-input mt-1.5 w-full"
              />
            </div>
          </div>

          <div>
            <label className="gn-label" htmlFor="notes">
              Special Requests / Instructions
            </label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any hair/skin preferences or special instructions for the specialist..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="gn-input mt-1.5 w-full"
            />
          </div>

          {bookingError ? <ErrorMessage error={bookingError} /> : null}

          <button
            type="submit"
            disabled={busy}
            className="gn-btn gn-btn-primary w-full py-3.5 text-base font-bold"
          >
            {busy ? "Confirming Booking..." : "Confirm & Book Appointment"}
          </button>
        </form>
      </div>
    </div>
  );
}
