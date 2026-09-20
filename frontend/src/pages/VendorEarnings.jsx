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

      {/* Booking Transaction & Commission Breakdown */}
      <VendorTransactionHistory />
    </div>
  );
}

function VendorTransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    import("@/api/disputeApi").then(({ disputeApi }) => {
      disputeApi
        .getVendorTransactions()
        .then((data) => {
          setTransactions(data.results || data || []);
        })
        .catch(setError)
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <section className="gn-card mt-8 border border-border p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-2xl text-foreground">Booking Transactions &amp; Commission</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transparent per-booking breakdown of gross booking amount, platform commission, and your net payout.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-muted-foreground">Loading transaction logs...</p>
      ) : error ? (
        <div className="mt-4"><ErrorMessage error={error} /></div>
      ) : transactions.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground bg-muted/40">
              <tr>
                <th className="py-3 px-4">Booking</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Gross Amount</th>
                <th className="py-3 px-4 text-right">Platform Fee</th>
                <th className="py-3 px-4 text-right font-bold text-foreground">Net Earning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((t) => (
                <tr key={t.bid || t.id} className="hover:bg-muted/20">
                  <td className="py-3 px-4 font-mono font-semibold">#{t.bid}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{t.date ? new Date(t.date).toLocaleDateString() : "-"}</td>
                  <td className="py-3 px-4">{t.customer_name || "Customer"}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                      {t.payment_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">{formatPrice(t.gross_amount || t.total)}</td>
                  <td className="py-3 px-4 text-right text-rose-500 font-mono">
                    -{formatPrice(t.commission_amount || 0)}
                    {t.commission_rate ? <span className="text-[10px] ml-1 opacity-70">({t.commission_rate}%)</span> : null}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">
                    +{formatPrice(t.net_amount || (Number(t.total) - Number(t.commission_amount || 0)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground italic">No paid transactions recorded yet.</p>
      )}
    </section>
  );
}
