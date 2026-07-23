/** AdminBrandsPage — list/create/edit/delete brands. Same pattern as AdminCategoriesPage. */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { adminBrandsApi } from "../../../api/adminApi";
import Button from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";

const EMPTY = { name: "", description: "", is_active: true };

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [status, setStatus] = useState("loading");
  const [formMode, setFormMode] = useState(null);
  const [formData, setFormData] = useState(EMPTY);

  const load = () => {
    setStatus("loading");
    adminBrandsApi
      .list()
      .then((data) => {
        setBrands(data.results ?? data);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formMode === "create") await adminBrandsApi.create(formData);
      else await adminBrandsApi.update(formMode.slug, formData);
      toast.success("Brand saved.");
      setFormMode(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save brand.");
    }
  };

  const handleDelete = async (brand) => {
    if (!window.confirm(`Delete "${brand.name}"?`)) return;
    await adminBrandsApi.remove(brand.slug);
    toast.success("Brand deleted.");
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Manage Brands</h1>
        {!formMode && <Button onClick={() => { setFormData(EMPTY); setFormMode("create"); }}>Add Brand</Button>}
      </div>

      {formMode && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
          <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Name" className="input-field" />
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" className="input-field" rows={2} />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={() => setFormMode(null)}>Cancel</Button>
          </div>
        </form>
      )}

      {status === "loading" && <Skeleton className="h-48 w-full" />}

      {status === "succeeded" && !formMode && (
        <div className="card divide-y divide-gray-50">
          {brands.map((brand) => (
            <div key={brand.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-gray-900">{brand.name}</p>
              <div className="text-sm">
                <button onClick={() => { setFormData({ name: brand.name, description: brand.description || "", is_active: brand.is_active }); setFormMode(brand); }} className="mr-3 font-medium text-brand-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(brand)} className="font-medium text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
