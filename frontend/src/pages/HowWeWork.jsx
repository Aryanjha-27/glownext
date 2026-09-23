import { Link } from "react-router-dom";

export default function HowWeWork() {
  const steps = [
    {
      number: "01",
      icon: "fa-solid fa-magnifying-glass",
      title: "Discover & Choose Services",
      description:
        "Browse our extensive catalog of beauty treatments — hair styling, skincare, spa, makeup, nails, and bridal packages. Compare verified reviews and clear prices.",
    },
    {
      number: "02",
      icon: "fa-solid fa-calendar-check",
      title: "Select Time & Location",
      description:
        "Pick between a home visit by a top specialist or an in-salon appointment. Choose your preferred date, time, and address in seconds.",
    },
    {
      number: "03",
      icon: "fa-solid fa-sparkles",
      title: "Enjoy Your Beauty Treatment",
      description:
        "Relax as your verified beauty professional arrives or welcome you at the salon. Pay conveniently online with Khalti or via cash post-service.",
    },
  ];

  const benefits = [
    {
      icon: "fa-solid fa-user-shield",
      title: "100% Verified Specialists",
      text: "Every artist and studio undergoes identity, skill, and hygiene background checks.",
    },
    {
      icon: "fa-solid fa-hand-holding-dollar",
      title: "Transparent & Upfront Pricing",
      text: "No hidden fees. You see exact prices before confirming your appointment.",
    },
    {
      icon: "fa-solid fa-clock-rotate-left",
      title: "Flexible Scheduling & Reminders",
      text: "Reschedule or cancel easily. Get instant SMS & email notifications.",
    },
    {
      icon: "fa-solid fa-headset",
      title: "Dedicated Customer Support",
      text: "Our team is here 7 days a week to help with questions or custom bookings.",
    },
  ];

  const faqs = [
    {
      q: "Can I request a beauty service at my home?",
      a: "Yes! Many of our verified specialists offer doorstep home visits with all necessary professional tools and hygienic supplies.",
    },
    {
      q: "How do I pay for my appointment?",
      a: "You can pay securely online using Khalti or choose cash-on-service after your treatment is completed.",
    },
    {
      q: "What if I need to cancel or reschedule?",
      a: "You can manage your bookings anytime directly from your User Dashboard under 'My Bookings'.",
    },
    {
      q: "How do I become a beauty vendor or salon partner?",
      a: "Simply click 'Get Started' and register as a Vendor. Our admin team will review your profile within 24 hours.",
    },
  ];

  return (
    <div className="bg-background text-foreground py-12">
      <section className="gn-container text-center max-w-3xl mx-auto py-10">
        <span className="gn-eyebrow">Seamless & Simple</span>
        <h1 className="mt-3 text-4xl sm:text-6xl font-display leading-tight">
          How <span className="text-primary">Glow Next</span> Works
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Booking salon quality treatments has never been easier. Learn how our 3-step system connects you with Nepal's best beauty professionals.
        </p>
      </section>

      <section className="gn-container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="gn-card p-8 relative flex flex-col justify-between hover:shadow-lg transition-shadow border border-border"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-display text-primary">{step.number}</span>
                  <div className="size-12 rounded-2xl bg-secondary flex items-center justify-center text-primary text-xl">
                    <i className={step.icon} />
                  </div>
                </div>
                <h3 className="mt-6 text-2xl font-bold">{step.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="gn-section bg-secondary/30 my-12">
        <div className="gn-container">
          <div className="text-center max-w-2xl mx-auto">
            <span className="gn-eyebrow">Why Choose Us</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display">Built for Your Comfort &amp; Convenience</h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title} className="gn-card p-6 bg-background">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg mb-4">
                  <i className={b.icon} />
                </div>
                <h4 className="font-bold text-lg">{b.title}</h4>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gn-container py-12 max-w-4xl mx-auto">
        <div className="text-center">
          <span className="gn-eyebrow">Got Questions?</span>
          <h2 className="mt-2 text-3xl font-display">Frequently Asked Questions</h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="gn-card p-6 border border-border">
              <h4 className="font-bold text-base text-foreground flex items-start gap-2">
                <i className="fa-solid fa-circle-question text-primary mt-1" />
                <span>{faq.q}</span>
              </h4>
              <p className="mt-2 text-sm text-muted-foreground pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="gn-container py-12">
        <div className="gn-card bg-ink text-cream p-10 sm:p-14 text-center rounded-3xl relative overflow-hidden">
          <h2 className="text-3xl sm:text-5xl font-display">Ready for Your Next Glow Up?</h2>
          <p className="mt-4 text-cream/80 max-w-xl mx-auto text-sm sm:text-base">
            Explore hundreds of verified beauty treatments near you or book a doorstep home visit today.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Link to="/services" className="gn-btn gn-btn-primary">
              Browse Services
            </Link>
            <Link to="/vendors" className="gn-btn gn-btn-cream">
              Explore Salons
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
