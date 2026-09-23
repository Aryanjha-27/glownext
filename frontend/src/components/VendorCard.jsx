import { Link } from "react-router-dom";
import { imageUrl } from "@/utils/imageUrl";
import { RatingStars } from "./RatingStars";

function VendorCard({ vendor }) {
  const image = imageUrl(vendor.image);
  return (
    <Link
      to={`/vendors/${vendor.slug}`}
      className="gn-card flex items-center gap-4 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
    >
      {image ? (
        <img
          src={image}
          alt={vendor.store_name}
          loading="lazy"
          width={96}
          height={96}
          className="size-16 rounded-2xl object-cover"
        />
      ) : (
        <span className="grid size-16 place-items-center rounded-2xl bg-secondary text-primary">
          <i className="fa-solid fa-store" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-foreground">{vendor.store_name}</h3>
        <p className="truncate text-sm text-muted-foreground">
          {[vendor.city, vendor.country].filter(Boolean).join(", ") || "Location not shared"}
        </p>
        <div className="mt-1">
          <RatingStars rating={vendor.average_rating ?? null} count={vendor.review_count ?? null} />
        </div>
      </div>
    </Link>
  );
}

export { VendorCard };
