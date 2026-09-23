import { Link } from "react-router-dom";

export default function AboutUs() {
  const stats = [
    { label: "Verified Professionals", value: "500+" },
    { label: "Happy Clients", value: "10,000+" },
    { label: "Beauty Services", value: "150+" },
    { label: "Average Rating", value: "4.9 ★" },
  ];

  const values = [
    {
      icon: "fa-solid fa-gem",
      title: "Premium Quality",
      desc: "We partner exclusively with verified, experienced beauty professionals and top-tier salon studios.",
    },
    {
      icon: "fa-solid fa-sparkles",
      title: "Hygienic & Safe",
      desc: "All home-visit kits and salon setups follow strict sanitation and safety guidelines.",
    },
    {
      icon: "fa-solid fa-handshake",
      title: "Empowering Professionals",
      desc: "We provide independent beauty artists and local salon owners with digital tools to grow their business.",
    },
    {
      icon: "fa-solid fa-heart",
      title: "Client Satisfaction",
      desc: "Transparent reviews, upfront pricing, and dedicated customer care ensure a delightful experience.",
    },
  ];

  return (
    <div className="bg-background text-foreground py-12">
      <section className="gn-container text-center max-w-3xl mx-auto py-10">
        <span className="gn-eyebrow">Our Story &amp; Mission</span>
        <h1 className="mt-3 text-4xl sm:text-6xl font-display leading-tight">
          Redefining Beauty Care in <span className="text-primary">Nepal</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          Glow Next was founded to make luxury salon appointments and personalized home beauty services effortless, accessible, and transparent for everyone.
        </p>
      </section>

      <section className="gn-container py-8">
        <div className="gn-card bg-ink text-cream p-8 rounded-3xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-display text-4xl sm:text-5xl text-primary">{s.value}</p>
              <p className="mt-1 text-xs sm:text-sm text-cream/70 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="gn-section">
        <div className="gn-container grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <span className="gn-eyebrow">Why We Exist</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display">Bringing the Salon Experience Right to You</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Whether you need a quick haircut, a relaxing spa therapy session, bridal makeup, or routine skincare, finding trusted beauty experts shouldn't be stressful.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Glow Next connects clients directly with verified beauty salons and independent stylists. You get clear price tags and the choice between studio visits or doorstep appointments.
            </p>
            <div className="mt-6">
              <Link to="/services" className="gn-btn gn-btn-primary">
                Explore Our Services
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="gn-card p-6 bg-secondary/50 border border-border">
              <h3 className="font-display text-2xl text-primary">For Clients</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Book instantly, read authentic reviews, compare prices, and enjoy top-grade beauty services anywhere.
              </p>
            </div>
            <div className="gn-card p-6 bg-secondary/50 border border-border">
              <h3 className="font-display text-2xl text-primary">For Salons</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                List services, manage appointment calendars, receive online payments, and reach thousands of new clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="gn-section bg-secondary/20">
        <div className="gn-container">
          <div className="text-center max-w-2xl mx-auto">
            <span className="gn-eyebrow">Our Core Principles</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display">What Drives Glow Next</h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((val) => (
              <div key={val.title} className="gn-card p-6 bg-background border border-border">
                <div className="size-12 rounded-2xl bg-secondary text-primary flex items-center justify-center text-xl mb-4">
                  <i className={val.icon} />
                </div>
                <h4 className="font-bold text-lg">{val.title}</h4>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gn-container py-12">
        <div className="gn-card p-10 sm:p-14 bg-background border border-border rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-display">Are You a Salon Owner or Stylist?</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">
              Join Nepal's fastest-growing beauty network. List your studio, showcase your portfolio, and accept online bookings effortlessly.
            </p>
          </div>
          <Link to="/register" className="gn-btn gn-btn-primary whitespace-nowrap">
            Become a Partner
          </Link>
        </div>
      </section>
    </div>
  );
}
