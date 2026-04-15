# Anti-Gravity ERP System 🚀

Një sistem ERP (Enterprise Resource Planning) modern, i shpejtë dhe i sigurt, i ndërtuar për të fuqizuar bizneset e vogla dhe të mesme me teknologjinë më të fundit.

## 🌐 Linku Live
👉 **[erp-omega-seven.vercel.app](https://erp-omega-seven.vercel.app)**

---

## ✨ Karakteristikat Kryesore

- **📑 Menaxhim Blerjesh (Purchases):** Regjistrim i detajuar i faturave me mbështetje për imazhe dhe PDF.
- **🤖 AI Extraction (OCR):** Procesim automatik i faturave duke përdorur Gemini 2.0 Flash (përmes OpenRouter). Nuk ka më nevojë për input manual të gjatë!
- **📦 Menaxhim Stoku (Stock):** Përditësim automatik dhe **atomik** i stokut pas çdo blerjeje ose shitjeje.
- **💰 Menaxhim Shitjesh (Sales):** Krijim i faturave të shitjes me llogaritje automatike të TVSH-së dhe opsion për printim direkt.
- **📈 Libri i Blerjes & Shitjes:** Pasqyra të detajuara të transaksioneve, të grupuara sipas datës.
- **💬 AI Chat with DB:** Komunikoni me të dhënat tuaja në gjuhë natyrore. Pyetni "Sa kemi shitur sot?" dhe merrni përgjigje në kohë reale.
- **🔒 Siguri e Lartë:** Autentikim dhe autorizim i bazuar në role (Admin/User) përmes Supabase Auth.
- **🌓 UI Moderne:** Mbështetje për Dark & Light mode me një dizajn "Glassmorphism" premium.

---

## 🛠️ Stack Teknologjik

| Teknologjia | Roli |
|---|---|
| **Next.js 15+** | Framework kryesor (App Router) |
| **Supabase** | Backend-as-a-Service (PostgreSQL, Auth, Storage) |
| **Tailwind CSS 4** | Stilizimi ultra-modern dhe responsive |
| **shadcn/ui** | Komponentët UI me standarde të larta |
| **Zod** | Validimi i të dhënave (Type-safe) |
| **OpenRouter** | Integrimi i AI (Gemini 2.0 Flash) |
| **Lucide Icons** | Ikonografia e pastër |

---

## 🏃 Fillimi i Shpejtë (Lokalisht)

### Kërkesat Paraprake
- Node.js (v18+)
- npm ose yarn

### Instalimi

1. **Klono repositorin:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

2. **Instalo varësitë:**
   ```bash
   npm install
   ```

3. **Konfiguro variablat e mjedisit (`.env.local`):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   OPENROUTER_API_KEY=your-openrouter-key
   ```

4. **Nis serverin:**
   ```bash
   npm run dev
   ```

Hap [http://localhost:3000](http://localhost:3000) në browserin tuaj.

---

## 📂 Struktura e Projektit

- `src/app/` - Rrugët e aplikacionit (App Router)
- `src/components/` - Komponentët e ripërdorshëm (UI & Business Logic)
- `src/lib/services/` - Shërbimet e centralizuara (Stock, API layer)
- `supabase/` - Skriptet e bazës së të dhënave dhe migrimet

---

## 🛡️ Hardening & Optimization (Përditësimi i Fundit)
Në versionin e fundit kemi përmirësuar:
1. **Atomic Stock Updates:** Tani përditësimet e stokut bëhen përmes funksioneve në nivel database (SQL RPC) për të shmangur gabimet në transaksione simultane.
2. **UX Empty States:** Çdo tabelë tani ka një gjendje vizuale të qartë kur nuk ka të dhëna.
3. **Refaktoring:** Logjika e biznesit është ndarë nga komponentët UI për mirëmbajtje më të lehtë.

---

Prodhuar me ❤️ nga Antigravity ERP Team.
