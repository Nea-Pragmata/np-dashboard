/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export const Collections = {
	Authorigins: "_authOrigins",
	Externalauths: "_externalAuths",
	Mfas: "_mfas",
	Otps: "_otps",
	Superusers: "_superusers",
	AddonServices: "addon_services",
	AdminBusinessOverview: "admin_business_overview",
	AgencyCallSlots: "agency_call_slots",
	AgencyCampaigns: "agency_campaigns",
	AgencyLeads: "agency_leads",
	AgencyMembers: "agency_members",
	AgencyTasks: "agency_tasks",
	AiJobRuns: "ai_job_runs",
	AiJobs: "ai_jobs",
	AttributeSchemas: "attribute_schemas",
	BookingSettings: "booking_settings",
	Bookings: "bookings",
	Businesses: "businesses",
	Campaigns: "campaigns",
	Categories: "categories",
	ContentTemplates: "content_templates",
	Customers: "customers",
	Forms: "forms",
	Inquiries: "inquiries",
	IntegrationStatus: "integration_status",
	Integrations: "integrations",
	LinkEvents: "link_events",
	LinkPages: "link_pages",
	Links: "links",
	Packages: "packages",
	Pages: "pages",
	Products: "products",
	PublicBookedSlots: "public_booked_slots",
	PublicBookingConfig: "public_booking_config",
	PublicBusinessProfiles: "public_business_profiles",
	ReportSettings: "report_settings",
	Resources: "resources",
	Reviews: "reviews",
	SiteEvents: "site_events",
	SiteStatus: "site_status",
	SocialPosts: "social_posts",
	StatsOverview: "stats_overview",
	Subscriptions: "subscriptions",
	Users: "users",
	WaitlistEntries: "waitlist_entries",
} as const
export type Collections = typeof Collections[keyof typeof Collections]

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export const AddonServicesPriceTypeOptions = {
	"monthly": "monthly",
	"one_time": "one_time",
} as const
export type AddonServicesPriceTypeOptions = typeof AddonServicesPriceTypeOptions[keyof typeof AddonServicesPriceTypeOptions]
export type AddonServicesRecord = {
	created: IsoAutoDateString
	description: string
	id: string
	name: string
	price: number
	price_type: AddonServicesPriceTypeOptions
	published?: boolean
	sort_order?: number
	updated: IsoAutoDateString
}

export const AdminBusinessOverviewTypeOptions = {
	"frisor": "frisor",
	"bilforhandler": "bilforhandler",
	"tomrer": "tomrer",
	"annet": "annet",
} as const
export type AdminBusinessOverviewTypeOptions = typeof AdminBusinessOverviewTypeOptions[keyof typeof AdminBusinessOverviewTypeOptions]

export const AdminBusinessOverviewStatusOptions = {
	"active": "active",
	"onboarding": "onboarding",
	"paused": "paused",
} as const
export type AdminBusinessOverviewStatusOptions = typeof AdminBusinessOverviewStatusOptions[keyof typeof AdminBusinessOverviewStatusOptions]
export type AdminBusinessOverviewRecord<Tmodule_count = unknown> = {
	id: string
	last_active?: IsoDateString
	module_count?: null | Tmodule_count
	name: string
	package_name: string
	status: AdminBusinessOverviewStatusOptions
	type: AdminBusinessOverviewTypeOptions
}

export const AgencyCallSlotsStatusOptions = {
	"open": "open",
	"booked": "booked",
} as const
export type AgencyCallSlotsStatusOptions = typeof AgencyCallSlotsStatusOptions[keyof typeof AgencyCallSlotsStatusOptions]
export type AgencyCallSlotsRecord = {
	created: IsoAutoDateString
	id: string
	lead?: RecordIdString
	starts: IsoDateString
	status: AgencyCallSlotsStatusOptions
	updated: IsoAutoDateString
}

export const AgencyCampaignsDiscountTypeOptions = {
	"percent": "percent",
	"amount": "amount",
} as const
export type AgencyCampaignsDiscountTypeOptions = typeof AgencyCampaignsDiscountTypeOptions[keyof typeof AgencyCampaignsDiscountTypeOptions]
export type AgencyCampaignsRecord = {
	created: IsoAutoDateString
	description: string
	discount_type: AgencyCampaignsDiscountTypeOptions
	discount_value: number
	id: string
	name: string
	packages?: RecordIdString[]
	published?: boolean
	updated: IsoAutoDateString
	valid_from: IsoDateString
	valid_to: IsoDateString
}

export const AgencyLeadsSourceOptions = {
	"website": "website",
	"referral": "referral",
	"other": "other",
} as const
export type AgencyLeadsSourceOptions = typeof AgencyLeadsSourceOptions[keyof typeof AgencyLeadsSourceOptions]

