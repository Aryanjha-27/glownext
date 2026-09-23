import { apiClient, buildQuery, normalizeList } from "./apiClient";

export const disputeApi = {
  listDisputes: async (params = {}) => {
    const query = buildQuery({
      status: params.status && params.status !== "All" ? params.status : undefined,
      page: params.page,
    });
    const payload = await apiClient.get(`/disputes/${query}`);
    return normalizeList(payload);
  },

  getDispute: async (disputeId) => {
    return await apiClient.get(`/disputes/${disputeId}/`);
  },

  createDispute: async (formDataOrPayload) => {
    if (formDataOrPayload instanceof FormData) {
      return await apiClient.postFormData("/disputes/", formDataOrPayload);
    }
    return await apiClient.post("/disputes/", formDataOrPayload);
  },

  listVendorDisputes: async (params = {}) => {
    const query = buildQuery({
      status: params.status && params.status !== "All" ? params.status : undefined,
      page: params.page,
    });
    const payload = await apiClient.get(`/vendor/disputes/${query}`);
    return normalizeList(payload);
  },

  getVendorDispute: async (disputeId) => {
    return await apiClient.get(`/vendor/disputes/${disputeId}/`);
  },

  vendorRespond: async (disputeId, payload) => {
    return await apiClient.post(`/vendor/disputes/${disputeId}/respond/`, payload);
  },

};
