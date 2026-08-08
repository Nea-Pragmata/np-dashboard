# PocketBase schema — working fasit (from Notion, v2, 2026-07-07)

Source of truth: Notion «PocketBase – Databaseoppsett (multi-bedrift)» (page 3803d868-2784-818f-92de-d149e789bea2), original + «V4-avstemming datamodell (juli 2026)» + «Beslutningslogg og rettelser (v2)». On conflict, Beslutningslogg v2 wins. This file is a working copy for build agents — if anything is unclear, verify against Notion and update Notion additively.

PocketBase runs at `http://127.0.0.1:8090` (Docker). All schema work goes through the PocketBase MCP server (superuser).

## 0. Conventions

- All tenant data collections have a `business` relation → businesses (cascade delete false unless noted).
- Field notation: `name type(options) REQ|opt — note`. `autodate` created/updated exist on all collections (PB default) and are not listed.
- select values are exact machine keys (English); UI labels are Norwegian bokmål (mapping lives in the frontend StatusBadge/labels, never in the DB).
- JSON field structures shown with synthetic examples. Dates are PB UTC strings (`2026-07-07 09:00:00.000Z`).

## 1. Collections (create order matters — relations need existing targets)

### 1.1 businesses (base)
- name text REQ
- slug text REQ — unique
- type select(frisor, bilforhandler, tomrer, annet) REQ
- logo file opt (single, image)
- primary_color text opt (hex)
- contact_email email opt
- phone text opt
- address text opt
- org_number text opt
- opening_hours json opt — `{"mon":{"open":"09:00","close":"17:00"},...,"sun":null}` (ONLY source of opening hours — v2.2)
- status select(active, onboarding, paused) REQ
- last_active date opt
- settings json opt — misc config incl. `review_request: {"enabled":true,"delay_hours":24,"sms_template":""}` (v2.4). NEVER billing/entitlement flags.
- modules json REQ — canonical keys, bool each: booking, catalog, inquiries, customers, campaigns, links, social, ads, reviews, waitlist. (Statistikk/Nettsted/Innstillinger are always-on, not module-gated.)

Indexes: UNIQUE(slug); (status, last_active).

### 1.2 users (auth — UPDATE existing collection, keep std auth fields)
- business relation→businesses opt — empty for agency users
- name text REQ
- role select(owner, staff) REQ
- status select(active, invited) opt
- last_active date opt
- avatar file opt (exists already)

Indexes: UNIQUE(email) (built-in); (business, role).

### 1.3 agency_members (base) — NP Admin access vector
- user relation→users REQ — UNIQUE
- role select(owner, staff) REQ — Byråeier/Byråansatt
- allowed_businesses relation→businesses MULTI opt — empty = access to ALL businesses
- status select(active, invited, disabled) REQ
- invited_by relation→users opt
- note text opt

Indexes: UNIQUE(user); (status, role).

### 1.4 categories (base)
- business relation→businesses REQ
- name text REQ
- slug text REQ
- parent relation→categories opt
- icon text opt
- sort_order number opt

Indexes: UNIQUE(business, slug); (business, sort_order).

### 1.5 products (base)
- business relation→businesses REQ
- category relation→categories REQ
- name text REQ
- slug text REQ
- description editor opt
- price number opt (NOK)
- price_type select(fixed, from, on_request) REQ
- price_unit select(stk, time, per_m2) opt
- images file MULTI opt (images)
- status select(active, hidden, sold) REQ
- featured bool opt
- bookable bool opt
- sort_order number opt
- external_id text opt (SKU / reg.nr)
- attributes json opt — values keyed by attribute_schemas.key

Indexes: UNIQUE(business, slug); (business, status, category); (business, bookable).

### 1.6 attribute_schemas (base) — dynamic form definitions (CORE FEATURE)
- business relation→businesses REQ
- category relation→categories opt — empty = applies to all categories of the business
- key text REQ — key into products.attributes
- label text REQ — Norwegian display label
- field_type select(text, number, select, bool, date) REQ
- options json opt — e.g. `["Bensin","Diesel","Hybrid","El"]` for select
- required bool opt
- show_in select(booking, catalog) MULTI opt
- sort_order number opt

Indexes: (business, category, sort_order).

### 1.7 resources (base)
- business relation→businesses REQ
- name text REQ
- staff relation→users opt
- active bool opt

Indexes: (business, active).

