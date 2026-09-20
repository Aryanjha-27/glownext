import { Link, useParams } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { disputeApi } from "@/api/disputeApi";
import { formatDate } from "@/utils/formatDate";
import { formatPrice } from "@/utils/formatPrice";
import { useAuth } from "@/hooks/useAuth";

export default function VendorDisputeDetail() {
  return (
    <ProtectedRoute requireUserType="Vendor">
      <VendorDisputeDetailContent />
    </ProtectedRoute>
  );
}

function VendorDisputeDetailContent() {
  const { id } = useParams();
  const { user } = useAuth();

  const [dispute, setDispute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vendor formal response form state
  const [vendorResponseText, setVendorResponseText] = useState("");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [responseError, setResponseError] = useState(null);
  const [responseSuccess, setResponseSuccess] = useState(false);

  // Thread chat message state
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const messagesEndRef = useRef(null);

  const fetchDispute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await disputeApi.getVendorDispute(id);
      setDispute(data);
      if (data.vendor_response) {
        setVendorResponseText(data.vendor_response);
      }
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDispute();
  }, [fetchDispute]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dispute?.messages]);

  const handleFormalResponse = async (e) => {
    e.preventDefault();
    if (!vendorResponseText.trim()) return;

    setIsSubmittingResponse(true);
    setResponseError(null);
    try {
      await disputeApi.vendorRespond(id, { vendor_response: vendorResponseText });
      setResponseSuccess(true);
      await fetchDispute();
    } catch (err) {
      setResponseError(err);
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    setSendError(null);
    try {
      await disputeApi.sendVendorMessage(id, { message });
      setMessage("");
      await fetchDispute();
    } catch (err) {
      setSendError(err);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading dispute details..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchDispute} />;
  if (!dispute) return null;

  const isClosed = ["Resolved", "Rejected", "Closed"].includes(dispute.status);

  return (
    <div className="gn-container py-12">
      <Link to="/vendor/disputes" className="text-sm font-semibold text-primary hover:underline">
        &larr; Back to vendor disputes
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute info card */}
          <div className="gn-card p-6 border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
              <div>
                <span className="gn-eyebrow text-primary">Dispute #{dispute.did || dispute.id}</span>
                <h1 className="mt-1 font-display text-2xl text-foreground">
                  {dispute.reason} {dispute.subject ? `— ${dispute.subject}` : ""}
                </h1>
              </div>
              <span className="gn-badge bg-primary/10 text-primary border border-primary/20 font-bold">
                {dispute.status}
              </span>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <strong className="text-foreground">Customer Complaint:</strong>
                <p className="mt-1 text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg border border-border/50">
                  {dispute.description || "No specific details provided."}
                </p>
              </div>

              {dispute.attachment ? (
                <div>
                  <span className="text-muted-foreground font-medium">Customer Uploaded Evidence: </span>
                  <a
                    href={dispute.attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <i className="fa-solid fa-paperclip" /> View Attachment
                  </a>
                </div>
              ) : null}

              {/* Vendor's formal response */}
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <strong className="text-foreground">Your Official Statement:</strong>
                  {dispute.vendor_responded_at ? (
                    <span className="text-xs text-muted-foreground">
                      Submitted on {formatDate(dispute.vendor_responded_at)}
                    </span>
                  ) : null}
                </div>

                {!isClosed ? (
                  <form onSubmit={handleFormalResponse} className="mt-2 space-y-3">
                    {responseError ? <ErrorMessage error={responseError} /> : null}
                    {responseSuccess ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs">
                        Statement submitted successfully to the GlowNext admin review board.
                      </div>
                    ) : null}
                    <textarea
                      rows={4}
                      value={vendorResponseText}
                      onChange={(e) => setVendorResponseText(e.target.value)}
                      placeholder="Provide your side of the story, appointment records, explanation, or proposed resolution..."
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingResponse || !vendorResponseText.trim()}
                        className="gn-btn bg-primary text-primary-foreground text-xs"
                      >
                        {isSubmittingResponse ? "Submitting..." : dispute.vendor_response ? "Update Official Statement" : "Submit Official Statement"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/50">
                    {dispute.vendor_response || "No formal response submitted."}
                  </p>
                )}
              </div>

              {/* Resolution Decision */}
              {dispute.admin_response || dispute.resolution ? (
                <div className="pt-3 border-t border-border/50 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                  <strong className="text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved" /> Admin Decision
                  </strong>
                  {dispute.resolution ? (
                    <p className="mt-1 text-foreground font-semibold">
                      Outcome: {dispute.resolution}
                    </p>
                  ) : null}
                  {dispute.admin_response ? (
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {dispute.admin_response}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Discussion Thread */}
          <div className="gn-card p-6 border border-border">
            <h2 className="font-display text-xl text-foreground mb-4">Messages &amp; Dialogue</h2>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {dispute.messages && dispute.messages.length > 0 ? (
                dispute.messages.map((msg) => {
                  const isMe = msg.sender_id === user?.user_id || msg.sender_username === user?.username;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted text-foreground border border-border rounded-bl-none"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs mb-1 opacity-80">
                          <span className="font-semibold">{msg.sender_display || msg.sender_username || "User"}</span>
                          <span>{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No threaded messages yet.
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {!isClosed ? (
              <form onSubmit={handleSendMessage} className="mt-6 pt-4 border-t border-border">
                {sendError ? <ErrorMessage error={sendError} /> : null}
                <div className="space-y-3">
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Send a message to the customer and mediator..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSending || !message.trim()}
                      className="gn-btn bg-primary text-primary-foreground text-xs"
                    >
                      {isSending ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="gn-card p-6 border border-border">
            <h3 className="font-display text-lg text-foreground mb-4">Booking Reference</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Booking ID:</span>
                <span className="font-semibold text-foreground">#{dispute.booking_bid || dispute.booking}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-semibold text-foreground">{dispute.booking_service_title || "Service"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground">{dispute.customer_name || "Customer"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Dispute Amount:</span>
                <span className="font-display text-lg text-primary">{formatPrice(dispute.amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
