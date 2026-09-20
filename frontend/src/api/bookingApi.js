import { apiClient, backendMissing, buildQuery, normalizeList, ApiError } from "./apiClient";
async function createBooking(payload) {
  try {
    const { notes, service, service_id, ...booking } = payload;
    const resolvedServiceId = service_id ?? service?.id ?? service;
    return await apiClient.post("/bookings/", {
      ...booking,
      service_id: resolvedServiceId,
      note: booking.note ?? notes ?? "",
      address: booking.address ?? "",
    });
  } catch (error) {
    if (missing(error)) return backendMissing("POST /api/bookings/");
    throw error;
  }
}
async function listBookings(params = {}) {
  const query = buildQuery({
    booking_status: params.status && params.status !== "All" ? params.status : void 0,
    page: params.page,
  });
  try {
    const payload = await apiClient.get(`/bookings/${query}`);
    return normalizeList(payload);
  } catch (error) {
    if (missing(error)) return backendMissing("GET /api/bookings/");
    throw error;
  }
}
async function getBooking(bid) {
  const list = await listBookings();
  const found = (list.results ?? []).find((booking) => String(booking.bid) === String(bid));
  if (!found) {
    throw new ApiError("Booking not found.", { status: 404, kind: "not_found" });
  }
  return found;
}
async function cancelBooking(bid) {
  try {
    return await apiClient.post(`/bookings/${bid}/cancel/`);
  } catch (error) {
    if (missing(error)) return backendMissing(`POST /api/bookings/${bid}/cancel/`);
    throw error;
  }
}
async function confirmCashPayment(bid) {
  return apiClient.post(`/bookings/${bid}/confirm-cash/`);
}
const vendorBookingApi = {
  list: async (status) => {
    const query = buildQuery({
      booking_status: status && status !== "All" ? status : void 0,
    });
    try {
      const payload = await apiClient.get(`/vendor/bookings/${query}`);
      return normalizeList(payload);
    } catch (error) {
      if (missing(error)) return backendMissing("GET /api/vendor/bookings/");
      throw error;
    }
  },
  confirm: async (bid) => {
    try {
      return await apiClient.post(`/vendor/bookings/${bid}/confirm/`);
    } catch (error) {
      if (missing(error)) return backendMissing(`POST /api/vendor/bookings/${bid}/confirm/`);
      throw error;
    }
  },
  decline: async (bid, decline_reason) => {
    try {
      return await apiClient.post(`/vendor/bookings/${bid}/decline/`, { decline_reason });
    } catch (error) {
      if (missing(error)) return backendMissing(`POST /api/vendor/bookings/${bid}/decline/`);
      throw error;
    }
  },
  complete: async (bid) => {
    try {
      return await apiClient.post(`/vendor/bookings/${bid}/complete/`);
    } catch (error) {
      if (missing(error)) return backendMissing(`POST /api/vendor/bookings/${bid}/complete/`);
      throw error;
    }
  },
  stats: async () => {
    try {
      return await apiClient.get("/vendor/dashboard/");
    } catch (error) {
      if (missing(error)) return backendMissing("GET /api/vendor/dashboard/");
      throw error;
    }
  },
  analytics: async (days = 30) => {
    try {
      return await apiClient.get(`/vendor/analytics/?days=${days}`);
    } catch (error) {
      if (missing(error)) return backendMissing("GET /api/vendor/analytics/");
      throw error;
    }
  },
  payouts: async () => {
    try {
      const payload = await apiClient.get("/vendor/payouts/");
      return normalizeList(payload).results;
    } catch (error) {
      if (missing(error)) return backendMissing("GET /api/vendor/payouts/");
      throw error;
    }
  },
};
function missing(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error.status === 404 || error.status === 0)
  );
}
export { cancelBooking, confirmCashPayment, createBooking, getBooking, listBookings, vendorBookingApi };
