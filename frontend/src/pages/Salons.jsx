import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listVendors } from "@/api/vendorApi";
import { imageUrl } from "@/utils/imageUrl";
import { RatingStars } from "@/components/RatingStars";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";

export default function Salons() {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVendors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listVendors();
      setVendors(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return (
    <div className="gn-container py-12">
      <div className="max-w-3xl">
        <span className="gn-eyebrow text-primary">Partner Studios</span>
        <h1 className="mt-1 font-display text-4xl sm:text-5xl text-foreground">
          Salons &amp; Beauty Specialists
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Explore top-rated salons, independent artists, and verified beauty studios.
        </p>
      </div>

      <div className="mt-10">
        {isLoading ? (
          <SkeletonGrid count={6} />
        ) : error ? (
          <ErrorMessage error={error} onRetry={fetchVendors} />
        ) : vendors.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((v) => {
              const title = v.business_name ?? v.store_name ?? "Beauty Studio";
              const banner = imageUrl(v.banner_image ?? v.image);
              const logo = imageUrl(v.logo ?? v.image);
              return (
                <article
                  key={String(v.slug ?? v.id)}
                  className="gn-card group overflow-hidden border border-border hover:shadow-lg transition-all"
                >
                  <div className="relative h-40 bg-secondary">
                    {banner ? (
                      <img
                        src={banner}
                        alt={title}
                        className="size-full object-cover"
                      />
                    ) : null}
                    <div className="absolute -bottom-6 left-5 size-14 overflow-hidden rounded-2xl border-2 border-background bg-background shadow-md">
                      {logo ? (
                        <img src={logo} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center bg-primary text-primary-foreground font-display text-xl">
                          {title?.[0] ?? "S"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-8">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-lg text-foreground">
                        {title}
                      </h3>
                      <RatingStars rating={v.average_rating} count={v.review_count} />
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                      {v.description || "Verified beauty partner on Glow Next."}
                    </p>

                    <div className="mt-5">
                      <Link
                        to={`/vendors/${v.slug ?? v.id}`}
                        className="gn-btn gn-btn-outline w-full text-center block"
                      >
                        View Studio &amp; Services
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No salons registered yet" />
        )}
      </div>
    </div>
  );
}
