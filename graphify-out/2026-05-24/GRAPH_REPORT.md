# Graph Report - window-shopping  (2026-05-23)

## Corpus Check
- 87 files · ~41,487 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1218 nodes · 2955 edges · 83 communities (58 shown, 25 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b93f586`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Bundled JS (React Core)|Bundled JS (React Core)]]
- [[_COMMUNITY_Server Auth & Routes|Server Auth & Routes]]
- [[_COMMUNITY_Bundled JS (QueryState)|Bundled JS (Query/State)]]
- [[_COMMUNITY_Bundled JS (Observer)|Bundled JS (Observer)]]
- [[_COMMUNITY_Bundled JS (Utilities)|Bundled JS (Utilities)]]
- [[_COMMUNITY_Browser Window UI|Browser Window UI]]
- [[_COMMUNITY_Bundled JS (Router)|Bundled JS (Router)]]
- [[_COMMUNITY_Closet Management|Closet Management]]
- [[_COMMUNITY_Product Parser Service|Product Parser Service]]
- [[_COMMUNITY_Server Dependencies|Server Dependencies]]
- [[_COMMUNITY_Item Creation Flow|Item Creation Flow]]
- [[_COMMUNITY_Auth API Layer|Auth API Layer]]
- [[_COMMUNITY_Items API Layer|Items API Layer]]
- [[_COMMUNITY_Bundled JS (HTTP Client)|Bundled JS (HTTP Client)]]
- [[_COMMUNITY_Card & Grid Components|Card & Grid Components]]
- [[_COMMUNITY_Bundled JS (DOM)|Bundled JS (DOM)]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Bundled JS (Forms)|Bundled JS (Forms)]]
- [[_COMMUNITY_Bundled JS (Navigation)|Bundled JS (Navigation)]]
- [[_COMMUNITY_Bundled JS (Store)|Bundled JS (Store)]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Closets API Layer|Closets API Layer]]
- [[_COMMUNITY_Bundled JS (Base)|Bundled JS (Base)]]
- [[_COMMUNITY_Bundled JS (Misc)|Bundled JS (Misc)]]
- [[_COMMUNITY_Bundled JS (Array Util)|Bundled JS (Array Util)]]
- [[_COMMUNITY_Bundled JS (Options)|Bundled JS (Options)]]
- [[_COMMUNITY_Server TypeScript Config|Server TypeScript Config]]
- [[_COMMUNITY_Closets Hooks|Closets Hooks]]
- [[_COMMUNITY_Tags API Layer|Tags API Layer]]
- [[_COMMUNITY_Bundled JS (Scheduler)|Bundled JS (Scheduler)]]
- [[_COMMUNITY_Bundled JS (Events)|Bundled JS (Events)]]
- [[_COMMUNITY_Bundled JS (Cache)|Bundled JS (Cache)]]
- [[_COMMUNITY_Bundled JS (Task)|Bundled JS (Task)]]
- [[_COMMUNITY_Bundled JS (Iterator)|Bundled JS (Iterator)]]
- [[_COMMUNITY_Build Tool Config|Build Tool Config]]
- [[_COMMUNITY_Bundled JS (Set)|Bundled JS (Set)]]
- [[_COMMUNITY_Bundled JS (Selector)|Bundled JS (Selector)]]
- [[_COMMUNITY_Bundled JS (Animation)|Bundled JS (Animation)]]
- [[_COMMUNITY_Browser Window Root|Browser Window Root]]
- [[_COMMUNITY_Browser Window Prototype|Browser Window Prototype]]
- [[_COMMUNITY_API Test Suite|API Test Suite]]
- [[_COMMUNITY_Prototype Data|Prototype Data]]
- [[_COMMUNITY_Bundled JS (Plugin)|Bundled JS (Plugin)]]
- [[_COMMUNITY_Bundled JS (Compat)|Bundled JS (Compat)]]
- [[_COMMUNITY_Frontend Bootstrap Test|Frontend Bootstrap Test]]
- [[_COMMUNITY_Claude Settings|Claude Settings]]
- [[_COMMUNITY_Bundled JS (Misc 2)|Bundled JS (Misc 2)]]
- [[_COMMUNITY_Bundled JS (Infinite Query)|Bundled JS (Infinite Query)]]
- [[_COMMUNITY_Bundled JS (Misc 3)|Bundled JS (Misc 3)]]
- [[_COMMUNITY_Bundled JS (Throw)|Bundled JS (Throw)]]
- [[_COMMUNITY_Bundled JS (Misc 4)|Bundled JS (Misc 4)]]
- [[_COMMUNITY_Bundled JS (Misc 5)|Bundled JS (Misc 5)]]
- [[_COMMUNITY_Tag Data Library|Tag Data Library]]
- [[_COMMUNITY_iOS List Component|iOS List Component]]
- [[_COMMUNITY_iOS List Row|iOS List Row]]
- [[_COMMUNITY_Bootstrap Test Suite|Bootstrap Test Suite]]
- [[_COMMUNITY_QueryClient Setup|QueryClient Setup]]
- [[_COMMUNITY_Server Package Metadata|Server Package Metadata]]
- [[_COMMUNITY_Server Vitest Config|Server Vitest Config]]
- [[_COMMUNITY_Placeholder Tones|Placeholder Tones]]
- [[_COMMUNITY_Theme Name Type|Theme Name Type]]
- [[_COMMUNITY_Parser Fetch Error|Parser Fetch Error]]
- [[_COMMUNITY_Browser Service|Browser Service]]
- [[_COMMUNITY_JWT Claims Type|JWT Claims Type]]
- [[_COMMUNITY_Format Library|Format Library]]
- [[_COMMUNITY_Relative Date Format|Relative Date Format]]
- [[_COMMUNITY_Price Parser|Price Parser]]
- [[_COMMUNITY_Currency Formatter|Currency Formatter]]
- [[_COMMUNITY_Tag Type|Tag Type]]
- [[_COMMUNITY_Closet Payload Type|Closet Payload Type]]
- [[_COMMUNITY_Item Payload Type|Item Payload Type]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `O()` - 48 edges
2. `Fg()` - 44 edges
3. `Ml()` - 29 edges
4. `get()` - 27 edges
5. `e()` - 22 edges
6. `ch()` - 21 edges
7. `fh()` - 21 edges
8. `setOptions()` - 21 edges
9. `Vt()` - 21 edges
10. `HttpError` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Meta()` --semantically_similar_to--> `Meta (primitives.jsx)`  [INFERRED] [semantically similar]
  src/components/ui/Meta.tsx → primitives.jsx
- `SEASONS constant` --semantically_similar_to--> `inferSeason function`  [INFERRED] [semantically similar]
  src/constants.ts → server/src/services/parser.ts
- `ParsedProduct interface (client)` --semantically_similar_to--> `ParsedProduct interface (server)`  [INFERRED] [semantically similar]
  src/types/index.ts → server/src/types/index.ts
- `Season as Required Tag` --rationale_for--> `Tag`  [INFERRED]
  data.jsx → primitives.jsx
- `Closet interface` --references--> `Add closet default season migration`  [INFERRED]
  src/types/index.ts → server/prisma/migrations/20260523180155_add_closet_default_season/migration.sql

## Hyperedges (group relationships)
- **All screen components share primitives and global data via window** — primitives_producttile, primitives_eyebrow, primitives_tag, primitives_display, primitives_hairline, data_closets, data_items, mobile_mobilehome, mobile_mobilecloset, web_webdashboard, web_webhome [EXTRACTED 1.00]
- **iOS Device Frame Composition (IOSDevice contains StatusBar, NavBar, Keyboard)** — ios_frame_iosdevice, ios_frame_iosstatusbar, ios_frame_iosnavbar, ios_frame_ioskeyboard, ios_frame_iosglasspill [EXTRACTED 1.00]
- **Data Bootstrap Pipeline (apiFetch -> adapt* -> window globals)** — public_api_apifetch, public_data_bootstrapdata, public_data_adaptclosets, public_data_adaptitems, public_data_adapttags [EXTRACTED 1.00]
- **Route Handler Validation + HTTP Error Pattern** — routes_items_router, routes_closets_router, routes_auth_router, routes_tags_router, utils_validation_requirestring, utils_http_asynchandler, utils_http_httperror [INFERRED 0.85]
- **API Serialization Contract (Closet, Section, Item, Tag, AuthUser)** — utils_serializers_serializeauthuser, utils_serializers_serializecloset, utils_serializers_serializesection, utils_serializers_serializeitem, utils_serializers_serializetag [EXTRACTED 0.95]
- **Test Database Harness Pattern** — tests_test_db_testdb, tests_schema_test_schematests, tests_api_test_apitests [EXTRACTED 0.95]
- **API Layer: Client + Interceptors + Domain Modules** — api_client_apiclient, api_client_request_interceptor, api_client_response_interceptor, api_auth_login, api_closets_listclosets, api_tags_listtags [INFERRED 0.90]
- **Item CRUD Hook Suite (create, patch, delete, move, favorite, tag)** — hooks_useitems_usecreateitem, hooks_useitems_usepatchitem, hooks_useitems_usedeleteitem, hooks_useitems_usemoveitem, hooks_useitems_usefavoriteitem, hooks_useitems_useoptimistictagupdate [EXTRACTED 0.95]
- **Auth Bootstrap + Protected/Public Route Guards** — app_app_authbootstrap, app_app_protectedroute, app_app_publicionlyroute, hooks_useauth_useauth, concept_bearer_token_auth [INFERRED 0.90]
- **Product Parsing Pipeline: fetch -> parse -> enrich** — services_fetchrenderedhtml, services_parser, services_claudeenrich [INFERRED 0.95]
- **AppShell orchestrates all global modals** — layout_appshell, closets_closetformmodal, tags_tagmanagermodal, layout_appshellcontext [EXTRACTED 1.00]
- **Closet CRUD form flow: modal + mutations + navigation** — closets_closetformmodal, types_closet, types_closetpayload [INFERRED 0.85]

## Communities (83 total, 25 thin omitted)

### Community 0 - "Bundled JS (React Core)"
Cohesion: 0.02
Nodes (22): bd, Bm, cw, _d, [dw,fw,pw,hw], e1, ec, ee (+14 more)

### Community 1 - "Server Auth & Routes"
Cohesion: 0.05
Nodes (67): requireAuth(), email, name, password, router, safeUser, accent, closetId (+59 more)

### Community 2 - "Bundled JS (Query/State)"
Cohesion: 0.05
Nodes (72): ai(), b0, bc(), Bf(), Bh(), c0(), ch(), cr (+64 more)

### Community 3 - "Bundled JS (Observer)"
Cohesion: 0.11
Nodes (35): addObserver(), bindMethods(), C(), cancel(), clearGcTimeout(), clearTimeout(), constructor(), destroy() (+27 more)

### Community 4 - "Bundled JS (Utilities)"
Cohesion: 0.18
Nodes (16): eh(), En(), Ep(), eu(), fa(), Fe(), mu(), Nn() (+8 more)

### Community 5 - "Browser Window UI"
Cohesion: 0.10
Nodes (42): ChromeTab, ChromeTabBar, ChromeToolbar, ChromeTrafficLights, ChromeWindow, Closet -> Section -> Item Hierarchy, CLOSETS, ITEMS (+34 more)

### Community 6 - "Bundled JS (Router)"
Cohesion: 0.10
Nodes (39): at, ax(), b1(), bx(), Ce(), cx(), dx(), ei() (+31 more)

### Community 7 - "Closet Management"
Cohesion: 0.06
Nodes (36): Browser-backed HTML rendering strategy, Claude AI enrichment fallback pattern, ClosetCard component, ClosetFormModal component, ClosetGrid component, DEFAULT_THEME constant, SEASONS constant, THEME_OPTIONS constant (+28 more)

### Community 8 - "Product Parser Service"
Cohesion: 0.13
Nodes (26): AiEnricher, asText(), claudeEnrich(), extractBodyText(), extractBrand(), extractColors(), extractOfferField(), extractOriginalPrice() (+18 more)

### Community 9 - "Server Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, @anthropic-ai/sdk, bcrypt, cheerio, cors, dotenv, express, jsonwebtoken (+25 more)

### Community 10 - "Item Creation Flow"
Cohesion: 0.10
Nodes (18): ClosetFormModalProps, useCreateItem(), useParseUrl(), AddItemFlow(), Step, NotFound(), PLACEHOLDER_TONES, SEASONS (+10 more)

### Community 11 - "Auth API Layer"
Cohesion: 0.13
Nodes (21): getCurrentUser(), login(), register(), Request Auth Interceptor, Response 401 Interceptor, App Component (Router Root), AuthBootstrap Component, ProtectedRoute Component (+13 more)

### Community 12 - "Items API Layer"
Cohesion: 0.13
Nodes (26): createItem(), deleteItem(), favoriteItem(), getItem(), listItems(), moveItem(), parseUrl(), patchItem() (+18 more)

### Community 13 - "Bundled JS (HTTP Client)"
Cohesion: 0.06
Nodes (59): Ac(), An(), Ap(), ar(), ay(), bp(), Cg(), ct() (+51 more)

### Community 14 - "Card & Grid Components"
Cohesion: 0.14
Nodes (15): ClosetCard(), ClosetCardProps, ClosetGridProps, ItemCard(), ItemGrid(), SidebarProps, hashTone(), parsePriceToNumber() (+7 more)

### Community 15 - "Bundled JS (DOM)"
Cohesion: 0.14
Nodes (24): Ag(), cd(), da(), ft(), gh(), Gr, gt(), Ie() (+16 more)

### Community 16 - "Frontend Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, axios, react, react-dom, react-router-dom, @tanstack/react-query, zustand, devDependencies (+15 more)

### Community 17 - "Bundled JS (Forms)"
Cohesion: 0.19
Nodes (15): bu(), Hg(), hy(), Jf(), lh(), On(), Pr(), Qe() (+7 more)

### Community 18 - "Bundled JS (Navigation)"
Cohesion: 0.25
Nodes (15): cp(), fu(), Gn(), jl(), kl(), la(), ma(), nh() (+7 more)

### Community 19 - "Bundled JS (Store)"
Cohesion: 0.10
Nodes (21): add(), bs(), clear(), Dm(), Gc(), has(), i(), ir() (+13 more)

### Community 20 - "TypeScript Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+12 more)

### Community 21 - "Closets API Layer"
Cohesion: 0.20
Nodes (22): apiClient, createCloset(), createSection(), deleteCloset(), deleteSection(), getCloset(), listClosets(), patchCloset() (+14 more)

### Community 22 - "Bundled JS (Base)"
Cohesion: 0.14
Nodes (16): _1(), bg(), dd(), delete(), Et(), is(), ky(), optionalRemove() (+8 more)

### Community 23 - "Bundled JS (Misc)"
Cohesion: 0.29
Nodes (11): _0(), be(), ca(), ed(), Gp(), ka(), m0(), po() (+3 more)

### Community 24 - "Bundled JS (Array Util)"
Cohesion: 0.11
Nodes (21): a0, a1(), concat(), Cy(), defaultMutationOptions(), ey(), getMutationDefaults(), Lg() (+13 more)

### Community 25 - "Bundled JS (Options)"
Cohesion: 0.10
Nodes (33): av(), build(), bv(), Cn(), defaultQueryOptions(), ensureInfiniteQueryData(), ensureQueryData(), fetchOptimistic() (+25 more)

### Community 26 - "Server TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule, rootDir (+6 more)

### Community 27 - "Closets Hooks"
Cohesion: 0.29
Nodes (8): useClosets(), useItems(), AppShell(), AppShellContext, AppShellContextValue, useAppShell(), TopBarProps, Home()

### Community 28 - "Tags API Layer"
Cohesion: 0.32
Nodes (9): createTag(), deleteTag(), listTags(), patchTag(), useCreateTag(), useDeleteTag(), usePatchTag(), useTags() (+1 more)

### Community 29 - "Bundled JS (Scheduler)"
Cohesion: 0.29
Nodes (7): Ha(), lu(), Pw(), Us(), Wg(), yw(), zh()

### Community 30 - "Bundled JS (Events)"
Cohesion: 0.15
Nodes (14): _(), accessor(), getObserversCount(), hd(), he(), isActive(), isDisabled(), isFetched() (+6 more)

### Community 31 - "Bundled JS (Cache)"
Cohesion: 0.22
Nodes (9): as(), bw(), c1(), cm(), d1(), ew(), jo(), lw() (+1 more)

### Community 32 - "Bundled JS (Task)"
Cohesion: 0.29
Nodes (10): canRun(), continue(), execute(), find(), isFocused(), onFocus(), onOnline(), refetch() (+2 more)

### Community 33 - "Bundled JS (Iterator)"
Cohesion: 0.12
Nodes (17): am(), findAll(), Fl(), from(), getAll(), getQueriesData(), getUri(), h1() (+9 more)

### Community 34 - "Build Tool Config"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, composite, lib, module, moduleResolution, skipLibCheck, target (+2 more)

### Community 35 - "Bundled JS (Set)"
Cohesion: 0.21
Nodes (15): fh(), gi(), Gl(), Go(), In(), Jc(), jw, ph() (+7 more)

### Community 36 - "Bundled JS (Selector)"
Cohesion: 0.18
Nodes (10): ad(), bo(), dh(), Gg(), hc(), od(), Q0(), so() (+2 more)

### Community 38 - "Bundled JS (Animation)"
Cohesion: 0.14
Nodes (17): createResult(), gd(), j1(), jh(), Ra(), rt(), sd(), shouldFetchOnReconnect() (+9 more)

### Community 45 - "Prototype Data"
Cohesion: 0.33
Nodes (5): CLOSETS, ITEMS, PLACEHOLDER_TONES, SEASONS, TAG_LIBRARY

### Community 47 - "Bundled JS (Plugin)"
Cohesion: 0.18
Nodes (11): _f(), Ff(), ko(), ny(), [Symbol.iterator](), toJSON(), toString(), uw() (+3 more)

### Community 50 - "Bundled JS (Compat)"
Cohesion: 0.15
Nodes (14): ah(), Bl(), Di(), id(), Kc(), ke(), $l(), O() (+6 more)

### Community 52 - "Frontend Bootstrap Test"
Cohesion: 0.40
Nodes (3): context, localStorage, script

### Community 54 - "Bundled JS (Misc 2)"
Cohesion: 0.67
Nodes (3): Gs(), i1(), r1()

### Community 56 - "Bundled JS (Misc 3)"
Cohesion: 0.33
Nodes (5): code:bash (# Install dependencies), Features, Getting started, Stack, window-shopping

### Community 57 - "Bundled JS (Throw)"
Cohesion: 0.40
Nodes (5): mount(), Ms(), subscribe(), toAbortSignal(), unmount()

### Community 58 - "Bundled JS (Misc 4)"
Cohesion: 0.16
Nodes (18): aa(), Af(), Cl(), Cu(), Dn(), Fo(), G(), jy() (+10 more)

### Community 59 - "Bundled JS (Misc 5)"
Cohesion: 0.50
Nodes (4): dv(), l0(), lv(), Vi()

## Knowledge Gaps
- **227 isolated node(s):** `Features`, `Stack`, `code:bash (# Install dependencies)`, `CHROME_C`, `composite` (+222 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetch()` connect `Bundled JS (Observer)` to `Bundled JS (React Core)`, `Bundled JS (Task)`, `Bundled JS (Set)`, `Browser Window UI`, `Product Parser Service`, `Bundled JS (Options)`?**
  _High betweenness centrality (0.310) - this node is a cross-community bridge._
- **Why does `fetchRawHtml()` connect `Product Parser Service` to `Bundled JS (Observer)`?**
  _High betweenness centrality (0.258) - this node is a cross-community bridge._
- **Why does `router` connect `Items API Layer` to `Server Auth & Routes`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **What connects `Features`, `Stack`, `code:bash (# Install dependencies)` to the rest of the system?**
  _229 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bundled JS (React Core)` be split into smaller, more focused modules?**
  _Cohesion score 0.02197802197802198 - nodes in this community are weakly interconnected._
- **Should `Server Auth & Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.054363796650014694 - nodes in this community are weakly interconnected._
- **Should `Bundled JS (Query/State)` be split into smaller, more focused modules?**
  _Cohesion score 0.053208137715179966 - nodes in this community are weakly interconnected._