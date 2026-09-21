import { Link } from "react-router-dom";
import { imageUrl } from "@/utils/imageUrl";
import { formatPrice } from "@/utils/formatPrice";
import { RatingStars } from "./RatingStars";

function ServiceCard({ service }) {
  const slug = service.slug ?? service.sid;
  const thumb = imageUrl(service.thumbnail);

  return (
    <article className="gn-card group overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div className="relative">
        <Link to={`/services/${slug}`} className="block">
          {thumb ? (
            <img
              src={thumb}
              alt={service.title}
              loading="lazy"
              width={1024}
              height={768}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center bg-secondary text-secondary-foreground/40">
              <i className="fa-regular fa-image text-3xl" aria-hidden="true" />
            </div>
          )}
        </Link>
        <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
          {service.service_type ? (
            <span className="gn-badge bg-primary text-primary-foreground">
              {service.service_type === "Both" ? "Home or store" : `${service.service_type} visit`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {service.category_name ?? "Uncategorised"}
          </span>
          <RatingStars rating={service.average_rating} count={service.review_count} />
        </div>

        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-foreground">
          <Link to={`/services/${slug}`}>{service.title}</Link>
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">by {service.vendor_name ?? "Vendor"} · {service.duration_minutes ?? 60} minutes</p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-2xl text-foreground">
            {formatPrice(service.effective_price ?? service.price)}
          </span>
        </div>

        <div className="mt-5 flex gap-2">
          <Link to={`/services/${slug}`} className="gn-btn gn-btn-outline flex-1 text-center">
            View details
          </Link>
          <Link to={`/booking/${slug}`} className="gn-btn gn-btn-ink flex-1 text-center">
            Book now
          </Link>
        </div>
      </div>
    </article>
  );
}

export { ServiceCard };
