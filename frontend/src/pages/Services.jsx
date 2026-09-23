import { useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { listServices, listCategories } from "@/api/serviceApi";
import { ServiceCard } from "@/components/ServiceCard";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";


export default function Services() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialLocation = searchParams.get("location") || "";
  const initialCategory = searchParams.get("category") || "";

  const [search, setSearch] = useState(initialSearch);
  const [location, setLocation] = useState(initialLocation);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(null);

  const [categories, setCategories] = useState([]);

  const fetchServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const data = await listServices({ search, location, category: selectedCategory });
      setServices(data?.results ?? []);
    } catch (err) {
      setServicesError(err);
    } finally {
      setServicesLoading(false);
    }
  }, [search, location, selectedCategory]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    listCategories()
      .then((data) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  return (
    <div className="gn-container py-12">
      <div className="max-w-3xl">
        {/* <span className="gn-eyebrow text-primary">List</span> */}
        <h1 className="mt-1 font-display text-4xl sm:text-5xl text-foreground">
          Beauty Services &amp; Treatments
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Discover verified hair, skincare, spa, makeup, and nail appointments.
        </p>
      </div>

      <form
        className="mt-8 w-full max-w-6xl"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search services"
              className="w-full border border-border bg-white py-4 pl-12 pr-4 text-base text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">
              <i className="fa-solid fa-location-dot" aria-hidden="true" />
            </span>
            <input
              id="location"
              type="search"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Location"
              className="w-full border border-border bg-white py-4 pl-12 pr-4 text-base text-foreground outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            className="gn-btn gn-btn-primary h-[58px] px-6 text-base md:min-w-[190px]"
          >
            Search Services
          </button>
        </div>
      </form>

      {categories && categories.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("")}
            className={`gn-chip ${!selectedCategory ? "bg-primary text-primary-foreground font-bold" : ""}`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={String(cat.id)}
              type="button"
              onClick={() => setSelectedCategory(cat.slug ?? String(cat.id))}
              className={`gn-chip ${selectedCategory === (cat.slug ?? String(cat.id))
                ? "bg-primary text-primary-foreground font-bold"
                : ""
                }`}
            >
              {cat.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-10">
        {servicesLoading ? (
          <SkeletonGrid count={6} />
        ) : servicesError ? (
          <ErrorMessage
            error={servicesError}
            onRetry={fetchServices}
          />
        ) : services.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={String(service.sid)} service={service} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No services found"
            description="Try changing your search term or selecting a different category."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearch("");
              setLocation("");
              setSelectedCategory("");
            }}
          />
        )}
      </div>
    </div>
  );
}
