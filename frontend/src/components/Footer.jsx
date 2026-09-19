import { Link } from "react-router-dom";

/**
 * Footer Component - Bottom footer for Glow Next
 * Beginner-friendly layout with organized site links, contact info, and social icons.
 */
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border bg-ink text-cream">
      <div className="gn-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand Information Column */}
        <div>
          <Link to="/" className="font-display text-3xl text-cream">
            Glow<span className="text-primary">Next</span>
          </Link>
          <p className="mt-3 text-sm text-cream/70 leading-relaxed">
            Your premier platform to discover and book verified beauty specialists &amp; salons. Enjoy home visits or in-store appointments for hair, skincare, spa, and bridal styling.
          </p>
          {/* Social Icons */}
          <div className="mt-5 flex gap-4 text-lg text-cream/75">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-primary transition-colors">
              <i className="fa-brands fa-instagram" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-primary transition-colors">
              <i className="fa-brands fa-facebook" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="hover:text-primary transition-colors">
              <i className="fa-brands fa-x-twitter" />
            </a>
            <a href="https://whatsapp.com" target="_blank" rel="noreferrer" aria-label="WhatsApp" className="hover:text-primary transition-colors">
              <i className="fa-brands fa-whatsapp" />
            </a>
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div>
          <p className="gn-eyebrow text-primary">Quick Links</p>
          <ul className="mt-4 space-y-2.5 text-sm text-cream/80">
            <li>
              <Link to="/" className="hover:text-cream transition-colors">Home</Link>
            </li>
            <li>
              <Link to="/services" className="hover:text-cream transition-colors">Beauty Services</Link>
            </li>
            <li>
              <Link to="/how-we-work" className="hover:text-cream transition-colors">How We Work</Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-cream transition-colors">About Us</Link>
            </li>
            <li>
              <Link to="/vendors" className="hover:text-cream transition-colors">Salons &amp; Studios</Link>
            </li>
          </ul>
        </div>

        {/* Account Links */}
        <div>
          <p className="gn-eyebrow text-primary">Client &amp; Account</p>
          <ul className="mt-4 space-y-2.5 text-sm text-cream/80">
            <li>
              <Link to="/dashboard" className="hover:text-cream transition-colors">User Dashboard</Link>
            </li>
            <li>
              <Link to="/bookings" className="hover:text-cream transition-colors">My Appointments</Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-cream transition-colors">Client Login</Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-cream transition-colors">Create Account</Link>
            </li>
          </ul>
        </div>

        {/* Contact Info Column */}
        <div>
          <p className="gn-eyebrow text-primary">Contact &amp; Support</p>
          <ul className="mt-4 space-y-3 text-sm text-cream/80">
            <li className="flex items-center gap-3">
              <i className="fa-solid fa-envelope text-primary" />
              <span>support@glownext.com</span>
            </li>
            <li className="flex items-center gap-3">
              <i className="fa-solid fa-phone text-primary" />
              <span>+977 980-0000000</span>
            </li>
            <li className="flex items-center gap-3">
              <i className="fa-solid fa-location-dot text-primary" />
              <span>Kathmandu, Nepal</span>
            </li>
            <li className="flex items-center gap-3">
              <i className="fa-solid fa-clock text-primary" />
              <span>Mon - Sun: 8:00 AM - 8:00 PM</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="gn-container border-t border-cream/10 py-6 text-center text-xs text-cream/60 md:flex md:justify-between">
        <p>&copy; {currentYear} Glow Next. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Book trusted beauty professionals in a few taps.</p>
      </div>
    </footer>
  );
}

export { Footer };
export default Footer;
