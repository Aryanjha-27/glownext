import { Routes, Route } from "react-router-dom";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Pages
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import ServiceDetail from "@/pages/ServiceDetail";
import BookService from "@/pages/BookService";
import BookingSuccess from "@/pages/BookingSuccess";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import Salons from "@/pages/Salons";
import SalonDetail from "@/pages/SalonDetail";
import AboutUs from "@/pages/AboutUs";
import HowWeWork from "@/pages/HowWeWork";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Bookings from "@/pages/Bookings";
import BookingDetail from "@/pages/BookingDetail";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import Reviews from "@/pages/Reviews";
import Addresses from "@/pages/Addresses";
import NotFound from "@/pages/NotFound";
import VendorDashboard from "@/pages/VendorDashboard";
import VendorServices from "@/pages/VendorServices";
import VendorBookings from "@/pages/VendorBookings";
import VendorProfile from "@/pages/VendorProfile";
import VendorEarnings from "@/pages/VendorEarnings";

/**
 * Main Application Component - React + Vite
 * Clean, standard, and easy to maintain.
 */
export default function App() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/services/:slug/book" element={<BookService />} />
            <Route path="/booking/:slug" element={<BookService />} />
            <Route path="/booking/success" element={<BookingSuccess />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />

            {/* Salons / Vendors */}
            <Route path="/vendors" element={<Salons />} />
            <Route path="/vendors/:slug" element={<SalonDetail />} />
            <Route path="/salons" element={<Salons />} />
            <Route path="/salons/:slug" element={<SalonDetail />} />

            {/* Informational Pages */}
            <Route path="/about" element={<AboutUs />} />
            <Route path="/how-we-work" element={<HowWeWork />} />

            {/* Auth Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Client Dashboard & Protected Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/bookings/:bid" element={<BookingDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/addresses" element={<Addresses />} />

            {/* Vendor dashboard */}
            <Route path="/vendor" element={<VendorDashboard />} />
            <Route path="/vendor/services" element={<VendorServices />} />
            <Route path="/vendor/bookings" element={<VendorBookings />} />
            <Route path="/vendor/profile" element={<VendorProfile />} />
            <Route path="/vendor/earnings" element={<VendorEarnings />} />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Providers>
  );
}
