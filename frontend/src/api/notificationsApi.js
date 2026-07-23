/** Notifications API layer. */

import axiosClient from "./axiosClient";

export const notificationsApi = {
  list: () => axiosClient.get("/notifications/").then((res) => res.data),

  markRead: (id) => axiosClient.patch(`/notifications/${id}/read/`).then((res) => res.data),

  markAllRead: () => axiosClient.post("/notifications/mark-all-read/").then((res) => res.data),
};
