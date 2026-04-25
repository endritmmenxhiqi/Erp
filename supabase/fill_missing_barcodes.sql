-- Fill missing barcodes and selling prices for existing stock
-- This will generate a random 8-digit barcode for any item that doesn't have one

UPDATE public.stock
SET barcode = floor(random() * 90000000 + 10000000)::text
WHERE barcode IS NULL OR barcode = '';

-- You can also set a default selling price if it's missing (optional)
-- UPDATE public.stock SET selling_price = 0 WHERE selling_price IS NULL;