export const AgencyLeadsStatusOptions = {
	"new": "new",
	"in_dialog": "in_dialog",
	"won": "won",
	"lost": "lost",
} as const
export type AgencyLeadsStatusOptions = typeof AgencyLeadsStatusOptions[keyof typeof AgencyLeadsStatusOptions]
export type AgencyLeadsRecord = {
	call_time?: string
	company?: string
	created: IsoAutoDateString
	email: string
	id: string
	message?: string
	name: string
	phone?: string
	source: AgencyLeadsSourceOptions
	status: AgencyLeadsStatusOptions
	updated: IsoAutoDateString
}

export const AgencyMembersRoleOptions = {
	"owner": "owner",
	"staff": "staff",
} as const
export type AgencyMembersRoleOptions = typeof AgencyMembersRoleOptions[keyof typeof AgencyMembersRoleOptions]

export const AgencyMembersStatusOptions = {
	"active": "active",
	"invited": "invited",
	"disabled": "disabled",
} as const
export type AgencyMembersStatusOptions = typeof AgencyMembersStatusOptions[keyof typeof AgencyMembersStatusOptions]
export type AgencyMembersRecord = {
	allowed_businesses?: RecordIdString[]
	created: IsoAutoDateString
	id: string
	invited_by?: RecordIdString
	note?: string
	role: AgencyMembersRoleOptions
	status: AgencyMembersStatusOptions
	updated: IsoAutoDateString
	user: RecordIdString
}

export const AgencyTasksStatusOptions = {
	"open": "open",
	"done": "done",
} as const
export type AgencyTasksStatusOptions = typeof AgencyTasksStatusOptions[keyof typeof AgencyTasksStatusOptions]
export type AgencyTasksRecord = {
	business?: RecordIdString
	created: IsoAutoDateString
	due_date?: IsoDateString
	id: string
	status: AgencyTasksStatusOptions
	text: string
	updated: IsoAutoDateString
}

export const AiJobRunsResultOptions = {
	"ok": "ok",
	"findings": "findings",
	"error": "error",
} as const
export type AiJobRunsResultOptions = typeof AiJobRunsResultOptions[keyof typeof AiJobRunsResultOptions]
export type AiJobRunsRecord<Tfindings = unknown> = {
	business: RecordIdString
	created: IsoAutoDateString
	findings?: null | Tfindings
	id: string
	job: RecordIdString
	ran_at: IsoDateString
	result: AiJobRunsResultOptions
	show_status_to_client?: boolean
	updated: IsoAutoDateString
}

export const AiJobsTypeOptions = {
	"security_scan": "security_scan",
	"seo": "seo",
	"content_suggestions": "content_suggestions",
	"review_replies": "review_replies",
	"alt_text": "alt_text",
} as const
export type AiJobsTypeOptions = typeof AiJobsTypeOptions[keyof typeof AiJobsTypeOptions]

export const AiJobsIntervalOptions = {
	"daily": "daily",
	"weekly": "weekly",
	"monthly": "monthly",
	"event": "event",
} as const
export type AiJobsIntervalOptions = typeof AiJobsIntervalOptions[keyof typeof AiJobsIntervalOptions]

export const AiJobsStatusOptions = {
	"active": "active",
	"paused": "paused",
} as const
export type AiJobsStatusOptions = typeof AiJobsStatusOptions[keyof typeof AiJobsStatusOptions]
export type AiJobsRecord<Tnotifications = unknown> = {
	businesses: RecordIdString[]
	created: IsoAutoDateString
	id: string
	interval: AiJobsIntervalOptions
	notifications?: null | Tnotifications
	run_at?: string
	status: AiJobsStatusOptions
	type: AiJobsTypeOptions
	updated: IsoAutoDateString
}

export const AttributeSchemasFieldTypeOptions = {
	"text": "text",
	"number": "number",
	"select": "select",
	"bool": "bool",
	"date": "date",
} as const
export type AttributeSchemasFieldTypeOptions = typeof AttributeSchemasFieldTypeOptions[keyof typeof AttributeSchemasFieldTypeOptions]

export const AttributeSchemasShowInOptions = {
	"booking": "booking",
	"catalog": "catalog",
} as const
export type AttributeSchemasShowInOptions = typeof AttributeSchemasShowInOptions[keyof typeof AttributeSchemasShowInOptions]
export type AttributeSchemasRecord<Toptions = unknown> = {
	business: RecordIdString
	category?: RecordIdString
	created: IsoAutoDateString
	field_type: AttributeSchemasFieldTypeOptions
	id: string
	key: string
	label: string
	options?: null | Toptions
	required?: boolean
	show_in?: AttributeSchemasShowInOptions[]
	sort_order?: number
	updated: IsoAutoDateString
}

