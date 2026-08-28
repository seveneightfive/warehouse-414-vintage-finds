import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ProductImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

type ProductImageData = {
  id: string;
  sku: string | null;
  featured_image_url: string | null;
  product_images: ProductImage[];
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — validated pre-compression

// ── Client-side image compression ────────────────────────────────────────
// Phone cameras routinely produce 5-15MB photos. Uploading those raw, one at
// a time, is what makes bulk uploads feel like they're "taking forever".
// We resize to a sane max dimension and re-encode as JPEG before upload,
// which typically cuts file size by 85-95% with no visible quality loss for
// product photography.
const MAX_DIMENSION = 2400; // px on the longest side — plenty for zoomed product shots
const JPEG_QUALITY = 0.82;
const UPLOAD_CONCURRENCY = 4; // parallel uploads in flight at once

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    // Animated GIFs would lose their animation if we ran them through canvas;
    // just pass those through untouched.
    if (file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help (e.g. already-small file) — keep original.
            resolve(file);
            return;
          }
          const newName = file.name.replace(/\.\w+$/, '') + '.jpg';
          resolve(new File([blob], newName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fall back to the original if it fails to decode
    };

    img.src = objectUrl;
  });
};

// Runs `worker` over `items` with at most `limit` running concurrently,
// instead of a plain sequential for-loop awaiting one upload at a time.
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
}

const SortableImage = ({ img, isFeatured, onSetFeatured, onDelete }: {
  img: ProductImage;
  isFeatured: boolean;
  onSetFeatured: (url: string) => void;
  onDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="relative group cursor-grab active:cursor-grabbing"
    >
      <img
        src={img.image_url}
        alt=""
        className={cn(
          'w-full aspect-square object-cover rounded-md',
          isFeatured ? 'border-2 border-primary' : 'border border-border',
        )}
        {...attributes}
        {...listeners}
      />
      {isFeatured && (
        <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
          Featured
        </span>
      )}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isFeatured && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSetFeatured(img.image_url);
            }}
            className="bg-accent text-accent-foreground rounded-full p-1"
            title="Set as featured"
          >
            <Star size={14} />
          </button>
        )}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(img.id);
          }}
          className="bg-destructive text-destructive-foreground rounded-full p-1"
          title="Delete image"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

interface ProductImageManagerProps {
  productId: string;
  /** Optional override; if not provided we'll fetch product to get SKU */
  sku?: string | null;
}

