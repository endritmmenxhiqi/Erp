import { createClient } from "@/utils/supabase/client"

/**
 * Service to handle stock-related operations across the system.
 * Centralizing this logic ensures consistency and simplifies the components.
 */
export const StockService = {
  /**
   * Updates the stock for a specific item atomically using a Supabase RPC.
   * 
   * @param itemName Name of the item to update
   * @param quantityChange The amount to change (positive for additions, negative for consumption)
   * @param unit The unit of measurement
   * @param userId The ID of the user owning the stock
   */
  async updateStock(itemName: string, quantityChange: number, unit: string, userId: string, barcode?: string, sellingPrice?: number) {
    const supabase = createClient()
    
    // We use the RPC 'handle_stock_update' which we defined in SQL.
    // This is atomic and prevents race conditions.
    const { error } = await supabase.rpc('handle_stock_update', {
      p_item_name: itemName,
      p_quantity_change: quantityChange,
      p_unit: unit,
      p_user_id: userId,
      p_barcode: barcode || null,
      p_selling_price: sellingPrice || null
    })

    if (error) {
      console.error('StockService.updateStock error:', error)
      throw new Error(`Dështoi përditësimi i stokut për ${itemName}: ${error.message}`)
    }

    return true
  },

  /**
   * Fetches the current stock for the authenticated user.
   */
  async getStock() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("stock")
      .select("*")
      .order("item_name", { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Fetches an item from stock by its barcode.
   */
  async getStockByBarcode(barcode: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("stock")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle()

    if (error) {
      console.error('StockService.getStockByBarcode error:', error)
      throw error
    }
    return data
  },

  /**
   * Fetches an item from stock by its name.
   */
  async getItemByName(itemName: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("stock")
      .select("*")
      .eq("item_name", itemName)
      .maybeSingle()

    if (error) {
      console.error('StockService.getItemByName error:', error)
      throw error
    }
    return data
  },

  /**
   * Updates basic product info (barcode and selling price).
   */
  async updateProduct(id: string, updates: { barcode?: string, selling_price?: number }) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("stock")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error('StockService.updateProduct error:', error)
      throw error
    }
    return data
  }
}
