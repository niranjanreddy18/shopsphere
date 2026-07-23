/**
 * ProductDetailsPage — full product view: image gallery (with hover
 * zoom), price, rating summary, quantity selector, add-to-cart/wishlist,
 * specifications, delivery/return info, a full reviews section (breakdown
 * + list + write-review form), related products, and recently-viewed.
 * Fetches both the product and its related products on mount/slug
 * change; the backend increments the product's view_count as a side effect
 * of the detail GET (see ProductService.increment_view_count on the
 * backend) so no separate "track a view" call is needed here — this page
 * separately records the view into the shopper's own browser-local
 * "recently viewed" history (see utils/recentlyViewed.js), which is an
 * unrelated, client-only concern from the backend's aggregate counter.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Heart } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../../app/store/hooks";
import { useAuth } from "../../../hooks/useAuth";
import { clearCurrentProduct, fetchProductDetail, fetchRelatedProducts } from "../productSlice";
import { addToCart } from "../../cart/cartSlice";
import { addToWishlist, removeFromWishlist } from "../../wishlist/wishlistSlice";
import { recordProductView } from "../../../utils/recentlyViewed";
import ProductImageGallery from "../components/ProductImageGallery";
import ProductCollectionSection from "../components/ProductCollectionSection";
import ProductReviewsSection from "../components/ProductReviewsSection";
import RecentlyViewedSection from "../components/RecentlyViewedSection";
import SpecificationsTable from "../components/SpecificationsTable";
import DeliveryReturnInfo from "../components/DeliveryReturnInfo";
import StarRating from "../../../components/ui/StarRating";
import Button from "../../../components/ui/Button";
import { ProductDetailSkeleton } from "../../../components/ui/Skeleton";
import ErrorMessage from "../../../components/common/ErrorMessage";

const TABS = [
  { id: "description", label: "Description" },
  { id: "specifications", label: "Specifications" },
  { id: "reviews", label: "Reviews" },
];

export default function ProductDetailsPage() {
  const { slug } = useParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { currentProduct: product, currentProductStatus: status, related } = useAppSelector((s) => s.products);
  const wishlistItems = useAppSelector((s) => s.wishlist.items);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    dispatch(fetchProductDetail(slug));
    dispatch(fetchRelatedProducts(slug));
    return () => dispatch(clearCurrentProduct());
  }, [dispatch, slug]);

  useEffect(() => {
    if (product) recordProductView(product);
  }, [product]);

  if (status === "loading" || status === "idle") return <ProductDetailSkeleton />;
  if (status === "failed" || !product) {
    return <ErrorMessage message="Product not found." onRetry={() => dispatch(fetchProductDetail(slug))} />;
  }

  const isWishlisted = wishlistItems.some((item) => item.product.id === product.id);
  const maxQuantity = product.inventory?.available_quantity ?? 0;

  const handleAddToCart = () => {
    dispatch(addToCart({ productId: product.id, quantity }));
  };

  const handleToggleWishlist = () => {
    if (!isAuthenticated) return;
    dispatch(isWishlisted ? removeFromWishlist(product.id) : addToWishlist(product.id));
  };

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-400" aria-label="Breadcrumb">
        <span>{product.category?.name}</span> <span className="mx-1">/</span> <span className="text-ink-600">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <ProductImageGallery images={product.images} />

        <div>
          {product.brand && <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand-600">{product.brand.name}</p>}
          <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">{product.name}</h1>

          {product.average_rating !== null && (
            <div className="mt-2">
              <StarRating rating={product.average_rating} reviewCount={product.review_count} size="sm" />
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold text-ink-950">${Number(product.effective_price).toFixed(2)}</span>
            {product.discount_percentage > 0 && (
              <>
                <span className="text-ink-400 line-through">${Number(product.price).toFixed(2)}</span>
                <span className="badge bg-red-50 text-red-600">-{product.discount_percentage}%</span>
              </>
            )}
          </div>

          <p className={`mt-3 text-sm font-medium ${product.is_in_stock ? "text-green-600" : "text-red-600"}`}>
            {product.is_in_stock ? `In stock (${maxQuantity} available)` : "Out of stock"}
          </p>

          {product.short_description && <p className="mt-4 text-ink-600">{product.short_description}</p>}

          {product.is_in_stock && (
            <div className="mt-5 flex items-center gap-3">
              <label htmlFor="quantity" className="text-sm font-medium text-ink-700">Qty</label>
              <select
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="input-field !mb-0 w-20"
              >
                {Array.from({ length: Math.min(maxQuantity, 10) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <Button onClick={handleAddToCart} disabled={!product.is_in_stock} className="flex-1 py-3">
              Add to cart
            </Button>
            {isAuthenticated && (
              <Button variant="secondary" onClick={handleToggleWishlist} aria-label="Toggle wishlist" className="px-4">
                <Heart className={`h-4 w-4 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
            )}
          </div>

          <div className="mt-6">
            <DeliveryReturnInfo price={product.effective_price} />
          </div>
        </div>
      </div>

      {/* --- Description / Specifications / Reviews tabs ------------------- */}
      <div className="mt-14">
        <div className="flex gap-6 border-b border-ink-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-400 hover:text-ink-700"
              }`}
            >
              {tab.label}
              {tab.id === "reviews" && product.review_count > 0 && ` (${product.review_count})`}
            </button>
          ))}
        </div>

        <div className="py-8">
          {activeTab === "description" && (
            <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {product.description || "No description available for this product."}
            </p>
          )}
          {activeTab === "specifications" && (
            <div className="max-w-xl">
              <SpecificationsTable product={product} />
            </div>
          )}
          {activeTab === "reviews" && (
            <ProductReviewsSection
              productId={product.id}
              averageRating={product.average_rating}
              reviewCount={product.review_count}
            />
          )}
        </div>
      </div>

      {related.items.length > 0 && (
        <ProductCollectionSection
          title="Related Products"
          viewAllHref={`/categories/${product.category.slug}`}
          products={related.items}
          status={related.status}
        />
      )}

      <RecentlyViewedSection excludeProductId={product.id} />
    </div>
  );
}
