# Anti-Gravity ERP System 🚀

Një sistem ERP modern i ndërtuar me Next.js dhe Supabase, i dizajnuar për bizneset e vogla dhe të mesme.

## 🌐 Linku Live (Vercel)

👉 **https://erp-omega-seven.vercel.app**

---

## ✨ Çfarë bën ky projekt?

- **Menaxhim blerjesh (Purchases):** Regjistro fatura blerje me ose pa imazh. AI nxjerr automatikisht të dhënat nga foto/PDF e faturës.
- **Libri i blerjeve (Purchases Book):** Shiko historikun e plotë të të gjitha blerjeve.
- **Menaxhim shitjesh (Sales):** Krijo fatura shitjesh me llogaritje automatike të TVSH-së. Mbështet printim direkt.
- **Libri i shitjeve (Sales Book):** Shiko historikun e plotë të shitjeve.
- **Magazinë (Consumption/Stock):** Stoku përditësohet automatikisht pas çdo blerje ose shitje.
- **Asistent AI (Chat with DB):** Bëj pyetje në gjuhë natyrore dhe merr të dhëna direkt nga databaza.
- **Role-based access:** Roli `admin` ka akses në panel administrimi; roli `user` ka akses vetëm në dashboard.
- **Shumëgjuhësh:** Mbështet shqip dhe anglisht.
- **Dark / Light mode.**

---

## 🏃 Si të niset lokalisht

### Kërkesat paraprake

- Node.js `>= 18`
- npm

### Hapat

```bash
# 1. Klono projektin
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. Instalo varësitë
npm install

# 3. Krijo skedarin e variablave të mjedisit
cp .env.local.example .env.local
# Pastaj plotëso vlerat (shih seksionin .env më poshtë)

# 4. Nis serverin e zhvillimit
npm run dev
```

Hap **http://localhost:3000** në browser.

---

## 🔑 Variablat e mjedisit (`.env.local`)

Krijo skedarin `.env.local` në rrënjën e projektit me këto vlera:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenRouter (për AI Chat dhe ekstraksion faturash)
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key
```

### Si t'i marrësh çelësat?

| Variabla | Ku ta gjesh |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | [Supabase Dashboard](https://app.supabase.com) → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | E njëjta faqe me URL-në |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |

---

## 🛠️ Stack teknologjik

| Teknologji | Roli |
|---|---|
| [Next.js 16](https://nextjs.org) | Framework kryesor (App Router) |
| [Supabase](https://supabase.com) | Databaza (PostgreSQL) + Auth |
| [Tailwind CSS 4](https://tailwindcss.com) | Stilizimi |
| [shadcn/ui](https://ui.shadcn.com) | Komponentët UI |
| [Zod](https://zod.dev) | Validimi i formave |
| [OpenRouter](https://openrouter.ai) | AI (Gemini 2.0 Flash) për Chat dhe OCR |
| [Sonner](https://sonner.emilkowal.ski) | Njoftimet toast |

---

## 📁 Struktura e projektit

```
src/
├── app/
│   ├── (auth)/         # Login, Register, Forgot Password, Update Password
│   ├── dashboard/      # Faqet e përdoruesit (Purchases, Sales, Stock...)
│   ├── admin/          # Paneli i administratorit
│   └── api/            # API Routes (chat-db, extract)
├── components/         # Komponentët e ripërdorshëm (Sidebar, ChatDB, ...)
├── lib/
│   ├── utils.ts        # Funksione ndihmëse
│   └── constants.ts    # Konstantet e përbashkëta
└── utils/
    └── supabase/       # Klientët e Supabase (client, server, middleware)
```

---

## 🚀 Deployment (Vercel)

1. Shto repo-n në [vercel.com](https://vercel.com)
2. Shto variablat e mjedisit në **Project Settings → Environment Variables**
3. Deplojo — Vercel e bën automatikisht pas çdo `git push`

---

## 📝 Scripted e npm

```bash
npm run dev     # Nis serverin e zhvillimit
npm run build   # Ndrton bundellin e prodhimit
npm run start   # Nis server-in e prodhimit
npm run lint    # Kontrollon kodin me ESLint
```