export type BookingSettingsRecord<Tdeposit = unknown, Treminders = unknown, Twaitlist = unknown> = {
	business: RecordIdString
	created: IsoAutoDateString
	deposit?: null | Tdeposit
	id: string
	reminders?: null | Treminders
	updated: IsoAutoDateString
	waitlist?: null | Twaitlist
}

export const BookingsStatusOptions = {
	"pending": "pending",
	"confirmed": "confirmed",
	"cancelled": "cancelled",
	"done": "done",
} as const
export type BookingsStatusOptions = typeof BookingsStatusOptions[keyof typeof BookingsStatusOptions]

export const BookingsDepositStatusOptions = {
	"not_required": "not_required",
	"pending": "pending",
	"paid": "paid",
	"refunded": "refunded",
} as const
export type BookingsDepositStatusOptions = typeof BookingsDepositStatusOptions[keyof typeof BookingsDepositStatusOptions]

export const BookingsPaymentProviderOptions = {
	"vipps": "vipps",
} as const
export type BookingsPaymentProviderOptions = typeof BookingsPaymentProviderOptions[keyof typeof BookingsPaymentProviderOptions]
export type BookingsRecord = {
	business: RecordIdString
	created: IsoAutoDateString
	customer?: RecordIdString
	customer_email?: string
	customer_name?: string
	customer_phone?: string
	deposit_amount?: number
	deposit_status?: BookingsDepositStatusOptions
	end: IsoDateString
	id: string
	notes?: string
	payment_provider?: BookingsPaymentProviderOptions
	payment_ref?: string
	product: RecordIdString
	resource?: RecordIdString
	staff?: RecordIdString
	start: IsoDateString
	status: BookingsStatusOptions
	updated: IsoAutoDateString
}

export const BusinessesTypeOptions = {
	"frisor": "frisor",
	"bilforhandler": "bilforhandler",
	"tomrer": "tomrer",
	"annet": "annet",
} as const
export type BusinessesTypeOptions = typeof BusinessesTypeOptions[keyof typeof BusinessesTypeOptions]

export const BusinessesStatusOptions = {
	"active": "active",
	"onboarding": "onboarding",
	"paused": "paused",
} as const
export type BusinessesStatusOptions = typeof BusinessesStatusOptions[keyof typeof BusinessesStatusOptions]
export type BusinessesRecord<Tmodules = unknown, Topening_hours = unknown, Tsettings = unknown> = {
	address?: string
	contact_email?: string
	created: IsoAutoDateString
	id: string
	last_active?: IsoDateString
	logo?: FileNameString
	modules: null | Tmodules
	name: string
	opening_hours?: null | Topening_hours
	org_number?: string
	phone?: string
	primary_color?: string
	settings?: null | Tsettings
	slug: string
	status: BusinessesStatusOptions
	type: BusinessesTypeOptions
	updated: IsoAutoDateString
}

export const CampaignsChannelOptions = {
	"email": "email",
	"sms": "sms",
} as const
export type CampaignsChannelOptions = typeof CampaignsChannelOptions[keyof typeof CampaignsChannelOptions]

export const CampaignsStatusOptions = {
	"draft": "draft",
	"scheduled": "scheduled",
	"sent": "sent",
} as const
export type CampaignsStatusOptions = typeof CampaignsStatusOptions[keyof typeof CampaignsStatusOptions]
export type CampaignsRecord<Taudience = unknown, Tresults = unknown> = {
	audience?: null | Taudience
	business: RecordIdString
	channel: CampaignsChannelOptions
	created: IsoAutoDateString
	id: string
	message: HTMLString
	name: string
	results?: null | Tresults
	scheduled_at?: IsoDateString
	sent_at?: IsoDateString
	status: CampaignsStatusOptions
	subject?: string
	updated: IsoAutoDateString
}

export type CategoriesRecord = {
	business: RecordIdString
	created: IsoAutoDateString
	icon?: string
	id: string
	name: string
	parent?: RecordIdString
	slug: string
	sort_order?: number
	updated: IsoAutoDateString
}

export const ContentTemplatesTypeOptions = {
	"social_post": "social_post",
	"email": "email",
	"sms": "sms",
	"review_reply": "review_reply",
} as const
export type ContentTemplatesTypeOptions = typeof ContentTemplatesTypeOptions[keyof typeof ContentTemplatesTypeOptions]
export type ContentTemplatesRecord = {
	body: string
	business?: RecordIdString
	created: IsoAutoDateString
	id: string
	name: string
	type: ContentTemplatesTypeOptions
	updated: IsoAutoDateString
}

