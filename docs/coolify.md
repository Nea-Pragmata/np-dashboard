# Deploy i Coolify

To ressurser: PocketBase (data) og dashbordet (statisk SPA). Sett opp PocketBase først — dashbordet trenger den offentlige PB-URL-en ved **byggetid**.

## 1. PocketBase

- **+ New → Service → PocketBase** (one-click-tjeneste).
- Sett domene, f.eks. `https://pb.dittdomene.no` (Coolify ordner TLS via Let's Encrypt).
- Verifiser at tjenesten har et persistent volum på `/pb_data` (one-click-malen lager dette — uten det mister du databasen ved redeploy).
- Åpne `https://pb.dittdomene.no/_/`, opprett superbruker, og importer skjemaet (se `docs/pb-schema.md`).
- **Slå på Batch API** under *Settings → Batch API* — av som standard på en fersk PocketBase. Onboarding oppretter bedrift + eier + abonnement i én transaksjon via `/api/batch`; er den av, svarer PocketBase 403 og «Opprett bedrift» feiler. «Lagre som utkast» bruker ikke batch og virker uansett, så symptomet ser ut som et rettighetsproblem uten å være det.

## 2. Dashbordet

- **+ New → Application → (Git-repoet)**.
- **Build Pack: Dockerfile** (bruker `Dockerfile` i repo-roten: bun-bygg → nginx med SPA-fallback).
- **Environment Variables:** legg til
  - `PUBLIC_PB_URL=https://pb.dittdomene.no` — **huk av «Build Variable»** (verdien bakes inn i JS-bundelen under bygget; runtime-endring krever redeploy).
- **Port:** 80 (nginx i containeren).
- Sett domene, f.eks. `https://dashbord.dittdomene.no`, og deploy.

## Verifisering etter deploy

1. `https://dashbord.dittdomene.no/logg-inn` laster direkte (SPA-fallback OK).
2. Logg inn — nettverksfanen viser kall mot `https://pb.dittdomene.no/api/…` med 200.
3. PocketBase svarer med `Access-Control-Allow-Origin` som standard, så ingen CORS-oppsett trengs.

## Verdt å vite

- Bytter du PB-URL (nytt domene/miljø): endre variabelen og **redeploy** — den er byggetid, ikke runtime.
- Ett dashbord-deploy per miljø (staging/prod) med hver sin `PUBLIC_PB_URL`.
- Lokal test av imaget:
  `docker build --build-arg PUBLIC_PB_URL=https://pb.dittdomene.no -t np-dashboard . && docker run --rm -p 8080:80 np-dashboard`
