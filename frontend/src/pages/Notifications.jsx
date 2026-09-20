import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardNav } from "@/components/DashboardNav";
import { useAuth } from "@/hooks/useAuth";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/api/notificationApi";
import { formatDate } from "@/utils/formatDate";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRows } from "@/components/SkeletonCard";

export default function Notifications() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

function NotificationsContent() {
  const { userType } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listNotifications();
      setItems(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleNotificationClick = async (item) => {
    try {
      await markNotificationRead(item.id);
      setItems((prev) =>
        prev.map((notification) => (notification.id === item.id ? { ...notification, seen: true } : notification))
      );
      const bookingId = item.booking?.bid;
      if (bookingId) navigate(userType === "Vendor" ? "/vendor/bookings" : `/bookings/${bookingId}`);
    } catch {
      // Keep UI state intact
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((item) => ({ ...item, seen: true })));
    } catch {
      // Keep UI state intact
    }
  };

  return (
    <div className="gn-container py-12">
      <div className="flex items-center justify-between">
        <div>
          <span className="gn-eyebrow text-primary">Alerts & Updates</span>
          <h1 className="mt-1 font-display text-4xl text-foreground">Notifications</h1>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="gn-btn gn-btn-outline text-xs"
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      <div className="mt-6">
        {userType === "Vendor" ? null : <DashboardNav />}
      </div>

      <div className="mt-8 max-w-2xl">
        {isLoading ? (
          <SkeletonRows count={3} />
        ) : error ? (
          <ErrorMessage error={error} onRetry={fetchNotes} />
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`gn-card p-4 border transition-colors cursor-pointer ${
                  item.seen ? "border-border bg-card opacity-80" : "border-primary/40 bg-secondary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{item.title ?? "Update"}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="fa-regular fa-bell"
            title="No notifications yet"
            description="You are all caught up! You will see booking reminders and appointment updates here."
          />
        )}
      </div>
    </div>
  );
}
