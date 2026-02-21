export type Product = {
  id: string;
  name: string;
  slug: string | null;
  sku: string | null;
  short_description: string | null;
  long_description: string | null;
  price: number | null;
  status: 'available' | 'on_hold' | 'sold' | 'inventory';
  designer_id: string | null;
  maker_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  style_id: string | null;
  period_id: string | null;
  country_id: string | null;
  year_created: string | null;
  product_dimensions: string | null;
  box_dimensions: string | null;
  dimension_notes: string | null;
  materials: string | null;
  condition: string | null;
  tags: string[] | null;
  featured_image_url: string | null;
  notes: string | null;
  designer_attribution: string | null;
  maker_attribution: string | null;
  period_attribution: string | null;
  firstdibs_url: string | null;
  chairish_url: string | null;
  ebay_url: string | null;
  created_at: string;
  updated_at: string;
  designer?: Designer | null;
  maker?: Maker | null;
  category?: Category | null;
  style?: Style | null;
  period?: Period | null;
  country?: Country | null;
  product_images?: ProductImage[];
  product_colors?: ProductColor[];
};

export type Designer = {
  id: string;
  name: string;
  slug: string | null;
  about: string | null;
  created_at: string;
};

export type Maker = {
  id: string;
  name: string;
  slug: string | null;
  about: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
};

export type Subcategory = {
  id: string;
  name: string;
  category_id: string | null;
  created_at: string;
};

export type Style = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
};

export type Period = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
};

export type Country = {
  id: string;
  name: string;
  slug: string | null;
  code: string | null;
  created_at: string;
};

export type Color = {
  id: string;
  name: string;
  hex_value: string | null;
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export type ProductColor = {
  id: string;
  product_id: string;
  color_id: string;
  color?: Color;
};

export type ProductHold = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
};

export type Offer = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
};

export type PurchaseInquiry = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

export type UserRole = {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
};

export type Settings = {
  id: string;
  key: string;
  value: string;
  created_at: string;
};

export type Collection = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  cover_image: string | null;
  created_at: string;
};

export type CollectionProduct = {
  id: string;
  collection_id: string;
  product_id: string;
  sort_order: number;
  product?: Product;
};
