'use client'
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    ;(async () => {
      const { data } = await getSessionUser();
      setUser(data);
    })();
  }, []);

  if (!user) redirect("/auth/signin");
  if (user.role !== "admin") redirect("/");

  const supabase = createClient();
  const [tab, setTab] = useState("all"); // all | active | low_stock | archived
  const [products, setProducts] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Fetch products based on tab
  useEffect(() => {
    fetchProducts();
  }, [tab]);

  async function fetchProducts() {
    let query = supabase.from("products").select("*");

    if (tab === "active") {
      query = query.eq("is_active", true);
    } else if (tab === "low_stock") {
      query = query.gt("stock", 0).eq("is_active", true);
    } else if (tab === "archived") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query.order("sort_order", { ascending: true });

    if (error) console.error("Error fetching products:", error);
    setProducts(data || []);
  }

  // Handle image upload
  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImageFile(file);

      // Show preview
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    []
  );

  const removeImage = useCallback(() => {
    setImagePreview(null);
    setImageFile(null);
  }, []);

  const handleSave = useCallback(
    async (product: any) => {
      let imageUrl = product.image;

      if (imageFile) {
        const { data: { path } } = await supabase.storage
          .from("product-images")
          .upload(`${product.id}.png`, imageFile, {
            cacheControl: "max-age=31536000",
          });

        const { data: { publicUrl } } = await supabase.storage
          .from("product-images")
          .getPublicUrl(path!);

        imageUrl = publicUrl;
      }

      if (product.id) {
        // Update existing
        await supabase
          .from("products")
          .update({
            name: product.name,
            tagline: product.tagline,
            description: product.description,
            category: product.category,
            price_cents: product.price_cents,
            compare_at_cents: product.compare_at_cents,
            emoji: product.emoji,
            gradient: product.gradient,
            rating: product.rating,
            review_count: product.review_count,
            stock: product.stock,
            is_active: product.is_active,
            featured: product.featured,
            updated_at: new Date().toISOString(),
            image_url: imageUrl,
          })
          .eq("id", product.id);
      } else {
        // Create new
        await supabase.from("products").insert({
          name: product.name,
          tagline: product.tagline,
          description: product.description,
          category: product.category,
          price_cents: product.price_cents,
          compare_at_cents: product.compare_at_cents,
          emoji: product.emoji,
          gradient: product.gradient,
          rating: product.rating ?? 0,
          review_count: 0,
          stock: product.stock ?? 0,
          is_active: product.is_active ?? true,
          featured: product.featured ?? false,
          sort_order: product.sort_order ?? 0,
          created_at: new Date().toISOString(),
          image_url: imageUrl,
        });
      }

      setEditingProduct(null);
      setImagePreview(null);
      setImageFile(null);
      fetchProducts();
    },
    [supabase]
  );

  const handleDelete = useCallback(
    async (productId: string) => {
      await supabase.from("products").update({ is_active: false }).eq("id", productId);
      fetchProducts();
    },
    [supabase]
  );

  // Initial fetch
  ;(async () => {
    await fetchProducts();
  })();

  // Tabs
  ["All", "Active", "Low Stock", "Archived"].map((label, i) => {
    const status = ["all", "active", "low_stock", "archived"][i];
    return (
      <button
        key={label}
        onClick={() => setTab(status)}
        className={`px-4 py-2 rounded text-sm font-medium ${
          tab === status
            ? "bg-gradient-to-r from-iris to-acid text-white"
            : "border border-ink/50 text-ink/70 hover:text-ink"
        }`}
      >
        {label}
      </button>
    );
  })

  // ... rest of component
  return (
    <main className="container-cc pb-20 pt-8">
      <nav className="text-xs font-bold text-ink/45" aria-label="Breadcrumb">
        <Link href="/admin" className="transition hover:text-ink">Admin</Link>{" "}
        <span className="mx-1.5">/</span> <span className="text-ink">Products</span>
      </nav>

      <div className="mt-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {"All", "Active", "Low Stock", "Archived"}.map((label, i) => {
            const status = ["all", "active", "low_stock", "archived"][i];
            return (
              <button
                key={label}
                onClick={() => setTab(status)}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  tab === status
                    ? "bg-gradient-to-r from-iris to-acid text-white"
                    : "border border-ink/50 text-ink/70 hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-[26x] overflow-hidden shadow-soft">
          {products.length === 0 ? (
            <p className="text-ink/60 pt-12 text-center">No products found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-ink/60 border-b border-ink/8">
                    <th>Image</th>
                    <th style={{ width: "25%" }}>Name</th>
                    <th style={{ width: "15%" }}>Category</th>
                    <th style={{ width: "12%" }}>Price</th>
                    <th style={{ width: "10%" }}>Stock</th>
                    <th style={{ width: "15%" }}>Featured</th>
                    <th style={{ width: "15%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const statusClass = p.is_active
                      ? "bg-green-100 text-green-900"
                      : "bg-gray-300 text-gray-500";

                    return (
                      <tr key={p.id} className="border-b border-ink/5">
                        <td>
                          <img
                            src={p.image_url || "/assets/img/placeholder-product.jpg"}
                            alt={p.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        </td>
                        <td className="font-bold text-ink">{p.name}</td>
                        <td>{p.category || "—"}</td>
                        <td>{money(p.price_cents)}</td>
                        <td>
                          {p.stock > 0 ? (
                            <span className="text-ink">In stock</span>
                          ) : (
                            <span className="text-red-600">Out of stock</span>
                          )}
                        </td>
                        <td>
                          {p.featured ? (
                            <span className="text-acid font-bold">Yes</span>
                          ) : (
                            <span className="text-ink/40">No</span>
                          )}
                        </td>
                        <td className="flex gap-2">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="btn-outline btn-xs"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="btn-xs text-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Product Form Modal */}
        {editingProduct && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur z-50 flex items-center justify-center"
          >
            <div
              className="bg-white rounded-[26x] p-6 max-w-md w-full shadow-soft"
              style={{ maxWidth: "90%" }}
            >
              <h2 className="font-display text-2xl font-extrabold mb-4">
                {editingProduct.id ? "Edit Product" : "Add Product"}
              </h2>

              <form
                onSubmit={
                  // eslint-disable-next-line react/jsx-no-bind
                  (e: React.FormEvent) => {
                    e.preventDefault();
                    // In a real app, would handle form data
                    const formData = new FormData(e.target as HTMLFormElement);
                    const productData = {
                      name: formData.get("name") as string,
                      tagline: formData.get("tagline") as string,
                      description: formData.get("description") as string,
                      category: formData.get("category") as string,
                      price_cents: parseInt(formData.get("price_cents") as string),
                      compare_at_cents:
                        formData.get("compare_at_cents") !== ""
                          ? parseInt(formData.get("compare_at_cents") as string)
                          : undefined,
                      emoji: formData.get("emoji") as string,
                      gradient: formData.get("gradient") as string,
                      rating: parseInt(formData.get("rating") as string) || 0,
                      stock: parseInt(formData.get("stock") as string) || 0,
                      is_active: formData.get("is_active") === "on",
                      featured: formData.get("featured") === "on",
                      sort_order: parseInt(formData.get("sort_order") as string) || 0,
                    };
                    handleSave(productData);
                  }
                }
                className="space-y-4"
              >
                <input
                  type="hidden"
                  name="id"
                  value={editingProduct?.id || ""}
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Name *"
                  value={editingProduct?.name || ""}
                  required
                  className="input"
                />
                <input
                  type="text"
                  name="tagline"
                  placeholder="Tagline"
                  value={editingProduct?.tagline || ""}
                  className="input"
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  rows={3}
                  value={editingProduct?.description || ""}
                  className="input"
                ></textarea>
                <input
                  type="text"
                  name="category"
                  placeholder="Category"
                  value={editingProduct?.category || ""}
                  className="input"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    name="price_cents"
                    placeholder="Price (cents) *"
                    min={0}
                    value={editingProduct?.price_cents || ""}
                    required
                    className="input"
                  />
                  <input
                    type="number"
                    name="compare_at_cents"
                    placeholder="Compare at (cents)"
                    min={0}
                    value={editingProduct?.compare_at_cents ?? ""}
                    className="input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="emoji"
                    placeholder="Emoji *"
                    value={editingProduct?.emoji || "🎁"}
                    className="input"
                  />
                  <input
                    type="text"
                    name="gradient"
                    placeholder="Gradient (hex, e.g. #D6FF3E)"
                    value={editingProduct?.gradient || "#D6FF3E"}
                    className="input"
                  />
                </div>
                <div>
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={editingProduct?.is_active !== false}
                      className="rounded border"
                    />
                    Active
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="featured"
                      checked={editingProduct?.featured}
                      className="rounded border"
                    />
                    Featured
                  </label>
                </div>
                <div>
                  <label>
                    Image upload:
                    <input
                      type="file"
                      name="productImage"
                      onChange={handleImageChange}
                      className="my-2 cursor-pointer"
                    />
                  </label>
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="h-24 w-24 object-cover rounded"
                      />
                      <button
                        onClick={removeImage}
                        className="mt-1 text-red-600 text-xs hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-iris to-acid text-white rounded-[26x]">
                    Save Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 px-4 py-2 border border-ink/50 rounded-[26x] text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}