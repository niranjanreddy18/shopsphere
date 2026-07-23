/**
 * AdminCategoriesPage — list/create/edit/delete product categories.
 * See AdminProductsPage's docstring for why this uses local state instead
 * of a Redux slice.
 */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { adminCategoriesApi } from "../../../api/adminApi";
import Button from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";

const EMPTY = { name: "", description: "", parent: "", is_active: true, display_order: 0 };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [formMode, setFormMode] = useState(null);
  const [formData, setFormData] = useState(EMPTY);

  const load = () => {
    setStatus("loading");
    adminCategoriesApi
      .list()
      .then((data) => {
        setCategories(data.results ?? data);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(load, []);

  const openEdit = (category) => {
    setFormData({
      name: category.name, description: category.description || "", parent: category.parent || "",
      is_active: category.is_active, display_order: category.display_order,
    });
    setFormMode(category);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, parent: formData.parent || null };
    try {
      if (formMode === "create") await adminCategoriesApi.create(payload);
      else await adminCategoriesApi.update(formMode.slug, payload);
      toast.success("Category saved.");
      setFormMode(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save category.");
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    try {
      await adminCategoriesApi.remove(category.slug);
      toast.success("Category deleted.");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Cannot delete a category that still has products.");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Manage Categories</h1>
        {!formMode && <Button onClick={() => { setFormData(EMPTY); setFormMode("create"); }}>Add Category</Button>}
      </div>

      {formMode && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
          <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Name" className="input-field" />
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description" className="input-field" rows={2} />
          <select value={formData.parent} onChange={(e) => setFormData({ ...formData, parent: e.target.value })} className="input-field">
            <option value="">No parent (top-level category)</option>
            {categories.filter((c) => c.id !== formMode?.id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{category.name}</p>
                <p className="text-xs text-gray-500">{category.product_count} product(s)</p>
              </div>
              <div className="text-sm">
                <button onClick={() => openEdit(category)} className="mr-3 font-medium text-brand-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(category)} className="font-medium text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
