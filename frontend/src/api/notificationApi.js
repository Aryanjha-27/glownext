import { apiClient, backendMissing, normalizeList } from "./apiClient";
async function listNotifications() {
  try {
    const payload = await apiClient.get("/notifications/");
    return normalizeList(payload).results;
  } catch {
    return backendMissing("GET /api/notifications/");
  }
}
async function markNotificationRead(nid) {
  return apiClient.post(`/notifications/${nid}/`);
}
async function markAllNotificationsRead() {
  return apiClient.post("/notifications/");
}
async function getUnreadNotificationCount() {
  const notifications = await listNotifications();
  return notifications.filter((notification) => !notification.seen).length;
}
export { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, markNotificationRead };
