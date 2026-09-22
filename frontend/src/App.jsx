import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_SERVER_URL } from "@/api/apiClient";
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
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Bookings from "@/pages/Bookings";
import BookingDetail from "@/pages/BookingDetail";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import Reviews from "@/pages/Reviews";
import Addresses from "@/pages/Addresses";
import Disputes from "@/pages/Disputes";
import DisputeDetail from "@/pages/DisputeDetail";
import NotFound from "@/pages/NotFound";
import VendorDashboard from "@/pages/VendorDashboard";
import VendorServices from "@/pages/VendorServices";
import VendorBookings from "@/pages/VendorBookings";
import VendorProfile from "@/pages/VendorProfile";
import VendorEarnings from "@/pages/VendorEarnings";
import VendorDisputes from "@/pages/VendorDisputes";
import VendorDisputeDetail from "@/pages/VendorDisputeDetail";
import VendorLayout from "@/components/VendorLayout";

/**
 * Main Application Component - React + Vite
 * Clean, standard, and easy to maintain.
 */
export default function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}

function AppContent() {
  const { user, userType, loading, logout } = useAuth();
  const location = useLocation();
  const vendorPath = location.pathname === "/vendor" || location.pathname.startsWith("/vendor/");
  const authPath = location.pathname === "/login" || location.pathname === "/register";
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser);

  useEffect(() => {
    if (!loading && isAdmin) {
      void (async () => {
        await logout();
        window.location.assign(`${API_SERVER_URL || "http://127.0.0.1:8000"}/admin/`);
      })();
    }
  }, [isAdmin, loading, logout]);

  if (isAdmin) return null;

  if (!loading && userType === "Vendor" && !vendorPath && !authPath) {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {!vendorPath && userType !== "Vendor" ? <Navbar /> : null}
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

          {/* Auth Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Client Dashboard & Protected Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/:bid" element={<BookingDetail />} />
          <Route path="/disputes" element={<Disputes />} />
          <Route path="/disputes/:id" element={<DisputeDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/addresses" element={<Addresses />} />

          {/* Vendor dashboard */}
          <Route path="/vendor" element={<VendorLayout><VendorDashboard /></VendorLayout>} />
          <Route path="/vendor/dashboard" element={<VendorLayout><VendorDashboard /></VendorLayout>} />
          <Route path="/vendor/services" element={<VendorLayout><VendorServices /></VendorLayout>} />
          <Route path="/vendor/bookings" element={<VendorLayout><VendorBookings /></VendorLayout>} />
          <Route path="/vendor/disputes" element={<VendorLayout><VendorDisputes /></VendorLayout>} />
          <Route path="/vendor/disputes/:id" element={<VendorLayout><VendorDisputeDetail /></VendorLayout>} />
          <Route path="/vendor/profile" element={<VendorLayout><VendorProfile /></VendorLayout>} />
          <Route path="/vendor/earnings" element={<VendorLayout><VendorEarnings /></VendorLayout>} />
          <Route path="/vendor/notifications" element={<VendorLayout><Notifications /></VendorLayout>} />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
