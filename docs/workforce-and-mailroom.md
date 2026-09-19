# Business workforce and Mailroom

The registry defines 12 business agents for each of the 15 campus businesses. Existing specialist identities and flow references remain intact. Books uses the `publishing` project. The previous `contraxis.computer` infrastructure helper remains in the database separately; it is not one of the 12 business positions.

The production database was provisioned with 180 business-agent rows using insert-on-conflict-do-nothing, and business-specific expertise was added only where absent. Existing objectives, tools, memory keys, and execution status were preserved. New task creation now preserves existing records rather than resetting them.

Manage teams (`/agents`) shows saved records, worker health, specialist briefs, and draft-task assignment. Saved objectives are read on the next worker task. This does not activate scheduled work or grant external tool access.

Floating chat defaults to Direct office AI. Each business has 12 selectable agents, stored conversations, and synchronous replies using the existing server-side Anthropic connection. It can advise and draft; it cannot execute external actions. The separate External lead hub option keeps the pre-existing webhook route. Hub replies still require `/api/lead-inbound`; a hub acceptance is not a reply.

The Mailroom (`/email`) uses the existing server-side `RESEND_API_KEY`. Cixy can save email drafts through `draft_email` and read mail actually routed through Resend. The owner reviews immutable drafts and submits them through Send this email. Atomic claims and a provider idempotency key prevent duplicate sends. Ambiguous attempts are retained as unconfirmed and are not retried automatically. Submitted means provider acceptance, not delivery.

The main sender is `awad@apixis.dev`; business senders use their `@apixis.dev` aliases. Content uses `contentbot`. Existing forwarding is unchanged. Alias existence and domain verification must be checked at the mail provider; no DNS changes were made. Resend receiving is not access to the full Gmail inbox.

Apply the two dated migrations in this change before deployment. New tables are service-role only with RLS and revoked browser grants. Owner checks protect all mail, team controls, office conversations, and the Cixy endpoint. Do not expose provider credentials through client components.

Remaining execution work: Gmail authorization and inbox synchronization; verified Meta/Google Ads connections and launch tools; prospect sourcing, durable contact/suppression history, and automated outreach; worker tools for repository fixes and other business actions. The UI intentionally does not claim these are active.
