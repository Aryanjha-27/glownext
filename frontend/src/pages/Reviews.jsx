import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardNav } from "@/components/DashboardNav";
import { listMyReviews } from "@/api/reviewApi";
import { ReviewCard } from "@/components/ReviewCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";

export default function Reviews() {
  return (
    <ProtectedRoute>
      <ReviewsContent />
    </ProtectedRoute>
  );
}

function ReviewsContent() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listMyReviews();
      setReviews(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <div className="gn-container py-12">
      <span className="gn-eyebrow text-primary">Feedback</span>
      <h1 className="mt-1 font-display text-4xl text-foreground">My Reviews</h1>

      <div className="mt-6">
        <DashboardNav />
      </div>

      <div className="mt-8 max-w-2xl">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="gn-card p-4 text-sm text-muted-foreground">
                Loading reviews...
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorMessage error={error} onRetry={fetchReviews} />
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <ReviewCard key={String(rev.id)} review={rev} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="fa-regular fa-star"
            title="No reviews written yet"
            description="After completing a service appointment, share your experience to help other clients."
            actionLabel="View Appointments"
            actionTo="/bookings"
          />
        )}
      </div>
    </div>
  );
}