export type CustomersRecord<Tconsents = unknown, Tpunch_card = unknown> = {
	business: RecordIdString
	consents?: null | Tconsents
	created: IsoAutoDateString
	email?: string
	id: string
	last_visit?: IsoDateString
	name: string
	phone?: string
	punch_card?: null | Tpunch_card
	updated: IsoAutoDateString
	visit_count?: number
}

export const FormsStatusOptions = {
	"active": "active",
	"draft": "draft",
} as const
export type FormsStatusOptions = typeof FormsStatusOptions[keyof typeof FormsStatusOptions]
export type FormsRecord<Tfields = unknown> = {
	business: RecordIdString
	created: IsoAutoDateString
	fields: null | Tfields
	id: string
	name: string
	status: FormsStatusOptions
	updated: IsoAutoDateString
}

export const InquiriesStatusOptions = {
	"new": "new",
	"in_progress": "in_progress",
	"done": "done",
} as const
export type InquiriesStatusOptions = typeof InquiriesStatusOptions[keyof typeof InquiriesStatusOptions]

export const InquiriesSourceOptions = {
	"form": "form",
	"chat": "chat",
	"email": "email",
} as const
export type InquiriesSourceOptions = typeof InquiriesSourceOptions[keyof typeof InquiriesSourceOptions]
export type InquiriesRecord = {
	attachments?: FileNameString[]
	business: RecordIdString
	created: IsoAutoDateString
	customer?: RecordIdString
	email: string
	id: string
	message: string
	name: string
	phone?: string
	product?: RecordIdString
	source: InquiriesSourceOptions
	status: InquiriesStatusOptions
	updated: IsoAutoDateString
}

export const IntegrationStatusProviderOptions = {
	"vipps": "vipps",
	"stripe": "stripe",
	"google": "google",
	"meta": "meta",
	"sms": "sms",
	"email": "email",
} as const
export type IntegrationStatusProviderOptions = typeof IntegrationStatusProviderOptions[keyof typeof IntegrationStatusProviderOptions]

export const IntegrationStatusStatusOptions = {
	"connected": "connected",
	"error": "error",
	"not_connected": "not_connected",
} as const
export type IntegrationStatusStatusOptions = typeof IntegrationStatusStatusOptions[keyof typeof IntegrationStatusStatusOptions]
export type IntegrationStatusRecord = {
	business: RecordIdString
	id: string
	provider: IntegrationStatusProviderOptions
	status: IntegrationStatusStatusOptions
	updated: IsoAutoDateString
}

export const IntegrationsProviderOptions = {
	"vipps": "vipps",
	"stripe": "stripe",
	"google": "google",
	"meta": "meta",
	"sms": "sms",
	"email": "email",
} as const
export type IntegrationsProviderOptions = typeof IntegrationsProviderOptions[keyof typeof IntegrationsProviderOptions]

export const IntegrationsStatusOptions = {
	"connected": "connected",
	"error": "error",
	"not_connected": "not_connected",
} as const
export type IntegrationsStatusOptions = typeof IntegrationsStatusOptions[keyof typeof IntegrationsStatusOptions]
export type IntegrationsRecord<Tconfig = unknown> = {
	business: RecordIdString
	config?: null | Tconfig
	created: IsoAutoDateString
	id: string
	provider: IntegrationsProviderOptions
	status: IntegrationsStatusOptions
	updated: IsoAutoDateString
}

export const LinkEventsTypeOptions = {
	"page_visit": "page_visit",
	"link_click": "link_click",
} as const
export type LinkEventsTypeOptions = typeof LinkEventsTypeOptions[keyof typeof LinkEventsTypeOptions]
export type LinkEventsRecord = {
	business: RecordIdString
	country?: string
	created: IsoAutoDateString
	id: string
	link?: RecordIdString
	link_page?: RecordIdString
	referrer?: string
	type: LinkEventsTypeOptions
	updated: IsoAutoDateString
}

export type LinkPagesRecord<Ttheme = unknown> = {
	avatar?: FileNameString
	bio?: string
	business: RecordIdString
	created: IsoAutoDateString
	id: string
	published?: boolean
	slug: string
	theme?: null | Ttheme
	title: string
	updated: IsoAutoDateString
	visit_count?: number
}

export type LinksRecord = {
	active?: boolean
	business: RecordIdString
	click_count?: number
	code: string
	created: IsoAutoDateString
	icon?: string
	id: string
	label: string
	link_page?: RecordIdString
	sort_order?: number
	target_url: string
	updated: IsoAutoDateString
}

export type PackagesRecord<Tdefault_modules = unknown, Thighlights = unknown> = {
	created: IsoAutoDateString
	default_modules: null | Tdefault_modules
	description: HTMLString
	highlights?: null | Thighlights
	id: string
	name: string
	price_per_month: number
	published?: boolean
	slug: string
	sort_order?: number
	updated: IsoAutoDateString
}

