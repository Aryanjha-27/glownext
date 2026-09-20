import { apiClient, buildQuery, normalizeList } from "./apiClient";

export const disputeApi = {
  // Customer
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
    // If FormData is passed (for file upload support)
    if (formDataOrPayload instanceof FormData) {
      return await apiClient.postFormData("/disputes/", formDataOrPayload);
    }
    return await apiClient.post("/disputes/", formDataOrPayload);
  },

  sendMessage: async (disputeId, formDataOrPayload) => {
    if (formDataOrPayload instanceof FormData) {
      return await apiClient.postFormData(`/disputes/${disputeId}/messages/`, formDataOrPayload);
    }
    return await apiClient.post(`/disputes/${disputeId}/messages/`, formDataOrPayload);
  },

  // Vendor
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

  sendVendorMessage: async (disputeId, formDataOrPayload) => {
    if (formDataOrPayload instanceof FormData) {
      return await apiClient.postFormData(`/disputes/${disputeId}/messages/`, formDataOrPayload);
    }
    return await apiClient.post(`/disputes/${disputeId}/messages/`, formDataOrPayload);
  },

  // Vendor Transactions / Earnings breakdown
  getVendorTransactions: async () => {
    return await apiClient.get("/vendor/transactions/");
  },
};
