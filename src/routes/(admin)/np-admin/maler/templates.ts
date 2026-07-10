/**
 * Route-local metadata for the Maler page. Content templates are grouped by
 * `type`; each type carries a Norwegian label + a one-line helper describing
 * where the customer uses it. Kept out of shared code — this is admin-only copy.
 */
import { ContentTemplatesTypeOptions } from '$lib/pocketbase-types';

export interface TemplateType {
	value: ContentTemplatesTypeOptions;
	label: string;
	helper: string;
}

export const TEMPLATE_TYPES: readonly TemplateType[] = [
	{
		value: ContentTemplatesTypeOptions.social_post,
		label: 'Sosiale medier',
		helper: 'Ferdige poster til Facebook og Instagram — med flettefelt som {tilbud}.'
	},
	{
		value: ContentTemplatesTypeOptions.email,
		label: 'E-post',
		helper: 'Maler for e-postkampanjer og nyhetsbrev til kundelisten.'
	},
	{
		value: ContentTemplatesTypeOptions.sms,
		label: 'SMS',
		helper: 'Korte meldinger — påminnelser, bekreftelser og forespørsler.'
	},
	{
		value: ContentTemplatesTypeOptions.review_reply,
		label: 'Svar på anmeldelser',
		helper: 'Standardsvar bedriften kan bruke når de svarer på anmeldelser.'
	}
];
