# Plani i Prezantimit - ERP System

## 1. Çka është projekti dhe kujt i shërben?
Projekti është një sistem **ERP (Enterprise Resource Planning)** i avancuar, i ndërtuar për bizneset e vogla dhe të mesme që duan të digjitalizojnë menaxhimin e tyre. Sistemi fokusohet në automatizimin e proceseve përmes Inteligjencës Artificiale, duke kursyer kohë dhe duke minimizuar gabimet njerëzore gjatë regjistrimit të të dhënave.

**Kujt i shërben:**
- Bizneseve tregtare (dyqane, markete).
- Kontabilistëve që duan të procesojnë faturat më shpejt.
- Pronarëve të bizneseve që duan monitorim në kohë reale të stokut, shitjeve dhe blerjeve.

## 2. Flow-i kryesor që do të demonstroni
Demonstrimi do të ndiqet në këtë renditje (Flow):
1.  **Login & Dashboard:** Prezantimi i pamjes kryesore dhe statistikave të përgjithshme.
2.  **Regjistrimi i Blerjes me AI:** Ngarkimi i një fotografie të një fature fizike dhe nxjerrja automatike e artikujve (Emri, Sasia, Çmimi) pa shkrim manual.
3.  **Menaxhimi i Stokut:** Tregimi se si artikujt e blerë shtohen automatikisht në stok dhe përditësimi i barkodeve/çmimeve të shitjes.
4.  **Procesi i Shitjes:** Realizimi i një shitjeje duke përdorur barkodin (Barcode Search) dhe zbritja automatike nga stoku.
5.  **Libri i Shitjes/Blerjes:** Filtrimi i të dhënave sipas Viteve/Muajve dhe llogaritja e Totaleve.
6.  **Admin Panel:** Tregimi i fuqisë së adminit për të aktivizuar/çaktivizuar veçoritë e AI për klientë specifikë.

## 3. Pjesët teknike që do të shpjegohen shkurt
- **Next.js & App Router:** Për një performancë të lartë dhe navigim të shpejtë.
- **Supabase (Backend-as-a-Service):** Për menaxhimin e bazës së të dhënave (PostgreSQL) dhe autentikimin.
- **AI Integration (Google Gemini/Groq):** Për procesimin e imazheve dhe kthimin e tyre në format të strukturuar JSON.
- **Internationalization (i18n):** Sistemi është plotësisht bilingual (Shqip dhe Anglisht).
- **Zustand/React Context:** Për menaxhimin e gjendjes globale (gjuha, tema).

## 4. Çfarë keni kontrolluar para demos?
- [x] Lidhja me Databazën është aktive.
- [x] Çelësat API për AI janë valid dhe kanë kuotë të mjaftueshme.
- [x] Të gjitha rrugët (Routes) në Vercel funksionojnë pa gabime 404/500.
- [x] Barkod kërkimi funksionon me të dhënat ekzistuese.
- [x] Përkthimi ndryshon saktë në të gjitha faqet.

## 5. Plani B (Nëse live demo dështon)
- **Video Recording:** Një video e regjistruar paraprakisht e të gjithë flow-it kryesor (Screen Recording).
- **Localhost:** Gatishmëria për të vrapuar projektin lokalisht nëse serveri i Vercel ka probleme.
- **Screenshots:** Një dokument PDF me screenshot-et e secilit hap të procesit.
