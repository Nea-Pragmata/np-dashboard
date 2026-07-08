# Personvern (GDPR) — status for NP Dashboard

Ærlig oversikt over persondata i systemet, hva koden dekker i dag, og hva som
gjenstår. **GDPR-samsvar er en organisatorisk og juridisk vurdering — ikke en
egenskap ved koden.** Dette dokumentet beskriver de tekniske tiltakene som er
på plass; det erklærer ikke at byrået eller den enkelte kunde er «compliant».

## Persondata i systemet

Hvor personopplysninger faktisk ligger lagret (PocketBase-kolleksjoner):

| Kolleksjon | Personfelter | Merknad |
|---|---|---|
| `customers` | `name`, `phone`, `email`, `consents`, `punch_card`, `visit_count`, `last_visit` | Kundekortet — primærkilden. |
| `inquiries` | `name`, `email`, `phone`, `message`, `attachments` | Henvendelser fra nettsidens skjema/chat. `message` og vedlegg kan inneholde fritekst-persondata. |
| `bookings` | `customer_name`, `customer_email`, `customer_phone` (+ `customer`-relasjon) | Kontaktinfo **denormalisert** på hver booking. |
| `waitlist_entries` | `customer`-relasjon | Peker til kunden; ingen egne kontaktfelter. |
| `users` | `name`, `email`, `avatar`, `last_active` | Ansatte/eiere (bedriftens egne brukere), ikke sluttkunder. |
| `link_events` | `referrer`, `country` (GeoIP) | Besøksstatistikk for lenkesiden — potensielt indirekte identifiserende. |

Fordi kundens kontaktinfo er **denormalisert** til `bookings` (og henvendelser
har egne `name`/`email`/`phone`), holder det ikke å slette `customers`-raden:
navn, telefon og e-post blir liggende igjen i booking- og henvendelsesradene.
Sletting må skrubbe alle disse stedene.

## Dekket (tekniske tiltak)

- **Uttrykkelige samtykker.** `customers.consents` lagrer e-post/SMS-samtykke
  hver for seg, aldri forhåndsavkrysset, med `registered`-tidsstempel satt
  første gang noe samtykke gis. UI leser kun `=== true` — et manglende felt
  regnes aldri som samtykke.
- **Tenant-isolasjon.** Hver kunde ser kun sin egen bedrifts data. Håndhevet av
  PocketBase API-regler (EGEN BEDRIFT / BYRÅ), adversarielt verifisert i
  sikkerhetsgaten (ingen tenant-lekkasje, ingen offentlige create-endepunkter
  med lesetilgang).
- **Rollestyrt tilgang + minste privilegium.** `owner` vs `staff`; byråansatte
  er scopet til `allowed_businesses`. Ansatte kan ikke utvide eget scope eller
  redigere byråmedlemskap.
- **Eier-styrt sletting.** Sletting av kunde krever `owner` (EE) eller byråeier
  (BE) — håndhevet server-side, ikke bare skjult i UI.
- **Signerte tokens / ingen klienthemmeligheter.** Auth via PocketBase JS SDK;
  ingen superuser-token eller integrasjonshemmeligheter i klientkoden
  (`integrations.config` eksponeres aldri mot kunde).
- **NYTT i denne endringen — anonymiserende sletting + dataeksport.** På
  kundekortet (`/kunder/[id]`):
  - *Rett til sletting*: «Slett og anonymiser» (kun eier) skrubber
    `customer_name`/`email`/`phone` på alle bookinger, anonymiserer
    `name`/`email`/`phone` på alle henvendelser (navn+e-post er påkrevd, så de
    overskrives i stedet for å tømmes), rydder `customer`-relasjonen på
    ventelisteoppføringer, og sletter til slutt kundekortet.
  - *Rett til innsyn/portabilitet*: «Last ned kundedata» (eier eller ansatt)
    samler kundens rådata (kundekort + bookinger + henvendelser + venteliste)
    til én JSON-fil.

## Hull som gjenstår

### Teknisk (kode)

- **Lagringsbegrensning / automatisk sletting.** Ingen retention-policy eller
  jobb som fjerner gamle henvendelser/bookinger etter en fastsatt periode.
  Sletting skjer kun manuelt per kunde.
- **Revisjonslogg.** Ingen logg over hvem som leste/eksporterte/slettet
  persondata (audit trail for innsyns- og sletteforespørsler).
- **`link_events` behandlingsgrunnlag + IP-anonymisering.** GeoIP/`referrer`
  lagres for statistikk uten dokumentert grunnlag; IP bør anonymiseres/kuttes,
  og formålet avklares. Bør vurderes mot samtykke/berettiget interesse.
- **Vedleggshåndtering.** `inquiries.attachments` slettes ikke eksplisitt ved
  anonymisering (filene blir liggende til raden slettes); ingen skanning eller
  begrensning av hva som lastes opp.

### Juridisk / organisatorisk (byrået)

- **Databehandleravtaler.** Avtale mellom byrået (databehandler) og hver bedrift
  (behandlingsansvarlig), og videre med underleverandører (hosting m.m.).
- **Behandlingsgrunnlag.** Dokumentert grunnlag per behandling (samtykke,
  avtale, berettiget interesse) — spesielt for markedsføring og statistikk.
- **EU-hosting / TLS / backup.** Datalagring innenfor EØS, kryptert transport,
  og rutiner for sikkerhetskopi og gjenoppretting.
- **Personvernerklæring + cookie-/lagringssamtykke.** Publisert erklæring og
  samtykke for lagring/sporing på nettsidene som mater CMS-et.
- **Brudd-varsling.** Rutine for å oppdage og varsle Datatilsynet/berørte innen
  72 timer ved brudd.

## Ansvar

| Hull | Eier |
|---|---|
| Retention/auto-sletting | Kode (byrået bestiller policy) |
| Revisjonslogg | Kode |
| `link_events` grunnlag + IP-anonymisering | Kode + juridisk (grunnlaget avklares juridisk) |
| Vedleggshåndtering | Kode |
| Databehandleravtaler | Byrået / juridisk |
| Behandlingsgrunnlag | Byrået / juridisk |
| EU-hosting / TLS / backup | Byrået (drift) |
| Personvernerklæring + cookie-samtykke | Byrået / juridisk |
| Brudd-varsling | Byrået / juridisk |

Kort sagt: koden leverer verktøyene (samtykke, isolasjon, sletting, eksport),
men **GDPR-samsvar avhenger av organisatoriske og juridiske tiltak byrået må
eie** — dette dokumentet påstår ikke samsvar.
