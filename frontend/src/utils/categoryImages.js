/**
 * Category card background images.
 *
 * Maps category names to locally stored image files in public/images/categories/
 * Each category name has an exact corresponding image file.
 */

const CATEGORY_IMAGES = {
  "Smartphones": "Smartphones.jpg",
  "Laptops": "Laptops.jpg",
  "Audio Devices": "Audio Devices.jpg",
  "Computer Accessories": "Computer Accessories.jpg",
  "Men's Fashion": "Men's Fashion.jpg",
  "Women's Fashion": "Women's Fashion.jpg",
  "Footwear": "Footwear.jpg",
  "Home & Kitchen": "Home & Kitchen.jpg",
  "Beauty & Personal Care": "Beauty & Personal Care.jpg",
  "Bags & Travel": "Bags & Travel.jpg",
};

export function getCategoryImageUrl(categoryName) {
  const imageName = CATEGORY_IMAGES[categoryName] || "Smartphones.jpg";
  return `/images/categories/${imageName}`;
}
