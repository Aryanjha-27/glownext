import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { listCategories } from "@/api/serviceApi";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";
import { imageUrl } from "@/utils/imageUrl";

import hero from "@/assets/hero.jpg";
import catSpa from "@/assets/cat-spa.jpg";

const fallbackCategoryArt = [catSpa];


export default function Home() {
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

  return (
    <>
      <section className="relative overflow-hidden bg-transparent text-foreground">
        <div className="relative gn-container grid min-h-[70vh] items-center gap-8 py-10 lg:grid-cols-2 lg:gap-10">
          <div className="relative z-10 max-w-xl">
            <p className="gn-eyebrow text-primary">Beauty, On Your Schedule</p>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
              Salon at your <span className="text-primary">Fingertips</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-foreground/80">
              Find trusted beauty experts and salons. Book at home or visit the studio.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/services" className="gn-btn gn-btn-primary">
                Browse All Services
              </Link>
              <Link to="/vendors" className="gn-btn gn-btn-cream">
                Explore Salons
              </Link>
            </div>
          </div>

          <div className="relative z-10">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
              <img
                src={hero}
                alt="Professional beauty salon treatment"
                className="h-[420px] w-full object-cover sm:h-[500px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="gn-section">
        <div className="gn-container">
          <p className="gn-eyebrow">Service List</p>
          <h2 className="mt-2 text-3xl sm:text-4xl text-foreground font-display">Pick Your Service</h2>

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

      <section className="gn-section bg-transparent text-foreground">
        <div className="gn-container grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <p className="gn-eyebrow text-primary">About Glow Next</p>
            <h2 className="mt-2 text-4xl font-display leading-tight text-foreground">
              Beauty care that feels easy and personal
            </h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base leading-relaxed">
              Glow Next helps you discover trusted beauty professionals, book in minutes, and enjoy treatments that fit your routine and your comfort.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/about" className="gn-btn gn-btn-primary">
                About Us
              </Link>
              <Link to="/vendors" className="gn-btn gn-btn-outline">
                View Partner Salons
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="gn-card p-5 bg-secondary border border-border text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">Trusted</p>
              <p className="mt-3 font-display text-2xl text-foreground">Beauty experts</p>
              <p className="mt-2 text-xs text-muted-foreground">Verified professionals who care about your look and comfort.</p>
            </div>
            <div className="gn-card p-5 bg-secondary border border-border text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">Easy</p>
              <p className="mt-3 font-display text-2xl text-foreground">Booking</p>
              <p className="mt-2 text-xs text-muted-foreground">Simple scheduling that fits your day without the stress.</p>
            </div>
            <div className="gn-card p-5 bg-secondary border border-border text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">Flexible</p>
              <p className="mt-3 font-display text-2xl text-foreground">At home or salon</p>
              <p className="mt-2 text-xs text-muted-foreground">Choose the experience that works best for you.</p>
            </div>
            <div className="gn-card p-5 bg-secondary border border-border text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">Friendly</p>
              <p className="mt-3 font-display text-2xl text-foreground">Support</p>
              <p className="mt-2 text-xs text-muted-foreground">Helpful guidance from start to finish, whenever you need it.</p>
            </div>
          </div>
        </div>
      </section>

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
              body: "Flexible payment options, pay online digitally with Khalti or pay cash after treatment.",
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