### 1.8 customers (base)
- business relation→businesses REQ
- name text REQ
- phone text opt
- email email opt
- last_visit date opt
- visit_count number opt
- punch_card json opt — `{"count":6,"goal":10,"reward_text":"Gratis klipp"}`
- consents json opt — `{"email":true,"sms":false,"registered":"2026-05-01 10:00:00.000Z"}`

Indexes: UNIQUE(business, email); (business, phone) non-unique.

### 1.9 booking_settings (base) — one row per business
- business relation→businesses REQ — UNIQUE
- reminders json opt — `{"sms":true,"email":true,"hours_before":24,"follow_up":false}`
- deposit json opt — `{"enabled":true,"percent":20,"method":"vipps","min_amount":100}` (v2.3 — deposit config lives ONLY here)
- waitlist json opt — `{"enabled":true,"cancellation_deadline_hours":24}`

Indexes: UNIQUE(business). NOTE: no opening_hours here (v2.2 — lives on businesses).

### 1.10 bookings (base)
- business relation→businesses REQ
- product relation→products REQ
- staff relation→users opt
- customer relation→customers opt
- resource relation→resources opt
- customer_name text opt
- customer_email email opt
- customer_phone text opt
- start date REQ
- end date REQ
- status select(pending, confirmed, cancelled, done) REQ
- notes text opt
- deposit_amount number opt
- deposit_status select(not_required, pending, paid, refunded) opt
- payment_provider select(vipps) opt
- payment_ref text opt

Indexes: (business, status); (business, start, end); (product, start); UNIQUE(payment_ref) WHERE payment_ref != '' (partial).

### 1.11 waitlist_entries (base)
- business relation→businesses REQ
- product relation→products REQ
- customer relation→customers opt
- desired_date date opt
- status select(waiting, notified, booked, expired) REQ

Indexes: (business, status); (product, status).

### 1.12 inquiries (base)
- business relation→businesses REQ
- product relation→products opt
- customer relation→customers opt
- name text REQ
- email email REQ
- phone text opt
- message text REQ
- attachments file MULTI opt
- status select(new, in_progress, done) REQ
- source select(form, chat, email) REQ

Indexes: (business, status); (business, created).

### 1.13 link_pages (base)
- business relation→businesses REQ
- slug text REQ
- title text REQ
- bio text opt
- avatar file opt
- theme json opt
- published bool opt
- visit_count number opt

Indexes: UNIQUE(business, slug).

### 1.14 links (base)
- business relation→businesses REQ
- link_page relation→link_pages opt — empty = standalone short link
- code text REQ — UNIQUE (short code for /r/{code})
- label text REQ
- target_url url REQ
- icon text opt
- sort_order number opt
- active bool opt
- click_count number opt

Indexes: UNIQUE(code); (business, link_page, sort_order).

### 1.15 link_events (base) — immutable
- business relation→businesses REQ
- type select(page_visit, link_click) REQ
- link_page relation→link_pages opt
- link relation→links opt
- referrer text opt
- country text opt

Indexes: (business, type, created).

### 1.16 campaigns (base)
- business relation→businesses REQ
- name text REQ
- channel select(email, sms) REQ
- audience json opt
- subject text opt
- message editor REQ
- status select(draft, scheduled, sent) REQ
- scheduled_at date opt
- sent_at date opt
- results json opt — `{"open_rate":42,"clicks":18,"bookings":3}`

Indexes: (business, status); (business, scheduled_at).

### 1.17 social_posts (base)
- business relation→businesses REQ
- channel select(instagram, facebook) REQ
- content text REQ
- thumbnail file opt
- scheduled_at date opt
- status select(draft, pending_approval, approved, published) REQ

Indexes: (business, status); (business, scheduled_at).

### 1.18 content_templates (base)
- business relation→businesses opt — empty = agency-global template
- name text REQ
- type select(social_post, email, sms, review_reply) REQ
- body text REQ

Indexes: (business, type).

### 1.19 reviews (base) — synced from platforms; create/delete LOCKED
- business relation→businesses REQ
- platform select(google, facebook) REQ
- author text REQ
- rating number REQ (1–5)
- text text opt
- posted_at date REQ
- reply_text text opt
- replied_at date opt
- status select(new, replied) REQ

Indexes: (business, posted_at); (business, status).

### 1.20 pages (base)
- business relation→businesses REQ
- name text REQ
- slug text REQ
- heading text REQ
- intro_text text REQ
- images file MULTI opt
- status select(published, draft) REQ

