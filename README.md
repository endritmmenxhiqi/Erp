# Advanced ERP System with AI Integration

Një sistem profesional për menaxhimin e bizneseve (ERP) i ndërtuar me teknologjitë më moderne. Ky projekt synon të automatizojë regjistrimin e blerjeve përmes Inteligjencës Artificiale dhe të ofrojë një pasqyrë të plotë të aktivitetit tregtar.

## ✨ Veçoritë Kryesore (Features)

- 🤖 **AI Invoice Extraction:** Ngarkoni faturat dhe sistemi nxjerr automatikisht artikujt, sasitë dhe çmimet duke përdorur modele të avancuara të AI (Gemini/Groq).
- 📦 **Menaxhimi i Stokut:** Përditësimi automatik i gjendjes së artikujve pas blerjeve dhe shitjeve.
- 🏷️ **Barcode System:** Shitje e shpejtë përmes kërkimit me barkod.
- 📊 **Libra të Shitjes dhe Blerjes:** Raportim i detajuar i grupuar sipas muajve dhe viteve me kalkulim automatik të TVSH-së.
- 🌍 **Multi-language Support:** Përkrahje e plotë për gjuhën Shqipe dhe Angleze (i18n).
- 🛡️ **Admin Panel:** Menaxhim i përdoruesve dhe kontrolli i qasjes në veçoritë e AI.
- 💬 **ChatDB AI:** Asistent inteligjent për të komunikuar me të dhënat e biznesit tuaj.
- 🌓 **Dark/Light Mode:** Interface modern që përshtatet sipas preferencave të përdoruesit.

## 🚀 Teknologjitë e Përdorura

- **Frontend:** [Next.js 15+](https://nextjs.org/), React 19, Tailwind CSS.
- **Components:** [Shadcn/UI](https://ui.shadcn.com/), Radix UI, Lucide Icons.
- **Backend/Database:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS).
- **AI Models:** Google Gemini Pro Vision / Groq Llama 3 Vision.
- **Forms & Validation:** React Hook Form + Zod.
- **Deployment:** Vercel.

## 🛠️ Instalimi dhe Fillimi

1. Klono projektin:
   ```bash
   git clone https://github.com/endritmmenxhiqi/Erp.git
   ```
2. Instalo dependencat:
   ```bash
   npm install
   ```
3. Konfiguro variablat e mjedisit (`.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` apo `GROQ_API_KEY`
4. Starto projektin:
   ```bash
   npm run dev
   ```

## 📈 Demo Plani
Plani i detajuar i prezantimit final mund të gjendet në: [docs/demo-plan.md](./docs/demo-plan.md)

## 👤 Autori
- **Endrit Menxhiqi** - [GitHub](https://github.com/endritmmenxhiqi)

---
© 2026 ERP System - All Rights Reserved.