export const PagesStatusOptions = {
	"published": "published",
	"draft": "draft",
} as const
export type PagesStatusOptions = typeof PagesStatusOptions[keyof typeof PagesStatusOptions]
export type PagesRecord = {
	business: RecordIdString
	created: IsoAutoDateString
	heading: string
	id: string
	images?: FileNameString[]
	intro_text: string
	name: string
	slug: string
	status: PagesStatusOptions
	updated: IsoAutoDateString
}

export const ProductsPriceTypeOptions = {
	"fixed": "fixed",
	"from": "from",
	"on_request": "on_request",
} as const
export type ProductsPriceTypeOptions = typeof ProductsPriceTypeOptions[keyof typeof ProductsPriceTypeOptions]

export const ProductsPriceUnitOptions = {
	"stk": "stk",
	"time": "time",
	"per_m2": "per_m2",
} as const
export type ProductsPriceUnitOptions = typeof ProductsPriceUnitOptions[keyof typeof ProductsPriceUnitOptions]

export const ProductsStatusOptions = {
	"active": "active",
	"hidden": "hidden",
	"sold": "sold",
} as const
export type ProductsStatusOptions = typeof ProductsStatusOptions[keyof typeof ProductsStatusOptions]
export type ProductsRecord<Tattributes = unknown> = {
	attributes?: null | Tattributes
	bookable?: boolean
	business: RecordIdString
	category: RecordIdString
	created: IsoAutoDateString
	description?: HTMLString
	external_id?: string
	featured?: boolean
	id: string
	images?: FileNameString[]
	name: string
	price?: number
	price_type: ProductsPriceTypeOptions
	price_unit?: ProductsPriceUnitOptions
	slug: string
	sort_order?: number
	status: ProductsStatusOptions
	updated: IsoAutoDateString
}

export type PublicBookedSlotsRecord = {
	business: RecordIdString
	end: IsoDateString
	id: string
	product: RecordIdString
	start: IsoDateString
}

export type PublicBookingConfigRecord<Tcancellation_deadline_hours = unknown, Tdeposit_enabled = unknown, Tdeposit_percent = unknown, Twaitlist_enabled = unknown> = {
	business: RecordIdString
	cancellation_deadline_hours?: null | Tcancellation_deadline_hours
	deposit_enabled?: null | Tdeposit_enabled
	deposit_percent?: null | Tdeposit_percent
	id: string
	waitlist_enabled?: null | Twaitlist_enabled
}

export type PublicBusinessProfilesRecord<Topening_hours = unknown> = {
	address?: string
	contact_email?: string
	id: string
	logo?: FileNameString
	name: string
	opening_hours?: null | Topening_hours
	org_number?: string
	phone?: string
	primary_color?: string
	slug: string
}

export const ReportSettingsFrequencyOptions = {
	"weekly": "weekly",
	"monthly": "monthly",
} as const
export type ReportSettingsFrequencyOptions = typeof ReportSettingsFrequencyOptions[keyof typeof ReportSettingsFrequencyOptions]
export type ReportSettingsRecord = {
	business: RecordIdString
	created: IsoAutoDateString
	enabled?: boolean
	frequency?: ReportSettingsFrequencyOptions
	id: string
	recipient_email?: string
	updated: IsoAutoDateString
}

export type ResourcesRecord = {
	active?: boolean
	business: RecordIdString
	created: IsoAutoDateString
	id: string
	name: string
	staff?: RecordIdString
	updated: IsoAutoDateString
}

export const ReviewsPlatformOptions = {
	"google": "google",
	"facebook": "facebook",
} as const
export type ReviewsPlatformOptions = typeof ReviewsPlatformOptions[keyof typeof ReviewsPlatformOptions]

export const ReviewsStatusOptions = {
	"new": "new",
	"replied": "replied",
} as const
export type ReviewsStatusOptions = typeof ReviewsStatusOptions[keyof typeof ReviewsStatusOptions]
export type ReviewsRecord = {
	author: string
	business: RecordIdString
	created: IsoAutoDateString
	id: string
	platform: ReviewsPlatformOptions
	posted_at: IsoDateString
	rating: number
	replied_at?: IsoDateString
	reply_text?: string
	status: ReviewsStatusOptions
	text?: string
	updated: IsoAutoDateString
}