Indexes: UNIQUE(business, slug).

### 1.21 forms (base)
- business relation→businesses REQ
- name text REQ
- status select(active, draft) REQ
- fields json REQ — array of `{"name":"...","label":"...","type":"text","required":true}`

Indexes: UNIQUE(business, name).

### 1.22 site_status (base) — one row per business; writes LOCKED (ops jobs only)
- business relation→businesses REQ — UNIQUE
- uptime number opt (%)
- last_backup date opt
- ssl_status select(ok, warning, error) opt
- seo_review_date date opt

Indexes: UNIQUE(business).

### 1.23 report_settings (base) — one row per business
- business relation→businesses REQ — UNIQUE
- enabled bool opt
- frequency select(weekly, monthly) opt
- recipient_email email opt

Indexes: UNIQUE(business).

### 1.24 integrations (base) — config holds SECRETS; customers read via view only
- business relation→businesses REQ
- provider select(vipps, stripe, google, meta, sms, email) REQ
- status select(connected, error, not_connected) REQ
- config json opt — secrets (e.g. `{"vipps_msn":"123456"}`); NEVER exposed to customers

Indexes: UNIQUE(business, provider).

### 1.25 packages (base) — agency-global (no business field)
- name text REQ
- slug text REQ — UNIQUE
- description editor REQ
- price_per_month number REQ (NOK ex VAT)
- default_modules json REQ — e.g. `["booking","catalog","links"]`
- highlights json opt
- sort_order number opt
- published bool opt

Indexes: UNIQUE(slug); (published).

### 1.26 addon_services (base) — agency-global
- name text REQ
- description text REQ
- price number REQ
- price_type select(monthly, one_time) REQ
- sort_order number opt
- published bool opt

Indexes: (published).

### 1.27 agency_campaigns (base) — agency-global discounts
- name text REQ
- description text REQ
- discount_type select(percent, amount) REQ
- discount_value number REQ
- packages relation→packages MULTI opt — empty = all
- valid_from date REQ
- valid_to date REQ
- published bool opt

Indexes: (valid_from, valid_to); (published).

### 1.28 subscriptions (base) — THE ONLY business↔package link (v2.1)
- business relation→businesses REQ — UNIQUE
- package relation→packages REQ
- addons relation→addon_services MULTI opt
- campaign relation→agency_campaigns opt
- price_override number opt
- billing_interval select(month, year) opt — added 2026-07-08; empty = month (UI default)
- setup_fee number opt — added 2026-07-08; one-time startup charge, 0/empty = none
- start_date date REQ
- status select(active, paused, ended) REQ
- invoice_note text opt

Indexes: UNIQUE(business); (status). No invoice lines — recurring price computed in UI: `computeRecurring` = (package + monthly addons − discount) × (year ? 12 : 1), or `price_override` if set. One-time «oppstart» = `setup_fee` + one-time addons (`computeOneTime`).

### 1.29 agency_tasks (base)
- business relation→businesses opt — empty = general agency task
- text text REQ
- due_date date opt
- status select(open, done) REQ

Indexes: (business, status, due_date).

### 1.30 ai_jobs (base) — agency tool (no per-business scoping field; multi-relation)
- type select(security_scan, seo, content_suggestions, review_replies, alt_text) REQ
- businesses relation→businesses MULTI REQ
- interval select(daily, weekly, monthly, event) REQ
- run_at text opt ("09:00")
- notifications json opt — `{"email_on_findings":true,"show_status_to_client":true,"create_task":false}`
- status select(active, paused) REQ

Indexes: (status, interval).

### 1.31 ai_job_runs (base) — immutable, writes LOCKED (job runner only)
- job relation→ai_jobs REQ
- business relation→businesses REQ
- ran_at date REQ
- result select(ok, findings, error) REQ
- findings json opt
- show_status_to_client bool opt — denormalized from job (v2)

Indexes: (job, ran_at); (business, ran_at).

### 1.32 agency_leads (base) — inbound leads from the AGENCY's own website (added 2026-07-08)
Agency-global (no `business` field), mirrors the public-create pattern of `inquiries`/`bookings`.
- name text REQ
- email email REQ
- phone text opt
- company text opt
- message text opt
- call_time text opt — added 2026-07-09; free-text «ønsket prat-tid» (e.g. "helst etter kl. 17"), public-settable on create
- note text opt — added 2026-07-09; INTERNAL agency note, never public-settable
- assigned_to relation→users opt — added 2026-07-09; the responsible agency person («Ansvarlig»)
- source select(website, referral, other) REQ
- status select(new, in_dialog, won, lost) REQ

