# Graph Report - window-shopping  (2026-05-24)

## Corpus Check
- 92 files · ~42,609 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1260 nodes · 2996 edges · 97 communities (67 shown, 30 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d262444a`
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
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]

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
- `listItems()` --references--> `router`  [INFERRED]
  src/api/items.ts → server/src/routes/items.ts
- `parseUrl()` --references--> `router`  [INFERRED]
  src/api/items.ts → server/src/routes/items.ts

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

## Communities (97 total, 30 thin omitted)

### Community 0 - "Bundled JS (React Core)"
Cohesion: 0.02
Nodes (22): bd, Bm, cw, _d, [dw,fw,pw,hw], e1, ec, ee (+14 more)

### Community 1 - "Server Auth & Routes"
Cohesion: 0.06
Nodes (65): requireAuth(), email, name, password, router, safeUser, accent, closetId (+57 more)

### Community 2 - "Bundled JS (Query/State)"
Cohesion: 0.09
Nodes (31): _0(), b0, Bh(), c0(), dv(), E0(), g0(), gi() (+23 more)

### Community 3 - "Bundled JS (Observer)"
Cohesion: 0.10
Nodes (35): addObserver(), bindMethods(), cancel(), clearGcTimeout(), clearTimeout(), constructor(), destroy(), Eo() (+27 more)

### Community 4 - "Bundled JS (Utilities)"
Cohesion: 0.13
Nodes (23): An(), En(), Ep(), eu(), fa(), Fe(), gu(), lu() (+15 more)

### Community 5 - "Browser Window UI"
Cohesion: 0.10
Nodes (42): ChromeTab, ChromeTabBar, ChromeToolbar, ChromeTrafficLights, ChromeWindow, Closet -> Section -> Item Hierarchy, CLOSETS, ITEMS (+34 more)

### Community 6 - "Bundled JS (Router)"
Cohesion: 0.12
Nodes (35): at, ax(), b1(), bx(), Ce(), cx(), dx(), ei() (+27 more)

### Community 7 - "Closet Management"
Cohesion: 0.06
Nodes (36): Browser-backed HTML rendering strategy, Claude AI enrichment fallback pattern, ClosetCard component, ClosetFormModal component, ClosetGrid component, DEFAULT_THEME constant, SEASONS constant, THEME_OPTIONS constant (+28 more)

### Community 8 - "Product Parser Service"
Cohesion: 0.11
Nodes (30): closeBrowser(), ensureBrowser(), fetchRenderedHtml(), launchBrowser(), AiEnricher, asText(), claudeEnrich(), extractBodyText() (+22 more)

### Community 9 - "Server Dependencies"
Cohesion: 0.06
Nodes (34): dependencies, @anthropic-ai/sdk, bcrypt, cheerio, cors, dotenv, express, jsonwebtoken (+26 more)

### Community 10 - "Item Creation Flow"
Cohesion: 0.15
Nodes (12): useCreateItem(), useParseUrl(), AddItemFlow(), Step, AppShellContext, AppShellContextValue, TopBarProps, PLACEHOLDER_TONES (+4 more)

### Community 11 - "Auth API Layer"
Cohesion: 0.11
Nodes (24): getCurrentUser(), login(), register(), Request Auth Interceptor, Response 401 Interceptor, App Component (Router Root), AuthBootstrap Component, ProtectedRoute Component (+16 more)

### Community 12 - "Items API Layer"
Cohesion: 0.13
Nodes (24): createItem(), deleteItem(), favoriteItem(), getItem(), listItems(), moveItem(), parseUrl(), patchItem() (+16 more)

### Community 13 - "Bundled JS (HTTP Client)"
Cohesion: 0.23
Nodes (12): ay(), Cg(), eg(), gf(), Hp(), Ic(), Qp(), rp() (+4 more)

### Community 14 - "Card & Grid Components"
Cohesion: 0.10
Nodes (20): ClosetCard(), ClosetCardProps, ClosetGridProps, ItemCard(), ItemGrid(), SidebarProps, hashTone(), parsePriceToNumber() (+12 more)

### Community 15 - "Bundled JS (DOM)"
Cohesion: 0.18
Nodes (17): Ag(), Bl(), cd(), dt(), ft(), Ga(), Ie(), Jt() (+9 more)

### Community 16 - "Frontend Dependencies"
Cohesion: 0.05
Nodes (36): dependencies, axios, react, react-dom, react-router-dom, @tanstack/react-query, zustand, devDependencies (+28 more)

### Community 17 - "Bundled JS (Forms)"
Cohesion: 0.18
Nodes (17): fh(), Gl(), gt(), Hg(), hy(), In(), Qe(), sp() (+9 more)

### Community 18 - "Bundled JS (Navigation)"
Cohesion: 0.29
Nodes (13): cp(), fu(), Gn(), jl(), kl(), la(), nh(), og() (+5 more)

### Community 19 - "Bundled JS (Store)"
Cohesion: 0.12
Nodes (12): bs(), clear(), Dm(), el(), i(), Lm(), md(), Oc() (+4 more)

### Community 20 - "TypeScript Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+12 more)

### Community 21 - "Closets API Layer"
Cohesion: 0.23
Nodes (16): apiClient, createCloset(), createSection(), deleteCloset(), deleteSection(), getCloset(), listClosets(), patchCloset() (+8 more)

### Community 22 - "Bundled JS (Base)"
Cohesion: 0.10
Nodes (23): _1(), ad(), ai(), bg(), dd(), delete(), dh(), ey() (+15 more)

### Community 23 - "Bundled JS (Misc)"
Cohesion: 0.26
Nodes (12): be(), ca(), ed(), ensureInfiniteQueryData(), fetchInfiniteQuery(), Gp(), ka(), po() (+4 more)

### Community 24 - "Bundled JS (Array Util)"
Cohesion: 0.09
Nodes (30): _(), accessor(), am(), C(), concat(), defaultMutationOptions(), Fl(), from() (+22 more)

### Community 25 - "Bundled JS (Options)"
Cohesion: 0.10
Nodes (32): a1(), av(), build(), bv(), Cn(), defaultQueryOptions(), ensureQueryData(), fetchOptimistic() (+24 more)

### Community 26 - "Server TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule, rootDir (+6 more)

### Community 27 - "Closets Hooks"
Cohesion: 0.30
Nodes (12): useCloset(), useClosets(), useCreateSection(), useDeleteSection(), usePatchSection(), useSections(), useItems(), AppShell() (+4 more)

### Community 28 - "Tags API Layer"
Cohesion: 0.24
Nodes (10): createTag(), deleteTag(), listTags(), patchTag(), useCreateTag(), useDeleteTag(), usePatchTag(), useTags() (+2 more)

### Community 29 - "Bundled JS (Scheduler)"
Cohesion: 0.18
Nodes (11): as(), bw(), ew(), Gr, Ha(), ls(), lw(), Pw() (+3 more)

### Community 30 - "Bundled JS (Events)"
Cohesion: 0.22
Nodes (14): Ac(), ar(), fc(), Fi(), io(), jy(), Li(), Ml() (+6 more)

### Community 31 - "Bundled JS (Cache)"
Cohesion: 0.10
Nodes (21): c1(), cm(), d1(), gd(), ir(), j1(), jh(), jo() (+13 more)

### Community 32 - "Bundled JS (Task)"
Cohesion: 0.14
Nodes (19): canRun(), continue(), execute(), fetch(), find(), findAll(), getAll(), getQueriesData() (+11 more)

### Community 34 - "Build Tool Config"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, composite, lib, module, moduleResolution, skipLibCheck, target (+2 more)

### Community 35 - "Bundled JS (Set)"
Cohesion: 0.18
Nodes (24): d0(), Du(), Fg(), Go(), Hr(), ig(), je(), ju() (+16 more)

### Community 36 - "Bundled JS (Selector)"
Cohesion: 0.25
Nodes (3): eh(), pa(), w0

### Community 38 - "Bundled JS (Animation)"
Cohesion: 0.13
Nodes (19): createResult(), getObserversCount(), hd(), hu(), isActive(), isDisabled(), isFetched(), isStale() (+11 more)

### Community 45 - "Prototype Data"
Cohesion: 0.33
Nodes (5): CLOSETS, ITEMS, PLACEHOLDER_TONES, SEASONS, TAG_LIBRARY

### Community 47 - "Bundled JS (Plugin)"
Cohesion: 0.12
Nodes (16): _f(), Ff(), jw, ko(), nx(), ny(), si(), [Symbol.iterator]() (+8 more)

### Community 50 - "Bundled JS (Compat)"
Cohesion: 0.17
Nodes (13): bc(), Di(), Dn(), Kc(), ke(), $l(), na(), O() (+5 more)

### Community 52 - "Frontend Bootstrap Test"
Cohesion: 0.40
Nodes (3): context, localStorage, script

### Community 54 - "Bundled JS (Misc 2)"
Cohesion: 0.67
Nodes (3): Gs(), i1(), r1()

### Community 55 - "Bundled JS (Infinite Query)"
Cohesion: 0.15
Nodes (12): code:text (GET /version), code:json ({), code:json ({), code:bash (npm run release:dry-run), code:text (fix: trigger release), Commit and PR title rules, Dry runs and forced releases, Railway configuration (+4 more)

### Community 56 - "Bundled JS (Misc 3)"
Cohesion: 0.33
Nodes (5): code:bash (# Install dependencies), Features, Getting started, Stack, window-shopping

### Community 57 - "Bundled JS (Throw)"
Cohesion: 0.67
Nodes (3): mount(), Ms(), unmount()

### Community 58 - "Bundled JS (Misc 4)"
Cohesion: 0.23
Nodes (13): Af(), Cl(), Cu(), Fo(), G(), Lc(), mc(), Mf() (+5 more)

### Community 59 - "Bundled JS (Misc 5)"
Cohesion: 0.21
Nodes (12): ch(), cr, dc(), Df(), If(), jn(), ld(), Nf() (+4 more)

### Community 82 - "Community 82"
Cohesion: 0.22
Nodes (11): Bf(), e(), Lf(), lp(), Qf(), qh(), Qu(), ty() (+3 more)

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (10): add(), da(), Gc(), has(), Jc(), jp(), ph(), trackProp() (+2 more)

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (10): bo(), bu(), Gg(), Jf(), lh(), lo(), On(), Pr() (+2 more)

### Community 85 - "Community 85"
Cohesion: 0.20
Nodes (10): Cy(), Et(), Lg(), mg(), mh(), nv(), setTimeout(), v1() (+2 more)

### Community 86 - "Community 86"
Cohesion: 0.25
Nodes (9): Ap(), bp(), dp(), gh(), Ip(), Qg(), sl(), Wt() (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.25
Nodes (9): ct(), Fp(), Hi(), Hl(), np(), Ou(), _p(), wp() (+1 more)

### Community 88 - "Community 88"
Cohesion: 0.50
Nodes (5): ah(), id(), wa(), xa(), xt()

### Community 89 - "Community 89"
Cohesion: 0.50
Nodes (3): branches, plugins, tagFormat

## Knowledge Gaps
- **257 isolated node(s):** `branches`, `tagFormat`, `plugins`, `CHROME_C`, `composite` (+252 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetch()` connect `Bundled JS (Task)` to `Bundled JS (React Core)`, `Bundled JS (Observer)`, `Browser Window UI`, `Product Parser Service`, `Community 83`, `Bundled JS (Array Util)`, `Bundled JS (Options)`, `Bundled JS (Cache)`?**
  _High betweenness centrality (0.289) - this node is a cross-community bridge._
- **Why does `fetchRawHtml()` connect `Product Parser Service` to `Bundled JS (Task)`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `ParsedProduct` connect `Card & Grid Components` to `Product Parser Service`, `Item Creation Flow`, `Items API Layer`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **What connects `branches`, `tagFormat`, `plugins` to the rest of the system?**
  _259 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bundled JS (React Core)` be split into smaller, more focused modules?**
  _Cohesion score 0.02197802197802198 - nodes in this community are weakly interconnected._
- **Should `Server Auth & Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.05949367088607595 - nodes in this community are weakly interconnected._
- **Should `Bundled JS (Query/State)` be split into smaller, more focused modules?**
  _Cohesion score 0.09462365591397849 - nodes in this community are weakly interconnected._