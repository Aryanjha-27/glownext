import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { getMyVendorEarnings, requestVendorPayout } from "@/api/vendorApi";
import { formatPrice } from "@/utils/formatPrice";

export default function VendorEarnings() {
  return <ProtectedRoute requireUserType="Vendor"><VendorEarningsContent /></ProtectedRoute>;
}

function VendorEarningsContent() {
  const [earnings, setEarnings] = useState(null);
  const [error, setError] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutError, setPayoutError] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const load = () => {
    setError(null);
    getMyVendorEarnings().then(setEarnings).catch(setError);
  };

  const requestPayout = async (event) => {
    event.preventDefault();
    setPayoutError(null);
    setIsRequesting(true);
    try {
      await requestVendorPayout(payoutAmount);
      setPayoutAmount("");
      load();
    } catch (requestError) {
      setPayoutError(requestError);
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(load, []);

  if (error) return <div className="gn-container py-12"><ErrorMessage error={error} onRetry={load} /></div>;
  if (!earnings) return <LoadingSpinner label="Loading your earnings..." />;

  return (
    <div className="gn-container py-12">
      <p className="gn-eyebrow text-primary">Vendor Finance</p>
      <h1 className="mt-1 font-display text-4xl text-foreground">Earnings</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Overall earnings", earnings.total_earned],
          ["Pending earnings", earnings.pending_earnings],
          ["Available", earnings.available_earnings],
          ["Paid out", earnings.total_paid_out],
        ].map(([label, amount]) => (
          <div key={label} className="gn-card border border-border p-5">
            <p className="font-display text-2xl text-foreground">{formatPrice(amount)}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <section className="gn-card mt-8 border border-border p-6">
        <h2 className="font-display text-2xl text-foreground">Request a payout</h2>
        <p className="mt-1 text-sm text-muted-foreground">Available balance: {formatPrice(earnings.available_earnings)}</p>
        <form className="mt-4 flex flex-wrap gap-3" onSubmit={requestPayout}>
          <input className="gn-input min-w-48 flex-1" type="number" min="0.01" step="0.01" max={earnings.available_earnings} value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} placeholder="Amount" required />
          <button className="gn-button" type="submit" disabled={isRequesting || Number(earnings.available_earnings) <= 0}>{isRequesting ? "Requesting..." : "Request payout"}</button>
        </form>
        {payoutError ? <div className="mt-3"><ErrorMessage error={payoutError} /></div> : null}
      </section>
      <section className="gn-card mt-8 border border-border p-6">
        <h2 className="font-display text-2xl text-foreground">Payout history</h2>
        <div className="mt-4 space-y-3">
          {earnings.payouts?.map((payout) => (
            <div key={payout.id} className="flex flex-wrap justify-between gap-3 border-b border-border pb-3 text-sm">
              <span>Payout #{payout.id} {payout.booking_id ? `for booking ${payout.booking_id}` : ""}</span>
              <span className="font-semibold">{formatPrice(payout.amount)} · {payout.status}</span>
            </div>
          ))}
          {!earnings.payouts?.length ? <p className="text-sm text-muted-foreground">No payouts recorded yet.</p> : null}
        </div>
      </section>

    </div>
  );
}

