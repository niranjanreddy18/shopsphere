/** AdminCouponsPage — list/create/edit/delete coupons. */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { adminCouponsApi } from "../../../api/adminApi";
import Button from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";

const EMPTY = {
  code: "", description: "", discount_type: "PERCENTAGE", discount_value: "",
  max_discount_amount: "", min_order_amount: "0", valid_from: "", valid_until: "",
  usage_limit: "", usage_limit_per_user: 1, is_active: true,
};

function toDatetimeLocal(isoString) {
  return isoString ? isoString.slice(0, 16) : "";
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [status, setStatus] = useState("loading");
  const [formMode, setFormMode] = useState(null);
  const [formData, setFormData] = useState(EMPTY);

  const load = () => {
    setStatus("loading");
    adminCouponsApi
      .list()
      .then((data) => {
        setCoupons(data.results ?? data);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(load, []);

  const openEdit = (coupon) => {
    setFormData({
      code: coupon.code, description: coupon.description || "", discount_type: coupon.discount_type,
      discount_value: coupon.discount_value, max_discount_amount: coupon.max_discount_amount || "",
      min_order_amount: coupon.min_order_amount, valid_from: toDatetimeLocal(coupon.valid_from),
      valid_until: toDatetimeLocal(coupon.valid_until), usage_limit: coupon.usage_limit || "",
      usage_limit_per_user: coupon.usage_limit_per_user, is_active: coupon.is_active,
    });
    setFormMode(coupon);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      max_discount_amount: formData.max_discount_amount || null,
      usage_limit: formData.usage_limit || null,
    };
    try {
      if (formMode === "create") await adminCouponsApi.create(payload);
      else await adminCouponsApi.update(formMode.id, payload);
      toast.success("Coupon saved.");
      setFormMode(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save coupon.");
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"?`)) return;
    await adminCouponsApi.remove(coupon.id);
    toast.success("Coupon deleted.");
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Manage Coupons</h1>
        {!formMode && <Button onClick={() => { setFormData(EMPTY); setFormMode("create"); }}>Add Coupon</Button>}
      </div>

      {formMode && (
        <form onSubmit={handleSubmit} className="card mb-6 grid grid-cols-2 gap-3">
          <input required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="Code" className="input-field" />
          <select value={formData.discount_type} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })} className="input-field">
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed Amount</option>
          </select>
          <input required type="number" step="0.01" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} placeholder="Discount value" className="input-field" />
          <input type="number" step="0.01" value={formData.max_discount_amount} onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })} placeholder="Max discount (% coupons only)" className="input-field" />
          <input type="number" step="0.01" value={formData.min_order_amount} onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })} placeholder="Min order amount" className="input-field" />
          <input type="number" value={formData.usage_limit_per_user} onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value })} placeholder="Usage limit per user" className="input-field" />
          <input type="number" value={formData.usage_limit} onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })} placeholder="Total usage limit (optional)" className="input-field" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
            Active
          </label>
          <label className="text-xs text-gray-500">
            Valid from
            <input required type="datetime-local" value={formData.valid_from} onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} className="input-field" />
          </label>
          <label className="text-xs text-gray-500">
            Valid until
            <input required type="datetime-local" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} className="input-field" />
          </label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" className="input-field col-span-2" rows={2} />
          <div className="col-span-2 flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={() => setFormMode(null)}>Cancel</Button>
          </div>
        </form>
      )}

      {status === "loading" && <Skeleton className="h-48 w-full" />}

      {status === "succeeded" && !formMode && (
        <div className="card divide-y divide-gray-50">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{coupon.code}</p>
                <p className="text-xs text-gray-500">
                  {coupon.discount_type === "PERCENTAGE" ? `${coupon.discount_value}% off` : `$${coupon.discount_value} off`}
                  {" · "}{coupon.times_used} used
                </p>
              </div>
              <div className="text-sm">
                <button onClick={() => openEdit(coupon)} className="mr-3 font-medium text-brand-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(coupon)} className="font-medium text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
