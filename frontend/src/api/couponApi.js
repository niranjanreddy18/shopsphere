/** Coupon API layer. */

import axiosClient from "./axiosClient";

export const couponApi = {
  validate: (code, subtotal) =>
    axiosClient.post("/coupons/validate/", { code, subtotal }).then((res) => res.data),
};
