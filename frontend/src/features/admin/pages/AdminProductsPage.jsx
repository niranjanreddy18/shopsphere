/**
 * AdminProductsPage — list/create/edit/delete products.
 *
 * Uses local component state (not Redux) for its data — see the README's
 * "Admin Dashboard Architecture" section for why the Manage-* screens
 * intentionally don't go through the global store: this data is only ever
 * read/written from this one screen, so a Redux slice would just add
 * indirection without any cross-component state sharing to justify it.
 */

import { useEffect, useState } from "react";

import { adminBrandsApi, adminCategoriesApi, adminProductsApi } from "../../../api/adminApi";
import { productsApi } from "../../../api/productsApi";
import Button from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import toast from "react-hot-toast";

const EMPTY_PRODUCT = {
  name: "", description: "", short_description: "", category: "", brand: "",
  sku: "", price: "", discount_price: "", is_active: true, is_featured: false, weight_kg: "",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [status, setStatus] = useState("loading");
  const [formMode, setFormMode] = useState(null); // null | 'create' | product object being edited
  const [formData, setFormData] = useState(EMPTY_PRODUCT);
  const [search, setSearch] = useState("");

  const loadProducts = () => {
    setStatus("loading");
    adminProductsApi
      .list({ search: search || undefined, page_size: 50 })
      .then((data) => {
        setProducts(data.results);
        setStatus("succeeded");
      })
      .catch(() => setStatus("failed"));
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    adminCategoriesApi.list().then((data) => setCategories(data.results ?? data));
    adminBrandsApi.list().then((data) => setBrands(data.results ?? data));
  }, []);

  const openCreate = () => {
    setFormData(EMPTY_PRODUCT);
    setFormMode("create");
  };

  const openEdit = async (productSummary) => {
    // The list endpoint returns a lightweight shape (category_name/brand_name
    // strings, no `is_active`/`description`) — fetch the full detail
    // representation (nested category/brand objects, every writable field)
    // before populating the edit form.
    const product = await productsApi.detail(productSummary.slug);
    setFormData({
      name: product.name, description: product.description || "", short_description: product.short_description || "",
      category: product.category?.id || "", brand: product.brand?.id || "", sku: product.sku,
      price: product.price, discount_price: product.discount_price || "",
      is_active: product.is_active, is_featured: product.is_featured, weight_kg: product.weight_kg || "",
    });
    setFormMode(product);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, discount_price: formData.discount_price || null, brand: formData.brand || null };
    try {
      if (formMode === "create") {
        await adminProductsApi.create(payload);
        toast.success("Product created.");
      } else {
        await adminProductsApi.update(formMode.slug, payload);
        toast.success("Product updated.");
      }
      setFormMode(null);
      loadProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save product.");
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    await adminProductsApi.remove(product.slug);
    toast.success("Product deleted.");
    loadProducts();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Manage Products</h1>
        {!formMode && (
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="input-field !mb-0"
            />
            <Button onClick={openCreate}>Add Product</Button>
          </div>
        )}
      </div>

      {formMode && (
        <form onSubmit={handleSubmit} className="card mb-6 grid grid-cols-2 gap-3">
          <input
            required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Name" className="input-field col-span-2"
          />
          <input
            required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="SKU" className="input-field"
          />
          <input
            required type="number" step="0.01" value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="Price" className="input-field"
          />
          <input
            type="number" step="0.01" value={formData.discount_price}
            onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
            placeholder="Discount price (optional)" className="input-field"
          />
          <input
            type="number" step="0.01" value={formData.weight_kg}
            onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
            placeholder="Weight (kg, optional)" className="input-field"
          />
          <select
            required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="input-field"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className="input-field"
          >
            <option value="">No brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <textarea
            value={formData.short_description} onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            placeholder="Short description" className="input-field col-span-2" rows={2}
          />
          <textarea
            value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Full description" className="input-field col-span-2" rows={4}
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} />
            Featured
          </label>
          <div className="col-span-2 flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={() => setFormMode(null)}>Cancel</Button>
          </div>
        </form>
      )}

      {status === "loading" && <Skeleton className="h-64 w-full" />}

      {status === "succeeded" && !formMode && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">SKU</th>
                <th className="pb-2 font-medium">Price</th>
                <th className="pb-2 font-medium">Stock</th>
                <th className="pb-2 font-medium">Featured</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="py-2">{product.name}</td>
                  <td className="py-2 text-gray-500">{product.sku}</td>
                  <td className="py-2">${Number(product.effective_price).toFixed(2)}</td>
                  <td className="py-2">{product.is_in_stock ? "In stock" : "Out of stock"}</td>
                  <td className="py-2">{product.is_featured ? "Yes" : "—"}</td>
                  <td className="py-2">
                    <button onClick={() => openEdit(product)} className="mr-3 font-medium text-brand-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(product)} className="font-medium text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