export const SiteEventsTypeOptions = {
	"page_view": "page_view",
	"ring": "ring",
	"veibeskrivelse": "veibeskrivelse",
	"bestill-time": "bestill-time",
	"skjema-sendt": "skjema-sendt",
} as const
export type SiteEventsTypeOptions = typeof SiteEventsTypeOptions[keyof typeof SiteEventsTypeOptions]
export type SiteEventsRecord = {
	business: RecordIdString
	country?: string
	created: IsoAutoDateString
	id: string
	is_unique?: boolean
	path?: string
	referrer?: string
	type: SiteEventsTypeOptions
	updated: IsoAutoDateString
}

export const SiteStatusSslStatusOptions = {
	"ok": "ok",
	"warning": "warning",
	"error": "error",
} as const
export type SiteStatusSslStatusOptions = typeof SiteStatusSslStatusOptions[keyof typeof SiteStatusSslStatusOptions]
export type SiteStatusRecord = {
	business: RecordIdString
	created: IsoAutoDateString
	id: string
	last_backup?: IsoDateString
	seo_review_date?: IsoDateString
	ssl_status?: SiteStatusSslStatusOptions
	updated: IsoAutoDateString
	uptime?: number
}

export const SocialPostsChannelOptions = {
	"instagram": "instagram",
	"facebook": "facebook",
} as const
export type SocialPostsChannelOptions = typeof SocialPostsChannelOptions[keyof typeof SocialPostsChannelOptions]

export const SocialPostsStatusOptions = {
	"draft": "draft",
	"pending_approval": "pending_approval",
	"approved": "approved",
	"published": "published",
} as const
export type SocialPostsStatusOptions = typeof SocialPostsStatusOptions[keyof typeof SocialPostsStatusOptions]
export type SocialPostsRecord = {
	business: RecordIdString
	channel: SocialPostsChannelOptions
	content: string
	created: IsoAutoDateString
	id: string
	scheduled_at?: IsoDateString
	status: SocialPostsStatusOptions
	thumbnail?: FileNameString
	updated: IsoAutoDateString
}

export type StatsOverviewRecord<Tbookings_30d = unknown, Tclicks_30d = unknown, Tnew_inquiries = unknown, Tvisits_30d = unknown> = {
	bookings_30d?: null | Tbookings_30d
	business?: RecordIdString
	clicks_30d?: null | Tclicks_30d
	id: string
	new_inquiries?: null | Tnew_inquiries
	visits_30d?: null | Tvisits_30d
}

export const SubscriptionsStatusOptions = {
	"active": "active",
	"paused": "paused",
	"ended": "ended",
} as const
export type SubscriptionsStatusOptions = typeof SubscriptionsStatusOptions[keyof typeof SubscriptionsStatusOptions]

export const SubscriptionsBillingIntervalOptions = {
	"month": "month",
	"year": "year",
} as const
export type SubscriptionsBillingIntervalOptions = typeof SubscriptionsBillingIntervalOptions[keyof typeof SubscriptionsBillingIntervalOptions]
export type SubscriptionsRecord = {
	addons?: RecordIdString[]
	billing_interval?: SubscriptionsBillingIntervalOptions
	business: RecordIdString
	campaign?: RecordIdString
	created: IsoAutoDateString
	id: string
	invoice_note?: string
	package: RecordIdString
	price_override?: number
	setup_fee?: number
	start_date: IsoDateString
	status: SubscriptionsStatusOptions
	updated: IsoAutoDateString
}

export const UsersRoleOptions = {
	"owner": "owner",
	"staff": "staff",
} as const
export type UsersRoleOptions = typeof UsersRoleOptions[keyof typeof UsersRoleOptions]

