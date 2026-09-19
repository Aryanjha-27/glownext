import { useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { getVendor } from "@/api/vendorApi";
import { imageUrl } from "@/utils/imageUrl";
import { ServiceCard } from "@/components/ServiceCard";
import { RatingStars } from "@/components/RatingStars";
import { ReviewCard } from "@/components/ReviewCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function SalonDetail() {
  const { slug } = useParams();

  const [vendor, setVendor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVendor = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getVendor(slug);
      setVendor(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  if (isLoading) return <LoadingSpinner label="Loading salon details..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchVendor} />;
  if (!vendor) return null;

  const banner = imageUrl(vendor.banner_image);
  const logo = imageUrl(vendor.logo);
  const services = vendor.services ?? [];
  const reviews = vendor.reviews ?? [];

  return (
    <div>
      {/* Banner */}
      <div className="relative h-64 sm:h-80 w-full bg-ink">
        {banner ? (
          <img
            src={banner}
            alt={vendor.business_name}
            className="size-full object-cover opacity-60"
          />
        ) : null}
      </div>

      <div className="gn-container py-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 -mt-20 relative z-10">
          <div className="flex items-end gap-5">
            <div className="size-24 sm:size-32 overflow-hidden rounded-3xl border-4 border-background bg-background shadow-xl">
              {logo ? (
                <img src={logo} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-primary text-primary-foreground font-display text-4xl">
                  {vendor.business_name?.[0] ?? "S"}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-5xl text-foreground">
                {vendor.business_name}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <RatingStars rating={vendor.average_rating} count={vendor.review_count} />
                <span className="text-xs text-muted-foreground">Verified Studio</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description & Info */}
        <div className="mt-8 max-w-3xl">
          <h2 className="font-bold text-lg text-foreground">About the Studio</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {vendor.description || "Welcome to our beauty studio! Book your appointments online."}
          </p>
        </div>

        {/* Offered Services */}
        <div className="mt-12">
          <h2 className="font-display text-3xl text-foreground">
            Services Offered ({services.length})
          </h2>

          {services.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <ServiceCard key={String(s.sid)} service={s} />
              ))}
            </div>
          ) : (
            <div className="gn-card mt-6 p-8 text-center text-muted-foreground">
              No services listed by this studio yet.
            </div>
          )}
        </div>

        <section className="mt-12 border-t border-border pt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="gn-eyebrow text-primary">Client feedback</p>
              <h2 className="mt-1 font-display text-3xl text-foreground">Reviews</h2>
            </div>
            <RatingStars rating={vendor.average_rating} count={vendor.review_count} />
          </div>

          {reviews.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {reviews.map((review) => (
                <ReviewCard key={String(review.id ?? review.rid)} review={review} />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">No written reviews yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
