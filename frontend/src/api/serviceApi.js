import { apiClient, backendMissing, buildQuery, normalizeList } from "./apiClient";

function normalizeService(service) {
  if (!service || typeof service !== "object") return service;
  return {
    ...service,
    vendor_name: service.vendor_name ?? service.vendor?.store_name,
    vendor_slug: service.vendor_slug ?? service.vendor?.slug,
  };
}

function normalizeServices(payload) {
  const normalized = normalizeList(payload);
  return {
    ...normalized,
    results: normalized.results.map(normalizeService),
  };
}

async function listServices(params = {}, signal) {
  const query = {
    search: params.search,
    location: params.location,
    category: params.category,
    service_type: params.service_type,
    min_price: params.min_price,
    max_price: params.max_price,
    min_rating: params.min_rating,
    ordering: params.ordering,
    page: params.page,
    page_size: params.page_size,
  };
  const payload = await apiClient.get(`/services/${buildQuery(query)}`, { auth: false, signal });
  return normalizeServices(payload);
}
async function getService(slug, signal) {
  return normalizeService(
    await apiClient.get(`/services/${encodeURIComponent(slug)}/`, { auth: false, signal }),
  );
}
async function listCategories(signal) {
  try {
    const payload = await apiClient.get("/categories/", {
      auth: false,
      signal,
    });
    return normalizeList(payload).results;
  } catch {
    return backendMissing("GET /api/categories/");
  }
}
async function createCategory(data) {
  try {
    return await apiClient.post("/categories/", data);
  } catch (error) {
    if (error?.status !== 404 && error?.status !== 0) throw error;
    return backendMissing("POST /api/categories/");
  }
}
const vendorServiceApi = {
  list: async () => {
    try {
      const payload = await apiClient.get("/vendor/services/");
      return normalizeList(payload).results;
    } catch (error) {
      if (error?.status !== 404 && error?.status !== 0) throw error;
      return backendMissing("GET /api/vendor/services/");
    }
  },
  create: async (data) => {
    try {
      return await apiClient.post("/vendor/services/", data);
    } catch (error) {
      if (error?.status !== 404 && error?.status !== 0) throw error;
      return backendMissing("POST /api/vendor/services/");
    }
  },
  update: async (sid, data) => {
    try {
      return await apiClient.patch(`/vendor/services/${sid}/`, data);
    } catch (error) {
      if (error?.status !== 404 && error?.status !== 0) throw error;
      return backendMissing(`PATCH /api/vendor/services/${sid}/`);
    }
  },
  remove: async (sid) => {
    try {
      await apiClient.delete(`/vendor/services/${sid}/`);
    } catch (error) {
      if (error?.status !== 404 && error?.status !== 0) throw error;
      return backendMissing(`DELETE /api/vendor/services/${sid}/`);
    }
  },
};
export {
  createCategory,
  getService,
  listCategories,
  listServices,
  vendorServiceApi,
};
