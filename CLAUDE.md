# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prosjektet

Multi-tenant B2B CMS-dashbord for små norske bedrifter (frisør, bilforhandler, tømrer m.fl.) + byråets superadmin-nivå (NP Admin). Brukerne er ikke-tekniske. Menyen er modulstyrt per kunde (`businesses.modules`). Repoet er nyskaffoldet — selve dashbordet bygges etter kodeprompten i Notion (se kilder under).

## Kommandoer

Pakkehåndterer er **bun** (`bun.lock`).

```bash
bun install          # avhengigheter
bun run dev          # Vite dev-server (-- --open for nettleser)
bun run build        # produksjonsbygg
bun run preview      # forhåndsvis produksjonsbygg
bun run check        # svelte-kit sync + svelte-check (typer)
bun run check:watch  # samme, i watch-modus
bunx shadcn-svelte@latest add <navn>   # hent ny UI-primitiv til $lib/components/ui
```

Ingen test-runner er satt opp ennå. PocketBase er ikke i repoet ennå — settes opp som steg 0 i kodeprompten (via PocketBase MCP), forventet lokalt på `http://127.0.0.1:8090`.

## Arkitektur

- **SvelteKit 2 + Svelte 5 med runes tvunget på** for all prosjektkode (se `vite.config.ts` — `runes: true` for alt utenom node_modules). Skriv aldri legacy-syntaks (`$:`-reaktivitet, `export let`); bruk `$state`/`$derived`/`$props`.
- **Tailwind CSS v4** via `@tailwindcss/vite` — designtokens defineres som CSS-variabler i `src/routes/layout.css` (tokenverdiene står i kodeprompten i Notion og skal matche Figma «NP Tokens» eksakt).
- **shadcn-svelte er initialisert** (`components.json`: style «nova», baseColor neutral, css `src/routes/layout.css`). UI-primitiver hentes med `bunx shadcn-svelte@latest add <navn>` og havner i `$lib/components/ui` — skriv aldri primitivene selv. Ikoner: `@lucide/svelte`. Inter lastes via `@fontsource-variable/inter`.
- `adapter-auto` — byttes til konkret adapter når deploy-mål er valgt.
- Planlagt rutestruktur (fra kodeprompten): `(auth)/logg-inn`, `(app)/…` for kundedashbordet (sidebar 248 px + toppbar 56 px, modulstyrt meny), `(admin)/np-admin/…` med egen mørk sidebar. Data via PocketBase JS SDK; komponentgrunnmur shadcn-svelte (bits-ui) + lucide-svelte.

## Kilder til sannhet (les FØR du bygger — ikke anta)

| Hva | Hvor |
|---|---|
| Datamodell + API-regler | Notion «PocketBase – Databaseoppsett» (inkl. «Beslutningslogg og rettelser v2» og API-regeldokumentet). Ved motstrid vinner nyeste seksjon. |
| Design (44+ rammer, tokens, komponenter) | Figma `GGjapyH1KubRYOO3TEciOO`, siden «V4 — UI» (node 120:2) |
| Oppdrag/milepæler | Notion «Kodeprompt · NP Dashboard i SvelteKit» |
| Nettside-kontrakt | Notion «Nettsted-oppsett — kontrakt mot CMS-et» |

Uklarheter avklares ved å oppdatere Notion **additivt** — aldri ved stille antakelser i koden.

## Konvensjoner og designregler

- **UI-tekst: norsk bokmål i setningsform** («Lagre endringer», aldri «Lagre Endringer»). Kode, kommentarer og commit-meldinger: engelsk.
- Kort = 1 px `--border-default` + radius 12 — **aldri box-shadow**. Maks én svart primærknapp per skjerm. Blå aksent kun på mikropunkter. Hver tabell har tom-/laste-/feiltilstand. Alle interaktive elementer har hover/fokus/disabled.
- Beløp: «1 250 kr» (mellomrom som tusenskiller), høyrestilt i kolonner. Datoer: «man. 6. juli».
- Aldri hardkod innhold som finnes i datamodellen. Aldri superuser-token i klientkode.

## Arbeidsmåte med agenter

**Milepæl-loop (obligatorisk):**
1. Én bygger-agent per milepæl/side — får relevant Figma-ramme + Notion-utsnitt, bygger ferdig én ting.
2. Én **uavhengig** validerings-agent etterpå — **verifiserer alltid i Chrome mot kjørende app** (browser-/chrome-devtools-MCP), aldri bare ved å lese koden:
   - start `bun run dev`, naviger til siden og klikk gjennom hele flyten (skjemaer, faner, skuffer, knapper)
   - les konsollen (ingen feil/advarsler) og nettverkskall (ingen feilede PocketBase-forespørsler)
   - ta skjermbilde og sammenlign mot Figma-rammen; sjekk også mobilbredde 390 px
   - fremprovosér tom-, laste- og feiltilstand (f.eks. stopp PocketBase for feiltilstand) og verifiser norsk bokmål i all tekst
   Samme agent validerer aldri eget arbeid.
3. Avvik rettes før neste milepæl startes. Bygg aldri videre på uvalidert grunnmur.

**Parallellisering:** kun lesing/research parallelt (kodeleting, dokumentlesing, granskning). All skriving — repo-filer, PocketBase-skjema, Notion — sekvensielt; to agenter skriver aldri mot samme ressurs samtidig.

**Ekspert-gates (før merge/ibruktagelse):**
- Endringer i PocketBase-regler, hooks eller auth → egen sikkerhetsagent gransker adversarielt (tenant-lekkasje, privilegie-eskalering, offentlige create-endepunkter).
- Nye UI-sider → design-/a11y-gransker mot designreglene over.
- Migrasjoner → dry-run + rollback-plan før kjøring.

**Kontekst på tvers av agenter:** beslutninger dokumenteres additivt i Notion; midlertidig delt agent-tilstand i `docs/LEDGER.md`.