Rules: List/View/Update = BM (any active agency member — so a customer/non-agency user can't read or assign leads); Create = PUBLIC guarded `@request.body.status = "new" && @request.body.assigned_to:isset = false && @request.body.note:isset = false` (website posts anonymously with status=new and CANNOT pre-assign or write an internal note); Delete = BE. No indexes (small table, sorted `-created` in UI). Adversarially security-reviewed (public create endpoint + assign/edit surface).

### 1.33 agency_call_slots (base) — shared «Book en prat» availability pool (added 2026-07-09)
Agency-global. The byrå enters open 20-min call slots; the public website's «Book en prat» card shows the open ones; a lead that books one links back via `lead`. Managed from NP Admin › Leads («Ledige prat-tider»).
- starts date REQ — slot start (UTC; displayed Europe/Oslo)
- status select(open, booked) REQ
- lead relation→agency_leads opt — set when a lead books (booked slots only)

Rules: List/View = `status = "open" || BM` (PUBLIC reads ONLY open slots — booked slots with a `lead` id are agency-only, no lead-enumeration leak); Create/Update/Delete = BM (agency manages availability). **Public booking (guest flipping a slot to booked) is NOT wired — a nettside follow-up; today the agency marks booked manually.** No indexes.

## 2. Canonical rule expressions (paste verbatim, aliases MANDATORY)

```
// EGEN BEDRIFT
@request.auth.id != "" && business = @request.auth.business

// EGEN EIER
@request.auth.id != "" && business = @request.auth.business && @request.auth.role = "owner"

// BYRÅMEDLEM (active member, no business scoping)
@collection.agency_members:am.user ?= @request.auth.id && @collection.agency_members:am.status ?= "active"

// BYRÅ(business) — active member WITH access to this record's business
// CORRECTED 2026-07-07 (phase F): `:length = 0` → `:length ?= 0`. Plain `=` is PB multi-match
// ("ALL agency_members rows must satisfy"), so any scoped member broke empty=all for everyone.
@collection.agency_members:am.user ?= @request.auth.id && @collection.agency_members:am.status ?= "active" && (@collection.agency_members:am.allowed_businesses:length ?= 0 || @collection.agency_members:am.allowed_businesses.id ?= business)

// BYRÅEIER
@collection.agency_members:eier.user ?= @request.auth.id && @collection.agency_members:eier.status ?= "active" && @collection.agency_members:eier.role ?= "owner"
```

For `businesses` itself, replace `business` with `id` in BYRÅ(...) (the record IS the business).

Critical guards:
- Every customer-facing Update branch MUST include `@request.body.business:isset = false` (anti cross-tenant move).
- Create and Update rules are never shared where Create must send `business`.
- Public Create endpoints (bookings, inquiries, waitlist_entries, link_events, agency_leads) have strict field validation and NO read access.

## 3. Rules matrix (List/View/Create/Update/Delete)

Legend: EB = EGEN BEDRIFT, EE = EGEN EIER, BM = BYRÅMEDLEM, BY = BYRÅ(business), BE = BYRÅEIER, `""` = public, `null` = locked (superuser only).

| Collection | List | View | Create | Update | Delete |
|---|---|---|---|---|---|
| businesses | `id = @request.auth.business` OR BY(id) | same | BE | `(id = @request.auth.business && @request.auth.role = "owner" && @request.body.status:isset = false && @request.body.slug:isset = false && @request.body.modules:isset = false && @request.body.type:isset = false)` OR BY(id) | BE |
| users | `(@request.auth.id != "" && business = @request.auth.business)` OR BY | `id = @request.auth.id` OR `(@request.auth.id != "" && business = @request.auth.business)` OR BY | `(@request.auth.role = "owner" && @request.body.business = @request.auth.business && @request.body.role = "staff")` OR BY(@request.body.business) | `(id = @request.auth.id && @request.body.role:isset = false && @request.body.business:isset = false)` OR `(business = @request.auth.business && @request.auth.role = "owner" && @request.body.business:isset = false)` OR BY | `(business = @request.auth.business && @request.auth.role = "owner" && id != @request.auth.id)` OR BE |
| agency_members | BM | BM | BE | BE | BE |
| categories | `""` | `""` | EB OR BY | `(EB && @request.body.business:isset = false)` OR BY | EB OR BY |
| products | `status = "active"` OR EB OR BY | same | EB OR BY | `(EB && @request.body.business:isset = false)` OR BY | EB OR BY |
| attribute_schemas | `""` | `""` | BM | BM | BM |
| resources | EB OR BY | same | EB OR BY | `(EB && @request.body.business:isset = false)` OR BY | EB OR BY |
| customers | EB OR BY | same | EB OR BY | `(EB && @request.body.business:isset = false)` OR BY | EE OR BE |
| booking_settings | EB OR BY | same | BY | `(EB && @request.body.business:isset = false)` OR BY | BE |
| bookings | EB OR BY | same | `@request.body.status = "pending" && @request.body.deposit_status:isset = false && @request.body.deposit_amount:isset = false && @request.body.payment_ref:isset = false && @request.body.payment_provider:isset = false && @request.body.customer:isset = false` | `(EB && @request.body.business:isset = false && @request.body.deposit_status:isset = false && @request.body.payment_ref:isset = false && @request.body.deposit_amount:isset = false)` OR BY | BY |
| waitlist_entries | EB OR BY | same | `@request.body.status = "waiting" && @request.body.customer:isset = false` | `(EB && @request.body.business:isset = false)` OR BY | EB OR BY |
| inquiries | EB OR BY | same | `@request.body.status = "new" && @request.body.customer:isset = false` | `(EB && @request.body.business:isset = false)` OR BY | EE OR BE |
| link_pages | `published = true` OR EB OR BY | same | EB OR BY | `(EB && @request.body.business:isset = false)` OR BY | EB OR BY |
| links | `active = true` OR EB OR BY | same | EB OR BY | `(EB && @request.body.business:isset = false)` OR BY | EB OR BY |
| link_events | EB OR BY | same | `@request.body.type = "page_visit" \|\| @request.body.type = "link_click"` | null | null |
| campaigns | EB OR BY | same | EB OR BY | `(EB && @request.body.business:isset = false)` OR BY | `(EB OR BY) && status = "draft"` |
| social_posts | EB OR BY | same | BY | BY (customer approve-only flow handled in UI; may need narrow customer branch in milestone 8 — flag for security gate) | BY |
| content_templates | `@request.auth.id != "" && (business = "" \|\| EB \|\| BY)` | same | BM | BM | BM |
| reviews | `status = "replied"` OR EB OR BY | same | null | `((EB && @request.body.business:isset = false) OR BY) && @request.body.reply_text:isset = true` | null |
| pages | `status = "published"` OR EB OR BY | same | BY | `(EB && @request.body.business:isset = false && @request.body.status:isset = false && @request.body.slug:isset = false)` OR BY | BY |
| forms | `status = "active"` OR EB OR BY | same | BY | `(EB && @request.body.business:isset = false)` OR BY | BY |
| site_status | EB OR BY | same | null | null | BE |
| report_settings | EB OR BY | same | BY | `(EB && @request.body.business:isset = false)` OR BY | BY |
| integrations | BY | BY | BY | BY | BE |
| agency_tasks | BM+scope¹ | same | same | same | same |
| packages | `published = true` OR BM | same | BE | BE | BE |
| addon_services | `published = true` OR BM | same | BE | BE | BE |
| agency_campaigns | `published = true` OR BM | same | BE | BE | BE |
| subscriptions | `business = @request.auth.business` OR BY | same | BE | BE | BE |
| ai_jobs | BM | BM | BM | BM | BE |
| ai_job_runs | BY OR customer branch² | same | null | null | null |
| agency_leads | BM | BM | `@request.body.status = "new" && @request.body.assigned_to:isset = false && @request.body.note:isset = false` (public) | BM | BE |
| agency_call_slots | `status = "open"` OR BM | same | BM | BM | BM |

¹ agency_tasks (all ops): `@collection.agency_members:am.user ?= @request.auth.id && @collection.agency_members:am.status ?= "active" && (business = "" || @collection.agency_members:am.allowed_businesses:length ?= 0 || @collection.agency_members:am.allowed_businesses.id ?= business)` (`:length ?= 0` per phase F correction)

² ai_job_runs customer branch: `(show_status_to_client = true && business = @request.auth.business)`. Notion's literal wording says `status = "ok"` but the field is named `result`; we scope on show_status_to_client + own business. Deviation documented — update Notion additively.

Corrections 2026-07-07 (phase F, applied to live schema — reflect additively in Notion):
1. BYRÅ(business) in §2 and footnote ¹: `allowed_businesses:length = 0` → `allowed_businesses:length ?= 0` (102 rule occurrences, 28 collections incl. views). Plain `=` = PB multi-match over ALL agency_members rows → any scoped member broke the empty=all branch for every agency user (phase E blocker). Probe-verified: admin 4 businesses, ansatt still exactly 2 — no escalation.
2. users List/View: the tenant clause `business = @request.auth.business` MUST be guarded with `@request.auth.id != "" && …` — without it, guests (`@request.auth.business = ""`) matched the empty-business agency accounts and could read their name/email/role anonymously (security finding, HIGH). Matrix row updated above.

## 4. Views (create LAST — SQL references base tables)

### 4.1 public_business_profiles — List/View `""`
```sql
SELECT id, name, slug, logo, primary_color, contact_email, phone, address, org_number, opening_hours
FROM businesses WHERE status = 'active'
```

### 4.2 integration_status — List/View: EB OR BY
```sql
SELECT id, business, provider, status, updated FROM integrations
```

### 4.3 public_booking_config — List/View `""`
```sql
SELECT id, business,
  json_extract(deposit, '$.enabled') AS deposit_enabled,
  json_extract(deposit, '$.percent') AS deposit_percent,
  json_extract(waitlist, '$.enabled') AS waitlist_enabled,
  json_extract(waitlist, '$.cancellation_deadline_hours') AS cancellation_deadline_hours
FROM booking_settings
```

### 4.4 stats_overview — List/View: `id = @request.auth.business` OR BY(id)
```sql
SELECT b.id, b.id AS business,
  (SELECT COUNT(*) FROM link_events e WHERE e.business = b.id AND e.type = 'page_visit' AND e.created >= DATE('now','-30 day')) AS visits_30d,
  (SELECT COUNT(*) FROM bookings bk WHERE bk.business = b.id AND bk.start >= DATE('now','-30 day')) AS bookings_30d,
  (SELECT COUNT(*) FROM inquiries i WHERE i.business = b.id AND i.status = 'new') AS new_inquiries,
  (SELECT COUNT(*) FROM link_events e2 WHERE e2.business = b.id AND e2.type = 'link_click' AND e2.created >= DATE('now','-30 day')) AS clicks_30d
FROM businesses b
```
(link_events aggregates on `created`, which cannot be backdated by seed — seed events NOW so 30d counts are non-zero. bookings aggregate on `start`, which IS seedable.)

### 4.5 admin_business_overview — List/View: BY(id) — NEVER plain BM
```sql
SELECT b.id, b.name, b.type, b.status, b.last_active,
  p.name AS package_name,
  (SELECT COUNT(*) FROM json_each(b.modules) WHERE json_each.value = 1 OR json_each.value = true) AS module_count
FROM businesses b
LEFT JOIN subscriptions s ON s.business = b.id AND s.status = 'active'
LEFT JOIN packages p ON p.id = s.package
```

## 5. Roles & module keys (summary)

- Customer users: `users.role` owner|staff, `users.business` set. Owner: profile fields, staff mgmt. Never: modules/package/status/slug/type.
- Agency users: `users.business` EMPTY + row in `agency_members` (role owner|staff, allowed_businesses empty=all). NP Admin menu renders only for active agency_members.
- Module keys (businesses.modules): booking, catalog, inquiries, customers, campaigns, links, social, ads, reviews, waitlist. Always-on pages: Oversikt, Statistikk, Nettsted & SEO, Innstillinger.
- Sync subscription→modules is a DEFERRED server hook: NP Admin UI writes both `subscriptions` and `businesses.modules` (batch API).

## 6. Seed spec (phase C — superuser via MCP; demo content aligned with Figma frames)

Common demo password for ALL seeded users: `Demo1234!` (documented in docs/LEDGER.md).

Agency users (users.business empty + agency_members):
- `admin@npweb.no` «Nora Prytz» — agency_members role=owner, allowed_businesses=[] (all)
- `ansatt@npweb.no` «Ask Berg» — agency_members role=staff, allowed_businesses=[Frisør Oslo, Moen Bygg] (tests scoping)

Packages: Basis (nettside-fokus: links; 1490/mnd), Vekst (booking, catalog, inquiries, customers, links, reviews; 2490/mnd), Komplett (alle 10 moduler; 3990/mnd) — published=true, highlights. Addon_services ×3 («Ekstra språk» 490/mnd monthly, «Logo-design» 4900 one_time, «Foto-pakke» 6900 one_time). Agency_campaigns ×1 («Sommerkampanje −20 %», percent 20, valid juli 2026, published).

Tenants (+ subscription each, + owner user each):
1. **Frisør Oslo** — slug frisor-oslo, type frisor, Komplett, ALL modules true. Owner `eier@frisor-oslo.no` «Frida Holm», staff `ansatt@frisor-oslo.no` «Jonas Lie». Rich content: 3 categories (Dameklipp/Herreklipp/Farge & striper), ~10 bookable products w/ fixed prices (Herreklipp 350, Dameklipp 400/450 osv. — MATCH Figma frame content where legible), attribute_schemas (varighet_min number REQ show_in booking+catalog; passer_for select [Dame, Herre, Barn]; etterbehandling bool), 2 resources (Stol 1, Stol 2), booking_settings (reminders on, deposit {enabled:true,percent:20,method:vipps,min_amount:100}, waitlist enabled), ~15 bookings current week (mix pending/confirmed/done/cancelled, several TODAY), ~10 customers (varied punch_card, consents), 5 inquiries (2 status=new for badge, mix form/chat), link_page + 3 links + ~60 link_events (mix page_visit/link_click), 2 campaigns (1 sent w/ results, 1 draft), 3 social_posts (draft/pending_approval/published), 6 reviews (google+facebook, 4 replied 2 new), 3 pages (Forside/Om oss/Priser, published), 1 form (Kontaktskjema, active), site_status (uptime 99.9, ssl ok), report_settings (weekly), integrations (google connected, vipps connected w/ config secret `{"vipps_msn":"654321"}`, meta not_connected).
2. **Bil 1 Trondheim** — slug bil-1-trondheim, type bilforhandler, moduler: catalog, inquiries, customers, ads true (booking false). Owner `eier@bil1.no` «Bjørn Tangen». 3 categories (SUV/Stasjonsvogn/Elbil), ~6 products price_type=fixed price_unit=stk (VW Golf 2019 189000 m/ realistiske attrs osv.), attribute_schemas: aar number REQ, km number REQ, drivstoff select [Bensin,Diesel,Hybrid,El] REQ, girkasse select [Manuell,Automat], farge text, reg_nr text (show_in catalog), 4 inquiries, 6 customers, 1 sent campaign, reviews ×3, site_status, integrations (meta connected for ads).
3. **Moen Bygg** — slug moen-bygg, type tomrer, moduler: catalog, inquiries true (resten false). Owner `eier@moenbygg.no` «Bård Moen». Categories (Uteprosjekt/Innredning/Reparasjon), products Terrassebygging/Hytteombygging/Kjøkkenmontering price_type=on_request (price 0), attribute_schemas: prismodell select [Fastpris, Timepris], krever_befaring bool, estimat_timer number; 5 inquiries (tilbudsforespørsler, noen med lange meldinger), 4 customers, 2 pages, site_status.
4. **Bygg & Bo AS** — slug bygg-og-bo, type annet, ALL modules false (pure website customer → reduced menu). Owner `eier@byggbo.no` «Berit Bø». Basis-pakke. 2 pages, site_status, report_settings. No catalog/booking/inquiry content.

Agency extras: agency_tasks ×4 (2 general, 2 business-scoped, mix open/done, due dates). ai_jobs ×3 (security_scan daily alle 4; seo weekly Frisør+Bil; review_replies event Frisør) + ai_job_runs history ~10 rows spread businesses/results (ok/findings), show_status_to_client mirrored from job notifications.

File fields (logo, images, thumbnails, avatar): attempt MCP file upload if supported; otherwise leave empty and note in LEDGER (UI must render placeholder). DO NOT block seed on files.

## 7. Deferred server hooks (TODO — tracked in LEDGER + Notion)

1. subscription→modules sync (NP Admin writes both for now, batch)
2. customer dedup on public booking/inquiry create (+ customer relation set)
3. deposit calculation + Vipps callback (deposit fields locked from public create)
4. reviews sync from Google/Facebook (create locked; seeded as superuser)
5. last-owner lockout guard on agency_members
6. review_request SMS scheduling (businesses.settings.review_request)
