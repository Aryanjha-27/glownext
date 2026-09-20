import { apiClient, backendMissing, normalizeList } from "./apiClient";

function normalizeVendor(vendor) {
  if (!vendor || typeof vendor !== "object") return vendor;
  return {
    ...vendor,
    business_name: vendor.business_name ?? vendor.store_name,
    logo: vendor.logo ?? vendor.image,
    banner_image: vendor.banner_image ?? vendor.image,
  };
}

async function listVendors() {
  try {
    const payload = await apiClient.get("/vendors/", { auth: false });
    return normalizeList(payload).results.map(normalizeVendor);
  } catch {
    return backendMissing("GET /api/vendors/");
  }
}
async function getVendor(slug) {
  try {
    return normalizeVendor(await apiClient.get(`/vendors/${slug}/`, { auth: false }));
  } catch {
    return backendMissing(`GET /api/vendors/${slug}/`);
  }
}
async function getMyVendorProfile() {
  try {
    return await apiClient.get("/vendor/profile/");
  } catch {
    return backendMissing("GET /api/vendor/profile/");
  }
}
async function updateMyVendorProfile(data) {
  try {
    return await apiClient.patch("/vendor/profile/", data);
  } catch {
    return backendMissing("PATCH /api/vendor/profile/");
  }
}
async function getMyVendorEarnings() {
  try {
    return await apiClient.get("/vendor/earnings/");
  } catch (error) {
    if (error?.status !== 404 && error?.status !== 0) throw error;
    return backendMissing("GET /api/vendor/earnings/");
  }
}
async function requestVendorPayout(amount) {
  return await apiClient.post("/vendor/payouts/", { amount });
}
export { getMyVendorEarnings, getMyVendorProfile, getVendor, listVendors, requestVendorPayout, updateMyVendorProfile };