export const UsersStatusOptions = {
	"active": "active",
	"invited": "invited",
} as const
export type UsersStatusOptions = typeof UsersStatusOptions[keyof typeof UsersStatusOptions]
export type UsersRecord = {
	avatar?: FileNameString
	business?: RecordIdString
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	last_active?: IsoDateString
	name: string
	password: string
	role: UsersRoleOptions
	status?: UsersStatusOptions
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export const WaitlistEntriesStatusOptions = {
	"waiting": "waiting",
	"notified": "notified",
	"booked": "booked",
	"expired": "expired",
} as const
export type WaitlistEntriesStatusOptions = typeof WaitlistEntriesStatusOptions[keyof typeof WaitlistEntriesStatusOptions]
export type WaitlistEntriesRecord = {
	business: RecordIdString
	created: IsoAutoDateString
	customer?: RecordIdString
	desired_date?: IsoDateString
	id: string
	product: RecordIdString
	status: WaitlistEntriesStatusOptions
	updated: IsoAutoDateString
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type AddonServicesResponse<Texpand = unknown> = Required<AddonServicesRecord> & BaseSystemFields<Texpand>
export type AdminBusinessOverviewResponse<Tmodule_count = unknown, Texpand = unknown> = Required<AdminBusinessOverviewRecord<Tmodule_count>> & BaseSystemFields<Texpand>
export type AgencyCallSlotsResponse<Texpand = unknown> = Required<AgencyCallSlotsRecord> & BaseSystemFields<Texpand>
export type AgencyCampaignsResponse<Texpand = unknown> = Required<AgencyCampaignsRecord> & BaseSystemFields<Texpand>
export type AgencyLeadsResponse<Texpand = unknown> = Required<AgencyLeadsRecord> & BaseSystemFields<Texpand>
export type AgencyMembersResponse<Texpand = unknown> = Required<AgencyMembersRecord> & BaseSystemFields<Texpand>
export type AgencyTasksResponse<Texpand = unknown> = Required<AgencyTasksRecord> & BaseSystemFields<Texpand>
export type AiJobRunsResponse<Tfindings = unknown, Texpand = unknown> = Required<AiJobRunsRecord<Tfindings>> & BaseSystemFields<Texpand>
export type AiJobsResponse<Tnotifications = unknown, Texpand = unknown> = Required<AiJobsRecord<Tnotifications>> & BaseSystemFields<Texpand>
export type AttributeSchemasResponse<Toptions = unknown, Texpand = unknown> = Required<AttributeSchemasRecord<Toptions>> & BaseSystemFields<Texpand>
export type BookingSettingsResponse<Tdeposit = unknown, Treminders = unknown, Twaitlist = unknown, Texpand = unknown> = Required<BookingSettingsRecord<Tdeposit, Treminders, Twaitlist>> & BaseSystemFields<Texpand>
export type BookingsResponse<Texpand = unknown> = Required<BookingsRecord> & BaseSystemFields<Texpand>
export type BusinessesResponse<Tmodules = unknown, Topening_hours = unknown, Tsettings = unknown, Texpand = unknown> = Required<BusinessesRecord<Tmodules, Topening_hours, Tsettings>> & BaseSystemFields<Texpand>
export type CampaignsResponse<Taudience = unknown, Tresults = unknown, Texpand = unknown> = Required<CampaignsRecord<Taudience, Tresults>> & BaseSystemFields<Texpand>
export type CategoriesResponse<Texpand = unknown> = Required<CategoriesRecord> & BaseSystemFields<Texpand>
export type ContentTemplatesResponse<Texpand = unknown> = Required<ContentTemplatesRecord> & BaseSystemFields<Texpand>
export type CustomersResponse<Tconsents = unknown, Tpunch_card = unknown, Texpand = unknown> = Required<CustomersRecord<Tconsents, Tpunch_card>> & BaseSystemFields<Texpand>
export type FormsResponse<Tfields = unknown, Texpand = unknown> = Required<FormsRecord<Tfields>> & BaseSystemFields<Texpand>
export type InquiriesResponse<Texpand = unknown> = Required<InquiriesRecord> & BaseSystemFields<Texpand>
export type IntegrationStatusResponse<Texpand = unknown> = Required<IntegrationStatusRecord> & BaseSystemFields<Texpand>
export type IntegrationsResponse<Tconfig = unknown, Texpand = unknown> = Required<IntegrationsRecord<Tconfig>> & BaseSystemFields<Texpand>
export type LinkEventsResponse<Texpand = unknown> = Required<LinkEventsRecord> & BaseSystemFields<Texpand>
export type LinkPagesResponse<Ttheme = unknown, Texpand = unknown> = Required<LinkPagesRecord<Ttheme>> & BaseSystemFields<Texpand>
export type LinksResponse<Texpand = unknown> = Required<LinksRecord> & BaseSystemFields<Texpand>
export type PackagesResponse<Tdefault_modules = unknown, Thighlights = unknown, Texpand = unknown> = Required<PackagesRecord<Tdefault_modules, Thighlights>> & BaseSystemFields<Texpand>
export type PagesResponse<Texpand = unknown> = Required<PagesRecord> & BaseSystemFields<Texpand>
export type ProductsResponse<Tattributes = unknown, Texpand = unknown> = Required<ProductsRecord<Tattributes>> & BaseSystemFields<Texpand>
export type PublicBookedSlotsResponse<Texpand = unknown> = Required<PublicBookedSlotsRecord> & BaseSystemFields<Texpand>
export type PublicBookingConfigResponse<Tcancellation_deadline_hours = unknown, Tdeposit_enabled = unknown, Tdeposit_percent = unknown, Twaitlist_enabled = unknown, Texpand = unknown> = Required<PublicBookingConfigRecord<Tcancellation_deadline_hours, Tdeposit_enabled, Tdeposit_percent, Twaitlist_enabled>> & BaseSystemFields<Texpand>
export type PublicBusinessProfilesResponse<Topening_hours = unknown, Texpand = unknown> = Required<PublicBusinessProfilesRecord<Topening_hours>> & BaseSystemFields<Texpand>
export type ReportSettingsResponse<Texpand = unknown> = Required<ReportSettingsRecord> & BaseSystemFields<Texpand>
export type ResourcesResponse<Texpand = unknown> = Required<ResourcesRecord> & BaseSystemFields<Texpand>
export type ReviewsResponse<Texpand = unknown> = Required<ReviewsRecord> & BaseSystemFields<Texpand>
export type SiteEventsResponse<Texpand = unknown> = Required<SiteEventsRecord> & BaseSystemFields<Texpand>
export type SiteStatusResponse<Texpand = unknown> = Required<SiteStatusRecord> & BaseSystemFields<Texpand>
export type SocialPostsResponse<Texpand = unknown> = Required<SocialPostsRecord> & BaseSystemFields<Texpand>
export type StatsOverviewResponse<Tbookings_30d = unknown, Tclicks_30d = unknown, Tnew_inquiries = unknown, Tvisits_30d = unknown, Texpand = unknown> = Required<StatsOverviewRecord<Tbookings_30d, Tclicks_30d, Tnew_inquiries, Tvisits_30d>> & BaseSystemFields<Texpand>
export type SubscriptionsResponse<Texpand = unknown> = Required<SubscriptionsRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>
export type WaitlistEntriesResponse<Texpand = unknown> = Required<WaitlistEntriesRecord> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	addon_services: AddonServicesRecord
	admin_business_overview: AdminBusinessOverviewRecord
	agency_call_slots: AgencyCallSlotsRecord
	agency_campaigns: AgencyCampaignsRecord
	agency_leads: AgencyLeadsRecord
	agency_members: AgencyMembersRecord
	agency_tasks: AgencyTasksRecord
	ai_job_runs: AiJobRunsRecord
	ai_jobs: AiJobsRecord
	attribute_schemas: AttributeSchemasRecord
	booking_settings: BookingSettingsRecord
	bookings: BookingsRecord
	businesses: BusinessesRecord
	campaigns: CampaignsRecord
	categories: CategoriesRecord
	content_templates: ContentTemplatesRecord
	customers: CustomersRecord
	forms: FormsRecord
	inquiries: InquiriesRecord
	integration_status: IntegrationStatusRecord
	integrations: IntegrationsRecord
	link_events: LinkEventsRecord
	link_pages: LinkPagesRecord
	links: LinksRecord
	packages: PackagesRecord
	pages: PagesRecord
	products: ProductsRecord
	public_booked_slots: PublicBookedSlotsRecord
	public_booking_config: PublicBookingConfigRecord
	public_business_profiles: PublicBusinessProfilesRecord
	report_settings: ReportSettingsRecord
	resources: ResourcesRecord
	reviews: ReviewsRecord
	site_events: SiteEventsRecord
	site_status: SiteStatusRecord
	social_posts: SocialPostsRecord
	stats_overview: StatsOverviewRecord
	subscriptions: SubscriptionsRecord
	users: UsersRecord
	waitlist_entries: WaitlistEntriesRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	addon_services: AddonServicesResponse
	admin_business_overview: AdminBusinessOverviewResponse
	agency_call_slots: AgencyCallSlotsResponse
	agency_campaigns: AgencyCampaignsResponse
	agency_leads: AgencyLeadsResponse
	agency_members: AgencyMembersResponse
	agency_tasks: AgencyTasksResponse
	ai_job_runs: AiJobRunsResponse
	ai_jobs: AiJobsResponse
	attribute_schemas: AttributeSchemasResponse
	booking_settings: BookingSettingsResponse
	bookings: BookingsResponse
	businesses: BusinessesResponse
	campaigns: CampaignsResponse
	categories: CategoriesResponse
	content_templates: ContentTemplatesResponse
	customers: CustomersResponse
	forms: FormsResponse
	inquiries: InquiriesResponse
	integration_status: IntegrationStatusResponse
	integrations: IntegrationsResponse
	link_events: LinkEventsResponse
	link_pages: LinkPagesResponse
	links: LinksResponse
	packages: PackagesResponse
	pages: PagesResponse
	products: ProductsResponse
	public_booked_slots: PublicBookedSlotsResponse
	public_booking_config: PublicBookingConfigResponse
	public_business_profiles: PublicBusinessProfilesResponse
	report_settings: ReportSettingsResponse
	resources: ResourcesResponse
	reviews: ReviewsResponse
	site_events: SiteEventsResponse
	site_status: SiteStatusResponse
	social_posts: SocialPostsResponse
	stats_overview: StatsOverviewResponse
	subscriptions: SubscriptionsResponse
	users: UsersResponse
	waitlist_entries: WaitlistEntriesResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