const ProductImageManager = ({ productId, sku: skuProp }: ProductImageManagerProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  // Drag-enter/leave fire on every child element, so we use a counter to
  // decide when we're truly outside the drop zone.
  const dragCounter = useRef(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: product, isLoading } = useQuery({
    queryKey: ['product-images', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, featured_image_url, product_images(id, image_url, sort_order)')
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data as ProductImageData;
    },
    enabled: !!productId,
  });

  const sku = skuProp ?? product?.sku ?? null;
  const images = (product?.product_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
    queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  /**
   * Persist a new image order and, if the lead image changed, also update
   * products.featured_image_url so it stays in sync. We do this explicitly
   * from the client rather than relying on a DB trigger.
   */
  const persistOrder = async (ordered: ProductImage[]) => {
    if (ordered.length === 0) return;

    const updates = await Promise.all(
      ordered.map((img, i) =>
        supabase.from('product_images').update({ sort_order: i }).eq('id', img.id),
      ),
    );
    const firstErr = updates.find((u) => u.error)?.error;
    if (firstErr) {
      toast.error('Failed to update order', { description: firstErr.message });
      return false;
    }

    const newFeaturedUrl = ordered[0].image_url;
    if (newFeaturedUrl !== product?.featured_image_url) {
      const { error: featErr } = await supabase
        .from('products')
        .update({ featured_image_url: newFeaturedUrl })
        .eq('id', productId);
      if (featErr) {
        toast.error('Failed to update featured image', { description: featErr.message });
        return false;
      }
    }

    return true;
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `${file.name}: not a supported image type`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: file is too large (max 25MB)`;
    }
    return null;
  };

  const uploadImages = async (files: FileList | File[]) => {
    if (!sku) {
      toast.error('Product must have a SKU before uploading images');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Not authenticated');
      return;
    }

    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;

    const startSort = images.length;
    const isFirstUpload = images.length === 0;
    let successCount = 0;

    // Reserve sort_order slots up front (by original selection order) so
    // uploading in parallel doesn't race on ordering.
    const tempIds = validFiles.map((f) => `${f.name}-${Date.now()}-${Math.random()}`);
    setUploadingFiles((prev) => [...prev, ...tempIds]);

    await runWithConcurrency(validFiles, UPLOAD_CONCURRENCY, async (file, i) => {
      const tempId = tempIds[i];
      try {
        const uploadFile = await compressImage(file);

        const fd = new FormData();
        fd.append('file', uploadFile);
        fd.append('productId', productId);
        fd.append('sku', sku);
        fd.append('sort_order', String(startSort + i));

        const res = await supabase.functions.invoke('upload-product-images', { body: fd });
        if (res.error) throw new Error(res.error.message);
        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Failed to upload ${file.name}: ${msg}`);
      } finally {
        setUploadingFiles((prev) => prev.filter((f) => f !== tempId));
      }
    });

    if (isFirstUpload && successCount > 0) {
      const { data: refreshed } = await supabase
        .from('product_images')
        .select('id, image_url, sort_order')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true })
        .limit(1);
      const first = refreshed?.[0];
      if (first) {
        await supabase
          .from('products')
          .update({ featured_image_url: first.image_url })
          .eq('id', productId);
      }
    }

    invalidate();

    if (successCount > 0) {
      toast.success(
        successCount === 1 ? 'Image uploaded' : `${successCount} images uploaded`,
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !product) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(images, oldIndex, newIndex);
    const ok = await persistOrder(reordered);
    if (ok) invalidate();
  };

  const deleteImage = async (imageId: string) => {
    if (!confirm('Delete this image? This cannot be undone.')) return;

    const wasFeatured = images.find((i) => i.id === imageId)?.image_url === product?.featured_image_url;

    const { error } = await supabase.from('product_images').delete().eq('id', imageId);
    if (error) {
      toast.error('Delete failed', { description: error.message });
      return;
    }

    if (wasFeatured) {
      const remaining = images.filter((i) => i.id !== imageId);
      const newFeaturedUrl = remaining[0]?.image_url ?? null;
      await supabase
        .from('products')
        .update({ featured_image_url: newFeaturedUrl })
        .eq('id', productId);
    }

    toast.success('Image deleted');
    invalidate();
  };

  const setFeaturedImage = async (imageUrl: string) => {
    if (!product) return;

    const idx = images.findIndex((img) => img.image_url === imageUrl);
    if (idx === -1) return;

    if (idx === 0) {
      if (product.featured_image_url !== imageUrl) {
        const { error } = await supabase
          .from('products')
          .update({ featured_image_url: imageUrl })
          .eq('id', productId);
        if (error) {
          toast.error('Failed to update featured image', { description: error.message });
          return;
        }
        toast.success('Featured image updated');
        invalidate();
      }
      return;
    }

    const reordered = arrayMove(images, idx, 0);
    const ok = await persistOrder(reordered);
    if (ok) {
      toast.success('Featured image updated');
      invalidate();
    }
  };

  // ── Native HTML5 drag-and-drop file upload ────────────────────────────────
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingFiles(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please drop image files only');
      return;
    }
    uploadImages(imageFiles);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      dragCounter.current += 1;
      setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingFiles(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Required for onDrop to fire.
    e.preventDefault();
    e.stopPropagation();
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading images…</p>;
  }

  if (!sku) {
    return (
      <p className="text-sm text-muted-foreground">
        This product needs a SKU before images can be uploaded.
      </p>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      className={cn(
        'space-y-4 relative rounded-md transition-colors',
        isDraggingFiles && 'ring-2 ring-primary ring-offset-2 bg-primary/5',
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadImages(e.target.files);
          }
          e.target.value = '';
        }}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} /> Upload Images
        </Button>
        <p className="text-xs text-muted-foreground">
          or drag and drop image files anywhere in this area
        </p>
      </div>

      {/* Drop overlay shown while dragging files over the manager. */}
      {isDraggingFiles && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none rounded-md bg-background/80 backdrop-blur-[1px]">
          <div className="text-center space-y-1">
            <Upload className="mx-auto text-primary" size={28} />
            <p className="text-sm font-medium text-foreground">Drop to upload</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF · up to 25MB each</p>
          </div>
        </div>
      )}

      {images.length === 0 && uploadingFiles.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
          <Upload className="mx-auto text-muted-foreground mb-2" size={24} />
          <p className="text-sm text-muted-foreground">
            No images yet. Click <span className="font-medium text-foreground">Upload Images</span> or drag files here.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {images.map((img) => (
                <SortableImage
                  key={img.id}
                  img={img}
                  isFeatured={product?.featured_image_url === img.image_url}
                  onSetFeatured={setFeaturedImage}
                  onDelete={deleteImage}
                />
              ))}
              {uploadingFiles.map((tempId) => (
                <div
                  key={tempId}
                  className="w-full aspect-square rounded-md border border-border flex items-center justify-center bg-muted"
                >
                  <Loader2 className="animate-spin text-muted-foreground" size={24} />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default ProductImageManager;
