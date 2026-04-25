"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

type Language = "sq" | "en"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  sq: {
    // Auth
    welcome: "Mirësevini",
    login_subtitle: "Kyçuni në platformën tuaj të biznesit",
    fiscal_number: "Numri Fiskal",
    password: "Fjalëkalimi",
    forgot_password: "Keni harruar fjalëkalimin?",
    continue: "Vazhdo",
    no_account: "Nuk keni llogari?",
    register_link: "Regjistrohuni këtu",
    
    // Register
    create_account: "Krijoni Llogarinë",
    register_subtitle: "Plotësoni të dhënat e biznesit tuaj për të filluar",
    business_name: "Emri i Biznesit",
    work_email: "Email-i i Punës",
    phone_number: "Numri i Telefonit",
    address: "Adresa e Selisë",
    confirm_password: "Konfirmoni Fjalëkalimin",
    terms: "Pranoj kushtet e përdorimit dhe politikën e privatësisë",
    already_have_account: "Keni llogari?",
    login_link: "Kyçuni këtu",
    
    // Dashboard
    dashboard: "Dashboard",
    admin_panel: "Paneli i Kontrollit",
    business_dashboard: "Paneli i Biznesit",
    welcome_back: "Mirësevini përsëri",
    dashboard_desc: "Këtu mund të shihni një përmbledhje të performancës së biznesit tuaj.",
    sign_out: "Shkyçuni",
    
    // Sidebar
    main_menu: "Menuja Kryesore",
    user_mgmt: "Menaxhimi i Përdoruesve",
    reports: "Raportet",
    settings: "Cilësimet",
    invoices: "Faturat e Mia",
    analytics: "Analitika",
    acc_settings: "Cilësimet e Llogarisë",
    
    // Admin
    system_mgmt: "Menaxhimi i Sistemit",
    recent_registrations: "Regjistrimet e Fundit",
    total: "Gjithsej",
    search_businesses: "Kërko biznese...",
    auth: {
      error_fiscal: "Numri fiskal nuk u gjet ose është i pasaktë",
      error_password: "Fjalëkalimi është i pasaktë",
      success_login: "Mirësevini përsëri!",
      success_register: "Llogaria u krijua me sukses!",
      success_reset: "Linku për rivendosjen e fjalëkalimit u dërgua!",
      error_unexpected: "Ndodhi një gabim i papritur",
    },
    
    // Business Modules
    purchases: "Blerjet",
    sales: "Shitjet",
    stock: "Stoku",
    sales_book: "Libri i Shitjes",
    purchases_book: "Libri i Blerjes",
    consumption: "Harxhimi",
    products: "Produktet",
    
    // Fields
    invoice_number: "Numri i Faturës",
    date: "Data",
    total_cost: "Kosto Totale",
    total_amount: "Çmimi Total",
    seller_fiscal: "Nr. Fiskal i Shitësit",
    item_name: "Emri i Artikullit",
    quantity: "Sasia",
    unit: "Njësia",
    vat_rate: "Norma e TVSH",
    type: "Lloji",
    product: "Mall",
    service: "Shërbim",
    barcode: "Barkodi",
    price: "Çmimi",
    selling_price: "Çmimi i Shitjes",
    cost_price: "Çmimi i Blerjes",
    available_stock: "Stoku në Gjendje",
    subtotal: "Nëntotali",
    vat_amount: "Shuma e TVSH",
    grand_total: "TOTALI",
    
    // Units
    unit_cope: "copë",
    unit_kg: "kg",
    unit_liter: "litër",
    unit_meter: "metër",
    
    // Actions
    add_purchase: "Regjistro Blerjen",
    add_sale: "Regjistro Shitjen",
    print: "Printo",
    reprint: "Ri-printo",
    manual_entry: "Hyrje Manuale",
    ai_extract: "Nxirr me AI",
    confirm_vat: "Konfirmo Ndryshimin e TVSH",
    confirm_vat_desc: "A jeni të sigurt që dëshironi të ndryshoni normën e TVSH për këtë faturë?",
    add_item: "Shto Artikull",
    register_sale_btn: "Regjistro Shitjen",
    register_purchase_btn: "Regjistro Blerjen",
    processing: "Duke u procesuar...",
    confirm: "Konfirmo",
    cancel: "Anulo",
    back: "Kthehu",
    save: "Ruaj",
    close: "Mbyll",
    delete: "Fshij",
    pastro: "Pastro",
    reset: "Reset",
    
    // Validation
    val_invoice_required: "Numri i faturës është i detyrueshme",
    val_date_required: "Data është e detyrueshme",
    val_total_gt_zero: "Totali duhet të jetë më i madh se 0",
    val_vat_negative: "TVSH nuk mund të jetë negative",
    val_vat_max: "TVSH nuk mund të jetë mbi 100%",
    val_item_required: "Shkruani emrin e artikullit",
    val_qty_gt_zero: "Sasia duhet të jetë më e madhe se 0",
    val_unit_required: "Njësia është e detyrueshme",
    val_at_least_one: "Shtoni të paktën një artikull",
    val_stock_insufficient: "Nuk ka stok të mjaftueshëm",
    
    // Books
    serial_number: "Nr.",
    details: "Detajet",
    summary: "Përmbledhja",
    grouped_by_date: "Grupimi sipas Datës",
    view_invoice: "Shiko Faturën",
    monthly_summary: "Përmbledhja Mujore",
    period_filters: "Filtrat e Periudhës",
    from_date: "Prej Datës",
    to_date: "Deri në Datën",
    year: "Viti",
    no_sales_found: "S'u gjet asnjë shitje",
    no_purchases_found: "S'u gjet asnjë blerje",
    old_record_note: "Ky rekord nuk ka detaje të artikujve (i regjistruar para përditësimit).",
  },
  en: {
    // Auth
    welcome: "Welcome",
    login_subtitle: "Login to your business platform",
    fiscal_number: "Fiscal Number",
    password: "Password",
    forgot_password: "Forgot password?",
    continue: "Continue",
    no_account: "Don't have an account?",
    register_link: "Register here",
    
    // Register
    create_account: "Create Account",
    register_subtitle: "Fill in your business details to start",
    business_name: "Business Name",
    work_email: "Work Email",
    phone_number: "Phone Number",
    address: "Headquarters Address",
    confirm_password: "Confirm Password",
    terms: "I accept terms of use and privacy policy",
    already_have_account: "Have an account?",
    login_link: "Login here",
    
    // Dashboard
    dashboard: "Dashboard",
    admin_panel: "Control Panel",
    business_dashboard: "Business Dashboard",
    welcome_back: "Welcome back",
    dashboard_desc: "Here you can see an overview of your business performance.",
    sign_out: "Sign Out",
    
    // Sidebar
    main_menu: "Main Menu",
    user_mgmt: "User Management",
    reports: "Reports",
    settings: "Settings",
    invoices: "My Invoices",
    analytics: "Analytics",
    acc_settings: "Account Settings",
    
    // Admin
    system_mgmt: "System Management",
    recent_registrations: "Recent Registrations",
    total: "Total",
    search_businesses: "Search businesses...",
    auth: {
      error_fiscal: "Fiscal number not found or incorrect",
      error_password: "Password is incorrect",
      success_login: "Welcome back!",
      success_register: "Account created successfully!",
      success_reset: "Password reset link sent!",
      error_unexpected: "An unexpected error occurred",
    },

    // Business Modules
    purchases: "Purchases",
    sales: "Sales",
    stock: "Stock",
    sales_book: "Sales Book",
    purchases_book: "Purchases Book",
    consumption: "Consumption",
    products: "Products",
    
    // Fields
    invoice_number: "Invoice Number",
    date: "Date",
    total_cost: "Total Cost",
    total_amount: "Total Amount",
    seller_fiscal: "Seller Fiscal No.",
    item_name: "Item Name",
    quantity: "Quantity",
    unit: "Unit",
    vat_rate: "VAT Rate",
    type: "Type",
    product: "Product",
    service: "Service",
    barcode: "Barcode",
    price: "Price",
    selling_price: "Selling Price",
    cost_price: "Cost Price",
    available_stock: "Available Stock",
    subtotal: "Subtotal",
    vat_amount: "VAT Amount",
    grand_total: "TOTAL",
    
    // Units
    unit_cope: "pcs",
    unit_kg: "kg",
    unit_liter: "liter",
    unit_meter: "meter",
    
    // Actions
    add_purchase: "Register Purchase",
    add_sale: "Register Sale",
    print: "Print",
    reprint: "Re-print",
    manual_entry: "Manual Entry",
    ai_extract: "AI Extract",
    confirm_vat: "Confirm VAT Change",
    confirm_vat_desc: "Are you sure you want to change the VAT rate for this invoice?",
    add_item: "Add Item",
    register_sale_btn: "Register Sale",
    register_purchase_btn: "Register Purchase",
    processing: "Processing...",
    confirm: "Confirm",
    cancel: "Cancel",
    back: "Back",
    save: "Save",
    close: "Close",
    delete: "Delete",
    pastro: "Clear",
    reset: "Reset",
    
    // Validation
    val_invoice_required: "Invoice number is required",
    val_date_required: "Date is required",
    val_total_gt_zero: "Total must be greater than 0",
    val_vat_negative: "VAT cannot be negative",
    val_vat_max: "VAT cannot be over 100%",
    val_item_required: "Enter item name",
    val_qty_gt_zero: "Quantity must be greater than 0",
    val_unit_required: "Unit is required",
    val_at_least_one: "Add at least one item",
    val_stock_insufficient: "Insufficient stock available",
    
    // Books
    serial_number: "No.",
    details: "Details",
    summary: "Summary",
    grouped_by_date: "Grouped by Date",
    view_invoice: "View Invoice",
    monthly_summary: "Monthly Summary",
    period_filters: "Period Filters",
    from_date: "From Date",
    to_date: "To Date",
    year: "Year",
    no_sales_found: "No sales found",
    no_purchases_found: "No purchases found",
    old_record_note: "This record has no item details (registered before update).",
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("sq")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem("app-language") as Language
    if (saved && (saved === "sq" || saved === "en")) {
      setLanguage(saved)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("app-language", lang)
  }

  const t = (key: string) => {
    const keys = key.split(".")
    let result: unknown = translations[language]
    for (const k of keys) {
      if (result && typeof result === 'object' && k in (result as Record<string, unknown>)) {
        result = (result as Record<string, unknown>)[k]
      } else {
        return key
      }
    }
    return result as string
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }
  return context
}
