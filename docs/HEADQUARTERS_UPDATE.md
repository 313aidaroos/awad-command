# Cixy Headquarters and Business Campus

Enter Command Center now opens `/command`, the vintage Cixy executive room. The former orbital experience remains at `/empire`, outside primary navigation. Home includes a chart preview and a short monitor-entry transition, respecting reduced motion.

Headquarters uses the existing Cixy API and voice hook. Microphone capture begins only after tapping the voice button; browser support and permission are required. Typing remains available. Existing approval and computer panels are preserved. News comes from BBC World and CoinDesk RSS; historical OHLC candles come from Coinbase Exchange, refreshed every five minutes. Coinbase format: https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles

Private operations require the existing authenticated allowed-email account. The read-only endpoint reads existing agent_tasks, sales and expenses tables in the configured Supabase schema. Totals cover recorded USD entries only, exclude other or unknown currencies, and withhold net totals when incomplete. Cash accounts are not connected. No schema changes, credentials, new environment variables, or changes to trading execution are included.

No calendar or scheduled publishing adapter was present in this repository. The calendar/content panels therefore provide explicitly labeled device reminders, not fake events or scheduled posts. Personal notes use localStorage and do not send messages, create calendar events, notify, or publish. Cixy receives these records as dashboard context, labeled as untrusted data.

Business World includes fifteen company/studio offices drawn from the existing module/project registries: the eight -xis companies, AwadBot, Qahwahworld, Recovra, Nursery Toons, Content Studio, Books & Media, and AWAD Studios. Books maps to the existing publishing roster. Companies without configured agents show that state. Agent names/roles are configured definitions, not evidence of running workers. Current task labels come from the private operations endpoint, bounded to the latest thirty active/failed records. Ambient illustrations are not live execution telemetry.

The exchange entrance is inspired by the NYSE facade and links to the existing Crypto Floor. A grand exchange interior replaces its background artwork; the existing four desks, sixteen selectable agent portraits, replay and explicit PAPER PREVIEW labels remain. This update does not create or enable trading agents.

## Merge and deployment

Apply this branch/PR to the existing repository; do not replace the repository with a starter. Keep existing environment variables, backend routes, workers, auth configuration, and Supabase policies. No database migration is required. Deployment uses the repository's existing Vercel Git integration. Revert this PR to roll back the frontend and new read-only endpoints.

Verification: TypeScript, production build, 92 unit tests including currency separation, RSS URL validation, candle integrity, invalid local storage and denied unauthenticated private access. Browser checks cover HQ, Home entrance, reminder persistence, campus selection and responsive widths. Microphone audio requires testing on the user's browser/device; it is not claimed as hardware-tested.

## Generated artwork

Assets are stored under public/headquarters, public/business-world, and public/crypto-floor/exchange-room.png. Existing artwork was retained for rollback. No generated numbers or chart pixels are treated as live data.

Prompts used:
- Cixy: centered pixel-anime woman with black hair and blazer, at a walnut desk with amber lamps and map, based on the approved concept; no UI/text/frame.
- First campus sheet: eight equal 4x2 isometric open-roof office rooms, adult anime agents, walnut/brass, blue engineering, violet social, orange contractor, emerald finance, bronze materials, magenta music, cyan geospatial, purple launch; no text/logos.
- Expanded campus sheet: eight equal 4x2 cells: teal finance cubicles, amber coffee operations, mint invoice recovery, coral animation, violet video editing, golden publishing, blue media production, then neoclassical exchange facade with six Corinthian columns, pediment, steps and flags; pixel-anime, no text/logos.
- Exchange interior: wide pixel-anime grand exchange trading floor, brass/dark wood, market boards, central circular post and red/cyan/green/violet trading islands, anime brokers, warm vintage lighting, no website UI.

## Animated room activity

Company offices and the exchange now render independent SVG actors over the room scenery: walking routes, articulated arms/legs, conversation bubbles, monitor activity and moving data lines. These are visual loops, not fabricated completed tasks or trades. Campus and floor include pause controls; system reduced-motion settings stop actor animations. Existing task feeds and trading-engine behavior are unchanged.
