import { Link, useParams } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { disputeApi } from "@/api/disputeApi";
import { formatDate } from "@/utils/formatDate";
import { formatPrice } from "@/utils/formatPrice";
import { useAuth } from "@/hooks/useAuth";

export default function DisputeDetail() {
  return (
    <ProtectedRoute>
      <DisputeDetailContent />
    </ProtectedRoute>
  );
}

function DisputeDetailContent() {
  const { id } = useParams();
  const { user } = useAuth();

  const [dispute, setDispute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const messagesEndRef = useRef(null);

  const fetchDispute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await disputeApi.getDispute(id);
      setDispute(data);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() && !attachment) return;

    setIsSending(true);
    setSendError(null);
    try {
      if (attachment) {
        const formData = new FormData();
        formData.append("message", message);
        formData.append("attachment", attachment);
        await disputeApi.sendMessage(id, formData);
      } else {
        await disputeApi.sendMessage(id, { message });
      }
      setMessage("");
      setAttachment(null);
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
      <Link to="/disputes" className="text-sm font-semibold text-primary hover:underline">
        &larr; Back to my disputes
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Details, Resolution info & Discussion Thread */}
        <div className="lg:col-span-2 space-y-6">
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

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <strong className="text-foreground">Customer Statement:</strong>
                <p className="mt-1 text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg border border-border/50">
                  {dispute.description || "No specific details provided."}
                </p>
              </div>

              {dispute.attachment ? (
                <div className="pt-2">
                  <span className="text-muted-foreground font-medium">Uploaded Evidence: </span>
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

              {dispute.vendor_response ? (
                <div className="pt-3 border-t border-border/50">
                  <strong className="text-foreground">Vendor Response:</strong>
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/50">
                    {dispute.vendor_response}
                  </p>
                  {dispute.vendor_responded_at ? (
                    <span className="text-xs text-muted-foreground">
                      Responded on {formatDate(dispute.vendor_responded_at)}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {dispute.admin_response || dispute.resolution ? (
                <div className="pt-3 border-t border-border/50 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                  <strong className="text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved" /> Official Resolution Decision
                  </strong>
                  {dispute.resolution ? (
                    <p className="mt-1 text-foreground font-semibold">
                      Decision: {dispute.resolution}
                    </p>
                  ) : null}
                  {dispute.admin_response ? (
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {dispute.admin_response}
                    </p>
                  ) : null}
                  {dispute.resolved_at ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Resolved on {formatDate(dispute.resolved_at)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Discussion Thread */}
          <div className="gn-card p-6 border border-border">
            <h2 className="font-display text-xl text-foreground mb-4">Conversation &amp; Updates</h2>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
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
                  No additional messages yet. Send a message below to coordinate with the admin and vendor.
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            {!isClosed ? (
              <form onSubmit={handleSendMessage} className="mt-6 pt-4 border-t border-border">
                {sendError ? (
                  <div className="mb-3">
                    <ErrorMessage error={sendError} />
                  </div>
                ) : null}
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message or update here..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSending || !message.trim()}
                      className="gn-btn bg-primary text-primary-foreground"
                    >
                      {isSending ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center text-xs text-muted-foreground border border-border">
                This dispute is {dispute.status.toLowerCase()}. Further messaging is locked.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Associated Booking & Vendor details */}
        <div className="space-y-6">
          <div className="gn-card p-6 border border-border">
            <h3 className="font-display text-lg text-foreground mb-4">Disputed Appointment</h3>
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
                <span className="text-muted-foreground">Vendor:</span>
                <span className="font-semibold text-foreground">{dispute.vendor_name || "Vendor"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-display text-lg text-primary">{formatPrice(dispute.amount)}</span>
              </div>
              {dispute.booking_bid ? (
                <div className="pt-2">
                  <Link
                    to={`/bookings/${dispute.booking_bid}`}
                    className="text-xs text-primary font-semibold hover:underline block text-center"
                  >
                    View Full Booking Details &rarr;
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="gn-card p-6 border border-border bg-muted/20">
            <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Dispute Policy
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our support team reviews customer disputes alongside the service provider. Funds are safeguarded in escrow during review until an amicable resolution or platform decision is reached.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
