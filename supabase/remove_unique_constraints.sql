-- Largo kufizimet unike (unique constraints) të vjetra
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_invoice_num_user_id_key;
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_invoice_num_user_id_key;

-- Nëse emrat e kufizimeve janë ndryshe, mund t'i gjejmë dhe t'i fshijmë me këtë bllok
DO $$
DECLARE
    sales_constraint_name text;
    purchases_constraint_name text;
BEGIN
    SELECT constraint_name INTO sales_constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'sales' AND constraint_type = 'UNIQUE';
    
    IF sales_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.sales DROP CONSTRAINT ' || sales_constraint_name;
    END IF;

    SELECT constraint_name INTO purchases_constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'purchases' AND constraint_type = 'UNIQUE';
    
    IF purchases_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.purchases DROP CONSTRAINT ' || purchases_constraint_name;
    END IF;
END $$;
