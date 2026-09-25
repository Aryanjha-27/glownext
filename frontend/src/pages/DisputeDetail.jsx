import { Link, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { disputeApi } from "@/api/disputeApi";
import { formatDate } from "@/utils/formatDate";
import { formatPrice } from "@/utils/formatPrice";

export default function DisputeDetail() {
  return <ProtectedRoute><DisputeDetailContent /></ProtectedRoute>;
}

function DisputeDetailContent() {
  const { id } = useParams();
  const [dispute, setDispute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDispute(await disputeApi.getDispute(id));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) return <LoadingSpinner label="Loading dispute details..." />;
  if (error) return <ErrorMessage error={error} onRetry={load} />;
  if (!dispute) return null;

  return (
    <div className="gn-container py-12">
      <Link to="/disputes" className="text-sm font-semibold text-primary hover:underline">&larr; Back to my disputes</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <section className="gn-card border border-border p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <span className="gn-eyebrow text-primary">Dispute #{dispute.did || dispute.id}</span>
              <h1 className="mt-1 font-display text-2xl">{dispute.reason} {dispute.subject ? `- ${dispute.subject}` : ""}</h1>
            </div>
            <span className="gn-badge bg-primary/10 text-primary">{dispute.status}</span>
          </div>
          
          {dispute.vendor_response ? <div className="mt-5 border-t border-border pt-4"><strong>Vendor response</strong><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{dispute.vendor_response}</p></div> : null}
         
        </section>
        <section className="gn-card border border-border p-6">
          <h2 className="font-display text-lg">Booking reference</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Booking</dt><dd>#{dispute.booking_bid || dispute.booking}</dd></div>
            <div className="flex justify-between"><dt>Service</dt><dd>{dispute.service_title || "Service"}</dd></div>
            <div className="flex justify-between"><dt>Amount</dt><dd>{formatPrice(dispute.amount)}</dd></div>
            <div className="flex justify-between"><dt>Created</dt><dd>{formatDate(dispute.date)}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
