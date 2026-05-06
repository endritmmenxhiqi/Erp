-- ============================================================
-- Gjenero barkode EAN-13 automatikisht për produktet pa barkod
-- Ekzekuto këtë te: Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE OR REPLACE FUNCTION generate_ean13() RETURNS text AS $$
DECLARE
  digits int[];
  checksum int := 0;
  i int;
  result text := '';
BEGIN
  -- Gjenero 12 shifra të rastit
  FOR i IN 1..12 LOOP
    digits[i] := floor(random() * 10)::int;
  END LOOP;

  -- Llogarit checksum EAN-13
  FOR i IN 1..12 LOOP
    IF i % 2 = 0 THEN
      checksum := checksum + digits[i] * 3;
    ELSE
      checksum := checksum + digits[i];
    END IF;
  END LOOP;
  checksum := (10 - (checksum % 10)) % 10;

  -- Ngjit shifrat
  FOR i IN 1..12 LOOP
    result := result || digits[i]::text;
  END LOOP;
  result := result || checksum::text;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Përditëso të gjitha produktet pa barkod
UPDATE public.stock
SET barcode = generate_ean13()
WHERE barcode IS NULL OR barcode = '';

-- Pastro funksionin ndihmës
DROP FUNCTION IF EXISTS generate_ean13();

-- Shiko rezultatin
SELECT id, item_name, barcode FROM public.stock ORDER BY item_name;


-- You can also set a default selling price if it's missing (optional)
-- UPDATE public.stock SET selling_price = 0 WHERE selling_price IS NULL;
