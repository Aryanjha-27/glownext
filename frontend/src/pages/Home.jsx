import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { listCategories } from "@/api/serviceApi";
import { SearchBar } from "@/components/SearchBar";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";
import { imageUrl } from "@/utils/imageUrl";

import hero from "@/assets/hero.jpg";
import catHair from "@/assets/cat-hair.jpg";
import catSpa from "@/assets/cat-spa.jpg";
import catMakeup from "@/assets/cat-makeup.jpg";

const fallbackCategoryArt = [catHair, catSpa, catMakeup];


export default function Home() {
  const navigate = useNavigate();

 
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const data = await listCategories();
      setCategories(data);
    } catch (err) {
      setCategoriesError(err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const goSearch = (search) => {
    navigate(`/services?search=${encodeURIComponent(search)}`);
  };

  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-ink text-cream">
        <img
          src={hero}
          alt="Beauty studio styling session"
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="relative gn-container flex min-h-[80vh] flex-col justify-center py-24">
          <p className="gn-eyebrow text-primary">Beauty, On Your Schedule</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] sm:text-7xl">
            Salon-Grade Glow, Booked in <span className="text-primary">Seconds</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-cream/80 leading-relaxed">
            Compare verified beauty specialists and salons in Nepal. Choose a comfortable doorstep home visit or an in-store studio appointment.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-6xl">
            <SearchBar onSearch={goSearch} submitLabel="Find Services" />
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/services" className="gn-btn gn-btn-primary">
              Browse All Services
            </Link>
            <Link to="/vendors" className="gn-btn gn-btn-cream">
              Explore Salons
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Categories Section */}
      <section className="gn-section">
        <div className="gn-container">
          <p className="gn-eyebrow">Categories</p>
          <h2 className="mt-2 text-3xl sm:text-4xl text-foreground font-display">Pick Your Treatment</h2>

          {categoriesLoading ? (
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="gn-skeleton aspect-[4/5] w-full rounded-3xl" />
              ))}
            </div>
          ) : categoriesError ? (
            <div className="mt-8">
              <ErrorMessage
                error={categoriesError}
                onRetry={fetchCategories}
                title="Categories aren't available right now"
              />
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
              {categories.map((c, i) => (
                <Link
                  key={String(c.id)}
                  to={`/services?category=${encodeURIComponent(c.slug ?? String(c.id))}`}
                  className="group relative overflow-hidden rounded-3xl border border-border"
                >
                  <img
                    src={imageUrl(c.image) ?? fallbackCategoryArt[i % fallbackCategoryArt.length]}
                    alt={c.title}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4 font-display text-xl text-cream">
                    {c.title}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState title="No categories available yet" />
            </div>
          )}
        </div>
      </section>

      {/* 3. How We Work Preview Section */}
      <section className="gn-section">
        <div className="gn-container">
          <div className="text-center max-w-2xl mx-auto">
            <p className="gn-eyebrow">Simple Booking</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display">How Glow Next Works</h2>
            <p className="mt-2 text-sm text-muted-foreground">Book top beauty specialists in 3 easy steps</p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                num: "1",
                icon: "fa-solid fa-magnifying-glass",
                title: "Choose Service",
                desc: "Explore hair, makeup, skincare, spa, or nail treatments from top specialists.",
              },
              {
                num: "2",
                icon: "fa-solid fa-calendar-check",
                title: "Pick Home or Salon",
                desc: "Select a doorstep home visit or an in-salon appointment and enter your preferred time.",
              },
              {
                num: "3",
                icon: "fa-solid fa-sparkles",
                title: "Glow & Pay Conveniently",
                desc: "Relax during your session and pay effortlessly online with Khalti or via cash.",
              },
            ].map((step) => (
              <div key={step.num} className="gn-card p-8 text-center border border-border hover:border-primary/50 transition-colors">
                <div className="mx-auto size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                  <i className={step.icon} />
                </div>
                <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to="/how-we-work" className="gn-btn gn-btn-outline">
              Learn More About How We Work &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 5. About Us Highlight Section */}
      <section className="gn-section bg-ink text-cream">
        <div className="gn-container grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <p className="gn-eyebrow text-primary">About Glow Next</p>
            <h2 className="mt-2 text-4xl font-display leading-tight">
              Connecting You with Nepal's Trusted Beauty Experts
            </h2>
            <p className="mt-4 text-cream/80 text-sm sm:text-base leading-relaxed">
              We empower verified beauty specialists and top-rated salons while offering clients a seamless, transparent booking platform with standardized quality and flexible scheduling.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/about" className="gn-btn gn-btn-primary">
                About Us &amp; Our Mission
              </Link>
              <Link to="/vendors" className="gn-btn gn-btn-cream">
                View Partner Salons
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="gn-card p-6 bg-cream/5 border border-cream/10 text-center">
              <p className="font-display text-4xl text-primary">500+</p>
              <p className="mt-1 text-xs text-cream/70">Verified Stylists</p>
            </div>
            <div className="gn-card p-6 bg-cream/5 border border-cream/10 text-center">
              <p className="font-display text-4xl text-primary">10k+</p>
              <p className="mt-1 text-xs text-cream/70">Completed Bookings</p>
            </div>
            <div className="gn-card p-6 bg-cream/5 border border-cream/10 text-center">
              <p className="font-display text-4xl text-primary">4.9 ★</p>
              <p className="mt-1 text-xs text-cream/70">Client Rating</p>
            </div>
            <div className="gn-card p-6 bg-cream/5 border border-cream/10 text-center">
              <p className="font-display text-4xl text-primary">100%</p>
              <p className="mt-1 text-xs text-cream/70">Satisfaction Guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Features Grid */}
      <section className="gn-section">
        <div className="gn-container grid gap-6 md:grid-cols-3">
          {[
            {
              icon: "fa-solid fa-shield-heart",
              title: "Verified Professionals",
              body: "Every artist and studio is background checked and verified before accepting appointments.",
            },
            {
              icon: "fa-solid fa-house-chimney",
              title: "Home or In-Store",
              body: "Choose between comfortable home visits or booking a chair at top beauty salons.",
            },
            {
              icon: "fa-solid fa-wallet",
              title: "Khalti or Cash",
              body: "Flexible payment options — pay online digitally with Khalti or pay cash after treatment.",
            },
          ].map((f) => (
            <article key={f.title} className="gn-card p-8 border border-border">
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-lg text-primary">
                <i className={f.icon} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
