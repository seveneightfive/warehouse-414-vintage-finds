import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ProductImageManager from './ProductImageManager';

interface QuickUploadImagesModalProps {
  productId: string | null;
  productName?: string | null;
  sku?: string | null;
  open: boolean;
  onClose: () => void;
}

const QuickUploadImagesModal = ({
  productId,
  productName,
  sku,
  open,
  onClose,
}: QuickUploadImagesModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {productName ? `Images — ${productName}` : 'Manage images'}
          </DialogTitle>
          <DialogDescription>
            Upload, reorder, or delete images. Drag to reorder. The first image is featured.
          </DialogDescription>
        </DialogHeader>

        {productId && (
          <ProductImageManager productId={productId} sku={sku} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickUploadImagesModal;
