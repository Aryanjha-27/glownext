import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getService } from "@/api/serviceApi";
import { imageUrl } from "@/utils/imageUrl";
import { formatPrice } from "@/utils/formatPrice";
import { RatingStars } from "@/components/RatingStars";
import { ReviewCard } from "@/components/ReviewCard";
import { listServiceReviews } from "@/api/reviewApi";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

/**
 * Service Detail Page - Shows full details for a single service
 */
export default function ServiceDetail() {
  const { slug } = useParams();

  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);

  const fetchService = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getService(slug);
      setService(data);
      const reviewData = await listServiceReviews(data.slug);
      setReviews(reviewData.results ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchService();
  }, [slug]);

  if (isLoading) return <LoadingSpinner label="Loading service details..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchService} />;
  if (!service) return null;

  const thumb = imageUrl(service.thumbnail);

  return (
    <div className="gn-container py-12">
      <Link to="/services" className="text-sm font-semibold text-primary hover:underline">
        &larr; Back to all services
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Thumbnail Image */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-secondary">
          {thumb ? (
            <img
              src={thumb}
              alt={service.title}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center text-muted-foreground">
              <i className="fa-regular fa-image text-5xl" />
            </div>
          )}
        </div>

        {/* Details & Booking Sidebar */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {service.category_name ?? "Beauty Treatment"}
              </span>
              <RatingStars rating={service.average_rating} count={service.review_count} />
            </div>

            <h1 className="mt-2 font-display text-3xl sm:text-4xl text-foreground">
              {service.title}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Offered by{" "}
              <Link to={`/vendors/${service.vendor_slug ?? ""}`} className="font-semibold text-primary hover:underline">
                {service.vendor_name ?? "Salon Studio"}
              </Link>
            </p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-4xl text-foreground">
                {formatPrice(service.effective_price ?? service.price)}
              </span>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl bg-secondary/30 p-5 text-sm border border-border">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-clock text-primary" />
                <span>Duration: {formatDuration(service.duration_minutes)}</span>
              </div>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-house-chimney text-primary" />
                <span>
                  Service Type:{" "}
                  {service.service_type === "Both"
                    ? "Home Visit or In-Store"
                    : `${service.service_type} Visit`}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-bold text-foreground">Description</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {service.description ? <span dangerouslySetInnerHTML={{ __html: sanitizeDescription(service.description) }} /> : "No description provided for this service."}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex gap-4">
            <Link
              to={`/booking/${service.slug ?? service.sid}`}
              className="gn-btn gn-btn-primary flex-1 py-3 text-center text-base font-bold"
            >
              Book Now &rarr;
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-12 border-t border-border pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="gn-eyebrow text-primary">Client feedback</p>
            <h2 className="mt-1 font-display text-3xl text-foreground">Reviews</h2>
          </div>
          <RatingStars rating={service.average_rating} count={service.review_count} />
        </div>
        {reviews.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {reviews.map((review) => <ReviewCard key={review.id ?? review.rid} review={review} />)}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">No written reviews yet.</p>
        )}
      </section>
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

function sanitizeDescription(html) {
  if (typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script, style, iframe, object, embed, form").forEach((node) => node.remove());
  document.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith("on") || (attribute.name.toLowerCase() === "href" && attribute.value.toLowerCase().startsWith("javascript:"))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return document.body.innerHTML;
}
