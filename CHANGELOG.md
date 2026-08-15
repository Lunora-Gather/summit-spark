# Changelog

## 2026-08-16

- 完成 `20260816-p283` 的运行时健康哨兵。主循环现在会检查角色运动、重生锚点、镜头、房间动态时钟、Flow 与分段计时的有限性；遇到极端浏览器状态或未来改动产生的 `NaN/Infinity` 时，自动回到当前有效检查点、清理坏状态并保留可继续游玩的路线。诊断快照和调试面板会记录恢复次数，浏览器回归主动注入损坏运动状态并证明恢复后仍能立即移动。该保险不改变正常手感、关卡和奖励。

- 完成 `20260816-p282` 的重生落点自愈收口。重生与中段检查点现在会在解析房间后同时避开实体碰撞和尖刺/巡游晶核，若旧存档或动态相位造成一像素重叠，会在有限三格半径内寻找安全像素、清理速度与墙面宽限，并短暂保护落点；运行中再次检测到异常重叠时只校正一次并提示“落点已校正 · 继续前进”。这层保险不改变地图、路线、难度或角色外观，专门消除“人已出现但卡住/立即再死”的边界故障。版本门禁和完整浏览器回归同步升级到 p282。

- 完成 `20260816-p281` 的成熟度收口。自动重生现在会清掉失焦或旧帧残留的输入边沿，恢复可玩焦点与计时边界，并给重生落点一个极短的安全窗口，避免“角色已出现但按键无效/立即再次死亡”的假死感；恢复状态同时明确提示 `R` 快速重开与 `T` 房间重开。键盘首玩提示和触控重开按钮补上可发现的快捷键语义，触控按钮保留原有克制尺寸。R7/R8 的房间入场简报延长到 2.1 秒并写明风场、碎冰、棱镜的第一阅读重点，难度不降但过渡更平滑。舒适高度的竖屏把简报与画面整体上移 34px 以内，消除顶部大段空场；320×480 等短屏继续沿用紧凑布局。浏览器回归新增移动端位置门禁、重生稳定性检查与 p281 版本一致性检查。

## 2026-08-11

- Closed the deep-audit stability and input gaps in `20260811-p280`. Gameplay now advances through bounded 120 Hz fixed physics steps while PB and split clocks retain real monotonic elapsed time, so low frame rates no longer slow both movement and records or hide sub-30 FPS stalls. High-refresh partial frames retain input edges until a simulation step consumes them, focus recovery clears scheduler backlog, and deterministic math tests cover 60/240 Hz plus long stalls. Portrait play now crops the wide canvas to a camera-aware 640-unit route view instead of shrinking the entire 16:9 room, enlarging the climber, hazards and landings without changing desktop or landscape maps. The touch layer is structurally separated from the transformed playfield, preventing respawn-era control overlap; it also gains quiet quick-retry and room-restart controls. Standard gamepads gain View retry, Start settings, L3+R3 room restart and a dedicated Y recall. Clean profiles receive one short device-aware opening input line, while established profiles remain coaching-free. Guest entry no longer downloads the 469 KB Appwrite SDK until account recovery, an account hint or the account page requires it; failure/retry behavior remains covered. Long-term challenge wins now permanently light the summit constellation without adding a currency. The real-browser gate is enforced in both pull-request and Pages workflows, its R10 apex action is dispatched in the observed gameplay frame instead of racing a protocol round trip, and the R6 checklist/log contradiction now matches the authored six Relays and three springs.

## 2026-08-10

- Gave all ten rooms their own foreground architectural grammar in `20260810-p278`, closing the remaining “same blue rectangles with different hazards” problem without changing collision or route timings. The existing room identities now continue into the playable ledges themselves: the gate has stone piers, the relay bridge sags on cables, the mist platforms sit on coils, the three-link room uses chained diamonds, the switchback grows an offset spine, the old exit breaks into cracked arches, the gorge hangs from wind cords, the prism hall facets into crystal trusses, the echo field carries concentric supports, and the summit resolves into peak-shaped star frames. Each identity also owns a distinct ledge depth and restrained face mark, while chapter materials, obstacle composition and background landmarks remain intact. Real-browser comparison covered all ten rooms at the same camera and clean HUD state. Maps, movement, respawn safety, difficulty, rewards, saves, cloud behavior, desktop width cap, pale page atmosphere, classic climber and fixed hair are unchanged.

- Removed the false-empty mobile Practice workspace in `20260810-p277`. At 487×694 the two collapsed choices occupied roughly 100px while the safe-area sheet still stretched to 624px, leaving about 400px of blank paper before the launch action. Collapsed portrait Practice now shrink-wraps its two disclosures and persistent launch button like the already-compact desktop sheet; opening either room selection or training history restores the bounded full-height scroll workspace. A real-browser regression limits the collapsed sheet to 56% of the viewport, caps its empty tail at 28px, and still verifies the expanded room, Drill, Route and Feel controls. Start, Settings, gameplay HUD, finish review, desktop and landscape layouts, maps, physics, rewards, saves, classic climber and fixed hair are unchanged.

- Tightened portrait play composition in `20260810-p276` without adding interface density. The room brief, fixed-ratio playfield and two-row touch controls now form one continuous vertical route with bounded 8–20px and 12–28px gaps at 390×844, while the calculation follows the saved 44–64px touch-size preference and safe-area inset. Start, account and summit overlays suppress the duplicate background brief because those surfaces already provide their own context, and portrait start menus remove the decorative map preview from behind their translucent actions. Real-browser gates cover the normal phone, 320×480 short portrait, large touch controls and notched safe-area layout. Desktop width cap, pale page atmosphere, landscape controls, maps, difficulty, rewards, saves, cloud behavior, classic climber and fixed hair are unchanged.

## 2026-08-09

- Closed the remaining post-respawn movement lock in `20260809-p275`. The earlier focus recovery was valid but incomplete: a forward room transition also kept the previous room's exit height while pinning the next respawn near the left edge, so R2 could restore the climber at roughly `(26, 297)` inside its `y=288–320` entry platform. Every room now derives transition, retry and restart positions from its single authored `S`/`P` marker; legacy or damaged states receive a bounded, platform-aware solid escape before control resumes. The all-ten-room model gate proves every canonical entry has exact support without overlap, the reported R2 state must recover upward to `(26, 263)`, and the real-browser R2 retry requires the canonical `(70.5, 263)` respawn, zero collision overlap and successful rightward movement. Maps, difficulty, rewards, saves, cloud behavior, UI, classic climber and fixed hair are unchanged.

- Fixed the reported cross-room post-respawn input lock in `20260809-p274`. A browser `blur` without the matching `focus` event could leave the simulation paused even though Retry had visibly returned the climber to a valid entry platform; visible gameplay input now clears only that stale pause through one shared keyboard, pointer/touch and gamepad recovery boundary. Hidden documents, open Settings/Practice and the summit review remain paused, closing a visible panel can recover the same stale state, input edges are still released on focus loss, and debug evidence exposes focus/settings/visibility pause state. Pure boundaries plus real-browser automatic-respawn keyboard and pointer regressions cover the failure. The authenticated account disclosure also regains an aligned identity/sync/security rhythm after the final interface theme: numeric-leading emails use the neutral Summit mark instead of looking like a count badge, cloud actions share one row, password fields remain contained, and desktop/mobile spacing is bounded. Maps, physics, rewards, saves, cloud behavior, classic climber and fixed hair are unchanged.

- Refined the complete existing interface in `20260809-p273` through one reversible final theme layer instead of adding another screen. Entry now makes local guest play the clear first action while keeping cloud access visible; the start menu separates primary ascent, training continuation and utility actions through stronger type, spacing and state contrast. The quiet HUD gains a slightly larger, more legible hierarchy for Lumen, room, time and mistakes without restoring hidden training telemetry. Settings and Practice now share one restrained mist-paper material, clearer headers, consistent controls and focus/hover states; Practice expands only on desktop, improves room evidence, route cards, Drill choices and its launch dock, while compact mobile layouts stack route choices safely. The summit sheet receives matching edge, surface and disclosure polish. Small entry/settings copy retains the 4.5:1 contrast gate, mobile panel targets remain at least 44px, and the R10 real-keyboard apex proof now holds Dash through one observable frame instead of allowing same-frame protocol press/release loss. Page width, outer pale atmosphere, maps, gameplay, audio, classic climber, fixed hair, physics, rewards and saves are unchanged.

- Closed the remaining automatable playtest-evidence and late-reward edges in `20260809-p272` without adding another visible panel. The local-only summit run report now derives a defensive per-room review from raw elapsed seconds, marks the slowest completed room and the highest-mistake room, preserves chronological ties and ignores unfinished or malformed rows; its privacy copy now accurately names split evidence. Direct tests cover empty, clean, tied, partial and damaged reports, while the real-browser finish fixture requires the generated focus line. R5 and R7's second-screen Lumens also have canonical-map regression cases proving that a pre-pickup camp snapshot cannot preserve them and a validated post-pickup snapshot can. The R10 real-keyboard spring-apex proof now samples the center of the unchanged gameplay window before dispatching Dash, avoiding a protocol-roundtrip race while retaining the same recognition, Flow, speed and reset assertions. Gameplay, page layout, summit composition, audio, classic climber, fixed hair, physics, saves and reward rules are unchanged.

- Rebalanced the `20260809-p271` long-room campaign around three spatial beats instead of obstacle count. R8 and R9 keep their taught opening patterns but move part of their crumble pressure beyond the midpoint; R10 drops from 25 repeated crumble tiles and four prisms to 18 deliberately separated crumble tiles and three prisms, using gaps plus a late unsupported bridge to preserve difficulty through distinct decisions. R5 and R7 move their existing Lumens into second-screen mechanic branches, so optional reward play continues after the camp lantern without changing the 12-Lumen total, checkpoint snapshot rules or permanent collection semantics. Canonical guides now describe the stable, fast and expert choices actually present in these routes. The map gate audits all three thirds of every long room, caps late-room pressure concentration, bounds finale crumble density and protects second-screen Lumen distribution; the room report exposes these pacing figures for future tuning. The page, HUD, classic climber, fixed hair, movement physics and save schema are unchanged.

- Composed the `20260809-p270` obstacle fields into authored mechanisms instead of repeated loose blocks. Vertical gold gate tiles now sit inside one coherent breakable door frame, contiguous phase blocks share a readable rail and rhythm, and adjacent crumble tiles read as one fragile suspended bridge while preserving every existing collision and timer. R4-R10 midpoint recovery markers are now warm world-space camp lanterns with a small structural shelter and active glow, giving each long room a clear second-act punctuation; summit goals gained a restrained local beacon. No HUD, map, movement, climber, fixed hair, reward or save behavior changed.

- Restored the preferred bounded desktop presentation in `20260809-p269`: the stage again caps at 1440px with its original responsive outer gap, pale atmospheric page background, light rim and softer page-level shadow. This deliberately reverts only the two p268 page-stage changes; p268's chapter-specific terrain supports, run-level ledge accents, sparse rock detail and calmer crumble strips remain intact, as do gameplay, maps, UI, climber and saves.

- Rebuilt the `20260809-p268` playfield presentation around authored terrain composition instead of repeated floating tiles. Existing collision maps and movement remain unchanged, but each visible platform run now reads as one ledge with sparse chapter-specific surface marks and structural depth: Mountain Gate uses stone piers and cross-bracing, Old Peak uses broken arches, Wind Gorge uses hanging cords and wind pennants, and Star Summit uses geometric lattice supports. Crumble strips keep their warning material while using sparse cracks instead of repeating an X on every tile. The desktop stage no longer stops at a fixed 1440px width, the pale outer page has become a restrained dark atmospheric surround, and the smaller safe gap lets the game occupy the browser without changing the 960×544 simulation, mobile safe-area behavior, HUD, climber, fixed hair, maps, physics, rewards or saves.

- Reframed the `20260809-p267` summit result as a compact keepsake instead of a full-screen analytics board. On desktop it now rests in the lower-left so the climber, summit sigil and final room remain visible; a two-column hero separates the emotional ending from four quiet run facts and one recommended Drill. Chapter mastery, challenges, split evidence, copyable run data and the training roadmap remain available in two collapsed disclosures instead of competing with the victory moment. Narrow screens return to a single readable column with bounded scrolling and touch-safe actions. No gameplay, map, reward, save, climber or fixed-hair behavior changed.

- Reworked the `20260809-p266` long-room experience around readable decisions and bounded repetition. R4–R10 now place one quiet world-space midpoint lantern at the start of their second screen, followed by a recovery refill; death and quick retry resume there, while a full room restart still returns to the authored entrance. The lantern snapshots only validated Lumen ids that actually exist in the current canonical room, deduplicates them through the pure Lumen model, and resumes the split from its captured midpoint time instead of zero. It never turns pickups into permanent progress before the room boundary. This removes the second-screen repetition tax without opening collection, forged-id or Pace/PB-shortcut loopholes.

- Added capped horizontal velocity look-ahead to the existing safe-zone camera so dashes reveal the next landing before the climber reaches the guide, with faster smoothing and unchanged world-edge clamps. Phase ledges now use spatially offset groups and warn before both disappearing and returning; a dash into any tile of one vertical gold gate breaks the complete gate instead of leaving disconnected pieces. Repeated second-screen crumble strips and spike carpets were removed across R4–R10, R7's redundant 32px entry wall was removed so its safe line walks cleanly into the first floor updraft, R8's first dash gap was reduced from three tiles to two while preserving its five-tile crumble wave, and R10's floor spring callback now offers a two-tile landing without widening the apex timing window. Recovery space now separates gate, phase and rail-shard decisions. The HUD, classic climber, fixed `#294657` hair, base movement physics and save schema remain unchanged.

## 2026-08-08

- Rebuilt the campaign's spatial foundation in `20260808-p265` around true horizontally extended rooms instead of a cosmetic room-change slide. R4–R10 now span 45 columns (one and a half viewports), while R1–R3 remain 30-column teaching rooms. Collision, hazards, crumble strips, route paths, exits, reverse entry, respawn and diagnostics all use each room's actual world width. A bounded horizontal camera keeps the climber inside 36–64% screen guides, clamps at both world edges, and gives stars, landmarks, moon and three mountain depths restrained parallax; the HUD remains fixed and quiet. The new pure `game/world-model.mjs` owns variable-width validation, camera following, phase timing and deterministic moving-rail math, with direct failure-boundary tests and local-server/public-surface checks.

- Added three original obstacle families with distinct decisions rather than more spike density: gold lattice gates break only during a committed dash, phase ledges alternate between load-bearing and pass-through states without rematerializing inside the player, and drift shards move predictably along visible dashed rails. They teach separately in R4, R5 and R7, then combine through R8–R10. Long-room route copy, Style/Expert evidence, first-touch cues, honest Pace targets, pressure audits and browser fixtures were updated together. Current-room Lumen rollback and full-route rewards remain unchanged; the classic climber, fixed `#294657` hair, base movement physics, save schema and top-level UI are unchanged.

## 2026-08-07

- Rebuilt the broken summit review layout reported from a real completed run in `20260807-p264`. The title, run line, Lumen whisper, mastery evidence, primary review cards, actions, collapsed details and restart action now live inside one bounded `finish-sheet` with explicit max-content rows instead of competing as independent overlay grid items. Review cards reserve their full text height, the restart action is compact rather than full-stage width, and the ending whisper regains readable contrast over the summit. The real-browser fixture now reproduces long mastery and card copy and fails on any vertical overlap, escaped card content or oversized restart action, in addition to its existing scroll, wrapping, disclosure and focus contracts. Gameplay, maps, save data, classic climber and fixed `#294657` hair are unchanged.

- Turned the reported low difficulty and repetitive collection route into a layered mastery pass in `20260807-p263` without adding a new HUD or menu. R1–R3 remain readable teaching rooms, while R4–R10 Pace targets are 7–9% tighter and their Lumens now sit on seven distinct mechanic detours: low relay, switchback, spring/relay, updraft, Prism/crumble, Echo recall and finale callback. The authored route copy now explains those optional lines. Current-room Lumens are provisional until a room boundary: death, quick retry and room restart restore that room's pickups and remove any unspent bonus dash, closing the pickup-and-teleport exploit while preserving previously banked rooms. A versioned profile field records only the best eligible full-route Lumen count, and a compact `全微光` item reuses the existing long-term challenge and summit line. Pure retry-state, storage, challenge and presentation tests cover reset scope, damaged input, assist isolation, provisional completion and persistent reward evidence. The classic climber, fixed `#294657` hair, base physics and quiet top-level UI remain unchanged.

- Unified every Drill target, actual practice objective and hover brief under one defensive `ui/presentation.mjs` model in `20260807-p262`. The main runtime previously assembled those three related strings through separate helpers, while room launch, plan cards, queue cards, Route steps, mastery rows and route cues consumed different slices. One pure result now owns Auto/Clean/Pace/Style/Expert wording, preserves the exact existing separation between target conditions and route advice, strips injected line breaks and fails unknown modes closed to Auto. The runtime adapter computes only the evidence needed by the selected mode, direct tests cover all five modes and malformed input, and public/runtime contracts forbid the three retired helpers from returning. No visible copy or layout, training selection, gameplay, maps, physics, save schema, classic climber silhouette or fixed `#294657` hair changed.

- Closed the last automatable deployment-evidence gap in `20260807-p261`. `npm run live-check` now fetches every file in the deployed `public/` boundary without cache, normalizes only platform line endings, compares canonical SHA-256 content with the local release, validates MIME types, and separately requires the build meta, CSP, versioned CSS/JS, pinned Appwrite SDK and state-independent `#294657` hair invariant. Standard Node networking remains the primary path; Windows can use its system HTTP stack when the local TLS path is reset. The 46-step release checklist and oversized manual script were reduced to deterministic automated gates plus genuine human judgments: three-minute comprehension, uninterrupted R1–R10 readability/difficulty, physical touch/gamepad comfort and audio balance/fatigue. No page layout, visible copy, gameplay, maps, physics, save schema, classic climber silhouette or fixed hair changed.

- Centralized the shared Drill-mode, contract-short and route-slot presentation vocabulary in `ui/presentation.mjs` in `20260807-p260`. Plan cards, queue actions, route cues, contract pills, mastery gaps, finish review, portrait goals and diagnostics previously depended on six separate runtime helpers that could drift between `Auto/Clean/Pace/Style/Expert`, `C/P/S/X`, and safe/fast/expert route meanings. Five allocation-free pure exports now own those mappings, preserve every existing label including the `快速` middle-route short form, and fail closed to `Auto`, `?` and the progression slot for unknown values. Direct tests cover every mode, short and slot; runtime/public/HTTP contracts forbid all retired definitions and redundant contract aliases. No visible copy or layout, training rules, gameplay, maps, physics, save schema, classic climber silhouette or fixed `#294657` hair changed.

- Hardened the shared core format boundary and moved four cloud-sync timestamp consumers out of the runtime in `20260807-p259`. `formatTime()` and `formatDelta()` previously emitted `NaN` fragments for non-finite values, while `splitGrade()` could grade negative or infinite malformed evidence and cloud date copy had a separate local formatter. Core formatting now converts only finite numeric input, rejects invalid grade evidence and owns the exact existing `zh-CN` local date display with a conservative `刚刚` fallback. Direct tests cover `NaN`, both infinities, negatives, numeric strings, valid local timestamps, invalid dates and custom fallback copy; runtime/public/HTTP contracts forbid the retired cloud helper and require all versioned exports. No valid visible copy, locale, cloud behavior, gameplay, maps, physics, save schema, classic climber silhouette or fixed `#294657` hair changed.

- Unified long-term challenge completion evidence across the Practice report, profile panel, privacy-bounded diagnostics and summit review in `20260807-p258`. Those four consumers previously mixed the new p257 summary with three local `filter/find` passes, so damaged or stale edge data could disagree on completed count or next challenge. `challengeProgressSummaryData()` now defensively filters invalid rows, clones returned items and supplies one `wins / total / next / review` snapshot; all-complete summit behavior still reviews the final challenge while Practice correctly says all complete. Direct tests cover partial, complete, empty, malformed and immutable outcomes, and runtime/public/HTTP gates require every consumer to delegate. After a repeated slow-frame R2 route passed beneath its first Relay, the existing real-input proof now holds Jump for 90ms before the state-driven Dash cue instead of immediately cutting jump height; it retains two bounded attempts, exact x270–355 contact, cooldown and retry-reset assertions. No visible copy or layout, challenge rules, progress persistence, gameplay, maps, physics, classic climber silhouette or fixed `#294657` hair changed.

- Consolidated the compact Practice report's chapter, long-term challenge, Drill and four-mode contract counters plus the settings gamepad status line under defensive `ui/presentation.mjs` models in `20260807-p257`. The Practice renderer previously traversed the same room archive through four separate helpers, while gamepad copy assumed a valid action array and numeric axis magnitude. One indexed snapshot now preserves room positions when an entry is damaged, bounds counters/progress, sanitizes challenge labels and supplies all four exact report fragments; the device formatter safely limits active actions and malformed counts/axes. Direct tests cover normal totals, completed challenges, damaged middle entries, extra out-of-range rooms and malformed device data; runtime/public/HTTP contracts require delegation and forbid the three retired summary helpers. After one slow-frame R7 browser miss, the real-keyboard updraft proof retains its exact `wind 1` and 630–730 coordinate assertions but allows the held traversal an additional second before timing out. No visible copy or layout, save schema, input behavior, gameplay, maps, physics, classic climber silhouette or fixed `#294657` hair changed.

- Unified chapter-transition and summit-resolution copy under the defensive `ui/presentation.mjs` model in `20260807-p256`. The three live consumers—chapter transition accessibility text, in-canvas transition evidence and the summit reveal—now share one formatter for assist state, partial room coverage, elapsed time and mistake/clean outcomes, while runtime adapters retain only current chapter lookup and time formatting. Direct tests preserve complete, partial, assisted, clean and summit fallback copy and bound malformed counts or injected line breaks; runtime/public/HTTP contracts require delegation. No visible wording, transition timing, UI structure, gameplay, maps, physics, save data, classic climber silhouette or fixed `#294657` hair changed.

- Extracted feedback-note normalization and feedback-template assembly into the defensive `ui/presentation.mjs` model in `20260807-p255`. The runtime still owns live viewport/gamepad/progress capture plus clipboard/download effects, while the pure model now white-lists feedback types, strips control characters, caps notes at 240 characters and safely formats incomplete or malformed diagnostics without throwing on missing viewport fields or invalid deadzones. Direct tests preserve the exact normal template and cover injected line breaks, unknown types, long notes and damaged nested snapshots; runtime/public/HTTP contracts require delegation and forbid the retired type-label helper. After one observed browser-gate race, the entry audit now waits for the existing animation-frame focus handoff before sampling while retaining the same visible/focus assertions. No visible UI, uploaded data, diagnostics privacy boundary, save schema, gameplay, maps, physics, classic climber silhouette or fixed `#294657` hair changed.

- Moved save-import preview and pre-import backup summary formatting into the defensive `ui/presentation.mjs` model in `20260807-p254`. The main runtime now retains only JSON validation, local backup transactions, DOM state and refresh effects, while direct tests preserve the exact normalized-save copy and require malformed fields, missing nested objects and injected line breaks to produce bounded single-line fallbacks instead of throwing. Public-surface, HTTP and runtime contracts forbid the two duplicate helpers from returning. No save schema, import/restore behavior, visible panel, gameplay, map, physics, classic climber silhouette or fixed `#294657` hair changed.

- Removed hidden-panel work from the live gameplay frame in `20260807-p253`. `updateHud()` previously called the complete Practice renderer every frame and repeatedly rebuilt the hidden room brief, report, plan, route, Feel, challenge, profile and ledger surfaces; it also rewrote unchanged HUD text, attributes and transforms. Practice rendering now runs only while its panel is visible or when that visible state changes, the hidden room selector updates only when the room actually changes, room-brief HTML is cached, and small guarded DOM setters skip identical HUD writes. A real-browser `MutationObserver` requires the entire hidden settings subtree to remain mutation-free during active play. The flaky R2 Relay and late chapter-buffer proofs now trigger real keyboard input from live player/transition state instead of narrow host-millisecond sleeps, while retaining one bounded room-reset retry and all collision/lifecycle assertions. No visible UI, physics, maps, save data, classic climber silhouette or fixed `#294657` hair changed.

## 2026-08-01

- Aligned the existing Practice plan language with its actual cross-room behavior in `20260801-p252`. The header now describes the sequence as `短板 → 迁移 → 跨房`; the first two cards keep their current roles, while the third names the evidence-backed mode it is filling—稳定、节奏、变化 or 高手线—instead of always claiming to “补路线链”. This is a copy-only refinement inside the same three cards, with browser coverage requiring the header and all three role labels to remain truthful. No new UI surface, map, physics, save field, character change or hair-color behavior was added.
- Broadened the existing three-step Practice plan across rooms in `20260801-p251` without adding a card or changing its layout. The first step still attacks the strongest current weakness and the second still transfers that room into the next Drill ability, but the third now prefers the highest-priority ledger target outside both earlier rooms before considering a same-room different-mode fallback. This keeps evidence-backed variety when the ten-room archive supports it while preserving useful two-room and one-room plans for sparse saves. Direct tests cover new-room preference and both fallback depths; the causal browser archive now requires three distinct rendered rooms as well as three distinct room/mode targets. Maps, physics, save data, visible copy, the classic climber and fixed `#294657` hair remain unchanged.
- Prevented the existing three-step Practice plan from repeating the same room-and-mode target in `20260801-p250`. The runtime previously chose its complementary second Drill separately, then selected the third from a ledger that only excluded the first, so the third card could silently duplicate the second. `practicePlanTargetsData()` now owns the complete target sequence, preserves every existing next-mode and readiness fallback, skips both earlier exact targets when selecting from the ledger, and uses a third distinct mode when only one room is available. Direct tests cover the duplicate-ledger case, the one-room fallback and invalid input; the causal browser archive requires all three rendered plan cards to be distinct while retaining the shared recommendation and launch proof. No card, menu, HUD, copy, map, physics or save field was added, and the classic climber with fixed `#294657` hair remains unchanged.
- Added end-to-end evidence for p249's unified practice recommendations. A causal browser archive now makes R3 the strongest Focus room, R1 the first missing Clean, R2 the largest positive split, R3 the first Style-ready room and R4 the first Expert-ready room; the live start Resume action, first three-step plan card, four queue cards and four room-scoped long-term challenges must expose those exact destinations, then Resume must actually launch `R3 Style`. This closes the integration gap between the directly tested pure model and its generated DOM/event consumers without adding runtime hooks, changing copy or injecting active game state. The full browser suite retains all gameplay, mobile, account, storage, classic-climber and fixed-hair coverage.
- Unified the general, Clean, Pace, Style and Expert room selectors under one defensive training-owned snapshot in `20260801-p249`. Continue Training, the four-card queue, challenge starts, the three-step plan and summit fallbacks previously rebuilt an interdependent chain of Focus, unplayed-room, S-grade, largest-loss, Style and Expert readiness rules in the main runtime. `practiceRoomRecommendationsData()` now calculates all five destinations together from ordered room evidence, preserves the existing `Focus ≥ 2 → unplayed → non-S → closest PB` general priority and every mode-specific fallback, rejects duplicate/invalid rows, and returns explicit `-1` sentinels for empty data. Direct tests lock actionable Focus, largest positive split, ready Style/Expert, fully mastered and malformed cases; runtime wrappers now only adapt live save/PB state. UI structure and copy, maps, physics, save schema, the classic climber and fixed `#294657` hair remain unchanged.
- Stabilized the real-browser R2 Relay-bridge regression after one observed external-timing miss following p248. The check still reaches the authored Relay exclusively through keyboard movement, Jump and Dash, but may now perform exactly one alternate 320ms launch after a real Quick Retry if the original 350ms macro passes over the node under a delayed browser frame. Both attempts remain bounded, the retry must prove grounded dormant state before continuing, and two misses fail with both diagnostic snapshots; no runtime hook, state injection or gameplay tolerance was added. Repeated full-browser passes can now distinguish a real landmark/reset regression from one host-scheduling miss while preserving maps, physics, UI, saves, the classic climber and fixed `#294657` hair.
- Consolidated the Practice room's medal, pace, Clean, Drill, four-mode contract and tier labels into one defensive `roomProgressSummaryData()` snapshot in `20260801-p248`. Route focus, room-select diagnostics, the practice ledger and the existing compact room brief previously called six separate runtime formatters over the same save/PB evidence, making those surfaces vulnerable to subtle count or target drift. They now consume one pure UI-owned model; invalid counters fail closed, future tier names remain visible, and direct tests preserve unplayed target-first copy, clean S evidence and above-target delta formatting. The six duplicate runtime helpers are forbidden from returning by the public-surface gate. No interface element or copy was added, and maps, physics, saves, training behavior, the classic climber and fixed `#294657` hair remain unchanged.
- Unified room training reasons and route recommendations under the pure `ui/presentation.mjs` model in `20260801-p247`. The main runtime previously evaluated the same current mistakes, unresolved archive pressure, split loss, Clean evidence and S grade in two adjacent helpers, leaving coach copy and the selected safe/progression/expert line vulnerable to drifting apart. One defensive model now returns both decisions from normalized evidence while Canvas/DOM wrappers retain only localized labels and formatting. Direct boundary tests preserve the deliberate distinction between a light archive warning and the three-fault coach threshold, plus unplayed, slow-split and clean-S outcomes; the public-surface contract requires runtime delegation. Full static and real-browser regressions preserve all UI structure and copy, maps, physics, saves, training behavior, the classic climber and fixed `#294657` hair.
- Extracted attempt-local landmark progress into `public/modules/game/landmark-progress.mjs` in `20260801-p246`. Mountain Gate's Spark/Relay/spring-apex wake rules and Old Peak's unique-Relay restoration had become two copies of the same progress concern inside the main runtime; they now share one defensive pure module while the Canvas wrappers retain only live room-state adaptation and drawing. The module rejects unknown landmark kinds, empty Relay sets and truthy-but-invalid `awakened` values, exports frozen supported-kind lists, and has a direct Node test covering dormant, partial, complete and malformed inputs. The local server whitelist, cache-version contract, HTTP smoke, documentation inventory and maintenance-tool manifest now treat the module and its test as first-class release assets. Full static and real-browser regressions preserve the exact p245 visuals, attempt resets, maps, physics, UI, saves, classic climber and fixed `#294657` hair.

## 2026-07-29

- Let Mountain Gate visibly learn with the player in `20260729-p245`. The first three rooms already taught a deliberate action arc but their bespoke gate steps, Relay bridge and mist springs remained static, making the opening act feel less finished than Old Peak, Wind Gorge and Star Summit. Those existing background landmarks now wake from the authored lesson itself: R1's first Spark completes the ascending step trace, each distinct R2 Relay advances half of the bridge, and R3's first spring plus spring-apex dash resolve the mist platform in two stages. Progress is attempt-local, survives an ordinary Relay cooldown, and clears through the existing death/retry/room-transition lifecycle; rendering uses bounded paths, freezes breathing under reduced motion and removes expensive glow through Calm/low-performance settings. Real-browser evidence proves R1 wake/retry and R2 wake/cooldown/retry behavior, while static/public contracts protect all three room mappings, background-only ownership, comfort budgets and fixed `#294657` hair. No HUD, map entity, collision, physics, save field or character change was added.
- Closed the authored spring-apex lesson through the full chapter arc in `20260729-p244`. R3 now introduces it, R6 combines it with Relays, and R10 requires it inside the summit synthesis for Style/Expert: a dash made during the short post-spring window and within the apex vertical-speed band earns one bounded green double-arc, the quiet `SPRING APEX / 顶点冲刺` world cue and 15 Flow. This is recognition, not a physics buff—the existing spring impulse, dash direction and ordinary 585 dash speed remain untouched—and the attempt-local window clears on landing, death, retry, room transitions and Echo recall. A real-browser R10 route proves spring launch, apex timing, ordinary-speed recognition and complete retry reset; data, public-surface and runtime contracts protect the three-room progression, fixed `#294657` hair, bounded rendering and reset lifecycle. Maps, HUD, save schema and the classic climber remain unchanged.
- Turned Wind Gorge's crumble strips into a readable commitment mechanic in `20260729-p243`. R7 and R8 already escalated from supported three-tile lessons to a five-tile corridor under prism pressure, but every tile still behaved as an isolated switch, so the chapter's authored strips did not read as a single decision. Contact now sends a bounded fracture ripple left and right through only contiguous same-row crumble in Wind Gorge: the touched tile starts its existing 0.42-second warning immediately, neighbours queue at 65ms distance intervals while remaining solid, and each then receives the full warning before breaking. Cyan-white queue marks are visually distinct from the existing red danger state, ripple particles remain inside the global effect budgets, and an 80ms crumble-sound cooldown prevents long strips from becoming an audio machine gun. R9–R10 deliberately retain single-tile arming, gaps and other rows stop propagation, and the existing room parse lifecycle restores every timer on death/retry/transition. Real-browser R8 evidence follows the five-tile strip through `q4/a1` to five staged breaks and a clean retry reset; static/public contracts protect chapter scope, collision-preserving delays, comfort rendering, bounded audio and fixed `#294657` hair. Maps, base break time, player physics, UI, saves and the classic climber remain unchanged.

- Gave Old Peak's repeated Relay language three room-specific environmental payoffs in `20260729-p242`. R4–R6 already asked for a chain, a switchback and a four-node exit sentence, but their Relay activations changed only the reusable node and short-lived chain thread, so the rooms' distinct routes left the same world response. Each unique Relay touched during the current attempt now awakens the existing background relic: R4 connects its three stones, R5 traces the folded ridge and R6 progressively repairs the broken gate. A node retains that attempt-local mark after its ordinary cooldown, cannot inflate progress when reused, and resets naturally through the existing death/retry/room-transition parse lifecycle. The response uses continuous bounded paths, freezes breathing under reduced motion and drops expensive glow in low-performance mode. Real-browser coverage proves R5 advances from `relic 0.00` to `0.33`, remains awakened past the 4.2-second node cooldown and returns to zero on retry; static/public contracts protect state ownership, three-landmark scope, comfort budgets, diagnostics and fixed `#294657` hair. Relay collision, recharge, chain scoring/window, maps, HUD, saves, physics and the classic climber remain unchanged.

- Closed the Lumen-to-summit world loop in `20260729-p241` without adding a collectible panel or changing the existing compact count. The Star Summit observatory already drew a complete five-point constellation in both R9 and R10, but it looked identical at 0/12 and 12/12, leaving current-run collection visible only as a resource pickup and finish number. The same background constellation now keeps a faint dormant silhouette at zero and continuously illuminates its four lines and five stars from `collected.size / totalLumens`; partial progress cannot masquerade as completion, while 12/12 quietly resolves the full shape before the existing summit ending. Reduced motion freezes breathing, Calm Effects lowers brightness and low-performance mode removes the shadow pass without hiding the silhouette. Real-browser R10 regression proves a partial/debug route starts at `lumen 0/12 · sky 0.00`; static/public contracts bind the renderer to current-run collection, continuous clamping, background-only ownership and fixed `#294657` hair. Collection, extra-dash reserve, finish eligibility/copy, maps, physics, UI, saves and the classic climber remain unchanged.

- Removed the persistent room-spanning Echo tether in `20260729-p240`. The active anchor already had its own illuminated state and a contextual keyboard/gamepad/touch recall action, so drawing a dashed line from that anchor through every platform to the climber added visual noise, resembled a navigation guide and weakened the quiet R9–R10 composition. Recall readiness now stays local to the saved point as two restrained broken rings; they expand only five pixels as separation grows, breathe without changing gameplay state, freeze under reduced motion and use the existing performance-aware shadow budget. The rings disappear during death or the existing 0.32-second recall cooldown and return with availability, while activation, lesson, touch button and actual recall behavior remain intact. Real-browser mobile coverage proves the ready-to-cooldown lifecycle around an actual R9 anchor/recall; static/public contracts forbid the retired cross-room line and protect local bounds, comfort behavior, render order and fixed `#294657` hair. Maps, collision, recall destination/restoration, audio, UI structure and saves remain unchanged.

- Made Wind Gorge visibly carry the climber in `20260729-p239` without adding particles to the global queues or another interface element. Updrafts already brightened their entire field while occupied, but that broad pulse did not show where the force met the player, so R7–R10 could still feel like the background changed rather than the room responding. An occupied field now draws two restrained rising wakes around the climber, behind the body and bounded to that exact field; their height responds modestly to vertical lift and they disappear as soon as overlap ends. Reduced motion freezes lateral sway, Calm Effects lowers opacity/glow, and low-performance mode removes the two optional travelling motes and shadow pass while retaining the readable pair of streams. Static/public contracts protect exact-field gating, player-relative placement, render order, comfort fallbacks and the absence of hair-state coupling; hidden diagnostics expose live wind occupancy for R7/R8 manual verification. Wind force, pull, stamina recovery, maps, collision, audio, UI, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Made Relay routes answer the player's movement in `20260729-p238` without adding a HUD row or permanent guide. Relay nodes already restored momentum individually, but even a clean two-to-four-node chain left the room visually unchanged, so its authored action sentence was easier to read in Practice copy than during play. Each Relay activation now contributes its world position to a bounded four-point path for the existing 1.35-second chain window; from the second node onward, a thin cyan thread connects the actual activation order, warms toward gold at three nodes, and disappears atomically when the chain expires or any existing retry/death/recall/room-reset boundary resets the chain. Reduced motion, Calm Effects and low-performance modes retain the static connection while suppressing travelling motes or expensive glow. Static/public contracts protect activation-order ownership, the four-point cap, render order and every reset path; hidden diagnostics expose path length for manual R4/R6 verification. Relay scoring, timers, collision, maps, UI, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Added a hair-independent ground recharge confirmation in `20260729-p237`. Spending the final dash and touching stable ground restored the resource correctly, but the only immediate proof was the small HUD meter; the climber's hair intentionally cannot change color, so players looking at the route could miss readiness. `restoreDashCharge()` now reports an actual capacity increase, and only the ordinary grounded restore path turns that transition into one short cyan ellipse with two small upward ticks at the climber's feet. The cue fades in 0.26 seconds, reduces expansion/glow under reduced-motion, Calm Effects and low-performance settings, never becomes a body aura, and cannot retrigger while the dash is already full. Relay, Prism, refill, recall, respawn and assist restores keep their existing dedicated feedback and do not raise the ground cue. A real-browser ground-dash regression proves one pulse, restored charge, automatic expiry and no extra recharge announcement beyond the existing timing status; static contracts lock the foot-only rendering and fixed `#294657` hair. Dash capacity, recharge timing, physics, audio, UI, maps and saves remain unchanged.

- Extended surface identity through wall movement in `20260729-p236`. P235 made landings reflect each act's stone, dust, ice or star material, but wall-slide and climbing still emitted universal white snow while wall-jump used the old generic square burst, breaking the tactile language exactly when the player touched the level most. Wall-slide and climb now shed the active chapter's restrained particles away from the contacted wall, while wall-jump sends the same material outward in a bounded directional fan and preserves the green climb-jump action accent. The existing effect budgets, calm/reduced-motion/low-performance scaling and generic snow used by wind/crumble remain intact. Static contracts guard all three wall contact paths and the directional fan; browser regression retains the live Old Peak material proof. Movement, stamina cost, wall grace, launch values, collision, audio, UI, maps, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Added restrained surface-aware landing feedback in `20260729-p235`. Every act already owned distinct platform material, but every hard landing emitted the same pale square burst and softer landings had no contact debris, weakening the room-to-room material identity during actual movement. Mountain Gate now sheds thin slate chips, Old Peak lifts warm dust, Wind Gorge releases small ice flakes, and Star Summit answers with restrained diamond sparks; light and hard landings share the same material language at different energy while existing low-performance, reduced-motion, calm-effect and global queue budgets still cap density. The immutable chapter content now owns the four feedback palettes/shapes, hidden diagnostics expose the active surface identity, unit/static contracts protect the mapping and browser regression confirms R4 resolves to Old Peak dust. Collision, physics, landing thresholds, shake/audio, UI, maps, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Bounded chapter-transition inputs in `20260729-p234`. The 1.8-second act breath correctly paused physics, but it also froze keyboard/touch Jump and Dash buffers at their full 0.13 seconds while gamepad polling stopped entirely; an action pressed near the start of the card could therefore execute long after its intent, and the three input families disagreed. Transitions now keep the shared input-buffer clock and gamepad edge polling alive while gameplay remains paused, so early actions expire and only a deliberate press inside the normal final buffer window connects to the new act. Hidden diagnostics expose the remaining act timer, and a real-browser R4 Practice regression proves stale Jump/Dash expiry plus a late buffered Jump. Transition duration, room timer, physics, UI, maps, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Preserved intentional late inputs across automatic death recovery in `20260729-p233`. Jump/Dash already had a 0.13-second action buffer, but `respawn()` unconditionally cleared it; a button pressed just before the climber reappeared was visibly accepted during the 0.22-second death window and then discarded. Automatic death now preserves only buffers still alive at the respawn boundary and re-arms those actions for one normal buffer window so the first grounding frame cannot consume them before play resumes. Manual Quick Retry and room restart continue clearing all stale actions, and inputs pressed earlier than the allowed window still expire. Hidden diagnostics now expose the death timer for deterministic boundary testing. A real-browser R1 fall proves all three cases: manual retry clears Jump/Dash, an early Jump does not launch the new attempt, and a late Jump fires immediately after automatic respawn. Maps, physics constants, death duration, controls, UI, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Closed the run-wide Lumen loop in `20260729-p232`. The HUD tracked `✦ x/12` across all ten rooms and each pickup powered the game's distinctive stored second dash, but reaching the summit discarded that run evidence from both the finish summary and the shareable report; the mechanic carrying the game's name therefore had no ending response. The existing finish line now includes the exact bounded current-run `微光 x/12`, the report carries the same field and its privacy disclosure names it, and collecting all Lumens replaces only the existing whisper with the fourth-act resolution “所有微光，都抵达了山顶。” Partial routes remain truthful and cannot receive the all-Lumen line. A pure presentation model owns clamping and completion semantics, unit cases cover partial/full/empty input, the real-browser partial-summit path verifies `0/12` in both finish and report, and mobile landscape verifies the longer line wraps without horizontal overflow. No card, achievement, menu or persistent save field was added; maps, physics, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Closed the remaining first-act lifecycle gap in `20260729-p231`. The initial start path restored R1 framing in p230, but “再来”, long-term challenge starts and direct Practice entries reset the room without passing through `begin()`, so the same room title could still inherit an expired timer and the second run had no fresh accessible announcement. Room-intro arming now belongs to the shared `resetToStart()` boundary, while the initial overlay exit still explicitly re-arms it after any time spent choosing an entry mode. A single opening-status formatter keeps first-run and restart wording tied to the canonical chapter data; restarts announce “游戏重开” before immediate control returns, and challenge-specific status may safely replace it. The real-browser finish lifecycle now requires the second run's first-act context in addition to modal cleanup and canvas focus. No panel, pause or HUD element was added; maps, physics, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Restored the missing first-act opening beat in `20260729-p230`. The existing R1 room-intro timer began running while the start-choice overlay was still open, so it had normally expired before the player pressed “开始攀登”; later acts received their title, vow and transition cadence while the first act silently began as an unframed room. A formal start now re-arms the same 1.2-second non-blocking room title, pairs “第一幕 · 山门” with its existing vow, and exposes the same context through the live status without adding a panel or pausing movement. Canonical room-to-chapter indexes and the four chapter start rooms now live beside the room data instead of being reconstructed from thresholds in the runtime, reducing future room-order drift. Module and static contracts protect that ownership, the browser gate requires first-act start context while retaining immediate movement, and a rendered local pass verifies the compact title stays readable over R1. UI structure, maps, physics, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Separated Practice Flow from full-route Flow evidence in `20260729-p229`. The long-term Flow card was presented as a full-run challenge but read the global `bestFlow`, and the next legitimate summit copied that historical Practice peak into `profile.bestFlowPeak`; a short Practice route could therefore manufacture evidence for a ten-room achievement. Practice and diagnostics retain the immediate personal Flow best, while the long-term “整局 Flow” challenge, its historical comparison and the profile summary now read only `profile.bestFlowPeak`, which advances solely from the current eligible summit's `flowPeak`. Existing saves remain compatible and previously awarded achievements are not destructively revoked. Static contracts guard the data ownership, unit fixtures cover the revised copy, and a real-browser archive with Practice Flow 999 versus full-route Flow 210 verifies that the card stays incomplete and both long-term views remain at 210. No UI layer was added; gameplay, maps, physics, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Added causal repair for normalized Focus progress in `20260729-p228`. Focus archives previously bounded each counter independently but accepted impossible combinations such as Expert wins without Expert starts, Clean clears above total clears, Drill wins above aggregate completions, or a death-reason count above total faults; malformed or legacy data could therefore light long-term challenges and redirect recommendations without supporting play evidence. Storage normalization now caps Clean by clears, Drill completion/clean totals by starts, allocates mode starts and wins within their aggregate evidence budgets, caps death-reason counts by total faults, and clears a last-death reason when its repaired count is zero. The repair is fail-closed while preserving valid counters and archive compatibility. Unit fixtures cover cross-counter corruption, static ownership guards protect the repair, and a real-browser import intentionally submits unsupported Clean/Pace wins and excess fall counts, then verifies the normalized values after the existing atomic backup/reload path. UI, gameplay, maps, valid progress, cloud format, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Isolated full-run summit records from partial-route completion in `20260729-p227`. Direct R10 Practice or an F3 room jump could previously reach the summit and increment the long-term clear profile or replace the best total time with a one-room run, because room-level eligibility was reused for whole-run records. The runtime now tracks whether the run originated from a formal R1 start and feeds that flag plus current-run evidence for all ten rooms into a pure presentation-owned eligibility model; only complete, unassisted formal routes may write summit clears or best total time. Genuine room PB and Drill results remain eligible inside Practice. Partial routes now finish with the explicit line “练习登顶，不计总纪录” instead of looking like a normal clear. Unit cases cover complete routes, direct-final-room Practice, full coverage after a jump, assist use and invalid evidence; static contracts protect the runtime integration, and real-browser coverage verifies the partial-summit finish label. UI structure, maps, physics, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Made dash refills value-aware in `20260729-p226`. A ready refill previously consumed itself and awarded Flow whenever the climber entered its radius, even with full dash and stamina; remaining nearby let the same pickup re-arm every 3.2 seconds and become a passive Flow source. Refills now activate only when the current dash capacity or climbing stamina is actually missing, while retaining normal restoration, cooldown reset, sound, particles and Flow reward after a resource is spent. A real-browser R3 fixture walks the full-resource climber from the authored checkpoint through the nearby refill and requires Flow to remain zero, then retries, spends a dash through the same pickup and verifies the charge and legitimate reward return. The content bible and playtest checklist now state the value boundary, and a static contract protects the runtime guard. UI, maps, targets, physics, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Reconciled the Old Peak capstone's player-facing route contract with its authored geometry in `20260729-p225`. R6 has four relay nodes and a two-stage spring exit, but its guide, purpose, expert line and Style goal still described only a double relay/double spring sentence; the Practice brief now names all four relay beats and both spring stages so the two extra nodes no longer read like unexplained route clutter. Module, route and broad contract gates require exactly four `A` tiles, exactly two `T` tiles and matching quantitative copy, while the playtest checklist asks testers to read four deliberate beats before the spring finish. Real-browser coverage selects R6 and rejects the stale wording in the rendered Practice brief. This is a clarity and content-contract correction: UI structure, map geometry, pressure, targets, physics, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Aligned the Gate capstone's authored entry across continuous play, direct Practice and retries in `20260729-p224`. R3's only checkpoint now starts on the stable upper-left recovery platform instead of skipping directly to the room's midpoint, so every mode rehearses the complete offset-spring exam while preserving its supported first spring, hazards, target and pressure score. The ten-room data contract now requires every unique `S`/`P` anchor to sit within the left three columns on stable ground; module, generated-data, map and route gates protect both the general rule and removal of R3's old shortcut. Real-browser coverage launches R3 Practice and verifies the climber settles at the authored coordinates before retaining the grounded R7 check and full regression suite. No UI was added; physics, saves, the classic climber and fixed `#294657` dark-blue hair remain unchanged.

- Restricted exact cloud comparison to the validated save whitelist in `20260729-p223`. After parsing a remote archive, login inspection now derives its canonical key from normalized settings, profile, room PBs, bounded paths, normalized Focus, best time and Flow instead of recursively revisiting the raw JSON text. Unknown root/storage metadata and even a 2,000-level ignored object cannot consume comparison work or manufacture a false conflict, while a real normalized Focus difference still changes the key. Storage-owned reconstruction keeps the archive schema and Focus envelope identical to uploads; static gates prohibit raw `cloudRow.archive` from re-entering equality comparison. Network payloads, accepted save fields, conflict UI, gameplay, rooms, the classic climber and fixed dark-blue hair remain unchanged.

- Replaced collision-prone cloud fingerprints with exact canonical save-content comparison in `20260729-p222`. Login conflict detection and upload deduplication no longer compress up to 1MB of settings, PBs, paths, Focus and Flow into a 32-bit FNV value; the storage module now sorts object keys, preserves array order, ignores only build/export timestamps and compares the complete normalized content key. A deterministic regression pair that genuinely collides under the retired hash (`1r275ky`) is now required to remain distinct, alongside tests for reordered keys, PB differences, room-indexed path order and cyclic non-JSON rejection. Full-field conflicts, queued changes during slow uploads and full-size archives still pass in a real browser. Schemas, network payloads, UI, gameplay, rooms, the classic climber and fixed dark-blue hair remain unchanged.

- Moved cloud-conflict progress protection into `modules/systems/storage.mjs` in `20260729-p221`. The account/UI monolith no longer owns separate predicates for meaningful settings, profile, paths and Focus state; it now normalizes current or remote state and delegates one storage-owned rule before deciding whether an initial cloud download is safe. Direct tests prove an empty normalized archive remains replaceable while any custom setting, summit/challenge profile, room PB, saved path, failed Drill, death reason, best time or Flow record requires an explicit local/cloud choice; malformed containers, false challenge flags and invalid numbers fail closed. Existing full-field browser conflict cases still preserve every local category, and static ownership checks prevent the four duplicate predicates from returning. Cloud payloads, schemas, UI, gameplay, rooms, the classic climber and fixed dark-blue hair remain unchanged.

- Re-shaped R9's Echo lesson into a deliberate recovery–pressure cadence in `20260729-p220`. The first updraft now resolves onto a seven-tile stable middle shelf instead of immediately arming four more crumble blocks; the right-side crumble sequence, two prisms, two relays, second wind and R10's denser finale remain intact. Late pressure now climbs `R7 40 → R8 52 → R9 72 → R10 92` rather than spiking `52 → 84` during the first formal Echo room, and the guide, purpose and safe route all name the new recovery beat. Map gates bound every late-room pressure step, exact contracts protect both the shelf and renewed crumble strip, and real-browser coverage verifies the runtime loads the 16-crumble R9 route while completing the existing touch Echo-recall loop. No UI was added; target time, physics, saves, the classic climber and fixed dark-blue hair remain unchanged.

- Grounded the Wind Gorge opening in `20260729-p219`: R7 was the only room without either the run's global start marker or a room checkpoint, so direct Practice silently relied on the parser's generic fallback position instead of an authored chapter entry. A restrained checkpoint now sits on the broad lower-left floor before the first crumble/updraft pocket, giving direct practice, retry and chapter entry one intentional origin without changing the route, hazards, target or physics. Room-data, map and route gates now require exactly one `S`/`P` entry anchor per room and protect the R7 support tiles; real-browser coverage launches R7 Practice and verifies the climber settles at the authored coordinates. No HUD was added, and the classic climber with fixed dark-blue hair remains unchanged.

- Removed the final write-only top-level runtime state in `20260729-p218`: the mastery result popup no longer assigns a legacy tint that its restrained mist renderer never consumes, and the immutable total Lumen count is now declared accordingly. The public-surface gate now classifies direct writes to every top-level mutable binding and rejects state with no read consumer, while a focused contract prevents the obsolete mastery tint from returning. This is a state-accuracy cleanup; the popup's fixed visual treatment, gameplay, saves, rooms, the classic climber and fixed dark-blue hair remain unchanged.

- Removed the final consumerless ES-module binding in `20260729-p217`: the main runtime no longer imports `TRAINING_TRANSITIONS` only to leave it unread, while the transition table remains owned, frozen and directly exercised inside `training/state.mjs`. The public-surface gate now parses every binding in the runtime's module destructuring—including aliases—and rejects any import whose only occurrence is the import itself. Route and release contracts now verify the real dependency (`trainingTransitionOptionsData`) instead of forcing the table name back into the monolith. This is a dependency-accuracy cleanup; gameplay, training transitions, saves, DOM, the classic climber and fixed dark-blue hair remain unchanged.

- Moved current-run act aggregation, slowest-act selection and privacy-bounded report assembly into `modules/ui/presentation.mjs` in `20260729-p216`. Diagnostics, summit review and “复制本轮” now share the same pure data model instead of rebuilding four-act evidence inside the monolithic runtime; the runtime retains only current-state collection, time formatting, clipboard/download effects and accessible status. The report model rejects invalid room-to-act mappings, clones returned review rows, removes injected line breaks and caps every display field so even malformed ten-room labels remain below the existing 4,000-character boundary. Direct module tests cover complete/partial runs, invalid mappings, deterministic slowest-act selection, exact report evidence, privacy wording and hostile labels. DOM, gameplay, saves, rooms, the classic climber and fixed dark-blue hair remain unchanged.

- Removed 125 fully shadowed top-level CSS rule blocks in `20260729-p215`, cutting 711 lines of historical P17–P122 cascade debt without changing selector order, media-query contents or any surviving declaration. A new zero-dependency `npm run css-audit` gate identifies only exact-selector blocks whose complete property set is redefined later, offers an explicit deterministic cleanup mode and now runs in the default release check. Static visual contracts were updated from obsolete intermediate theme values to the final P119/P126 HUD and panel surfaces. Full browser coverage protects desktop/mobile panels, contrast, touch targets and low-performance rendering; gameplay, rooms, saves, the classic climber and fixed dark-blue hair remain unchanged.

- Removed the remaining semantically unreachable coaching-toast branch in `20260729-p214`. `game-tip` now accepts only warning/error and storage feedback; challenge starts, Feel calibration and successful local-copy actions no longer call a helper that deliberately rejected their `coach` kind, and the retired onboarding style/visibility guards are gone. Browser coverage now measures the real fixed practice launch dock instead of an absent coach row, while manual and release guidance consistently forbid the deleted keyboard teaching strip. Existing challenge HUD, calibration canvas feedback, accessible status, gameplay, rooms, saves, the classic climber and fixed dark-blue hair remain unchanged.

- Removed the last orphaned interface pipeline in `20260729-p213`: obsolete onboarding hints, practice-priority/coach summaries, panel subtitles and their null DOM lookups, frame updates, listeners and 500+ lines of unreachable styling are gone. A generic public-surface check now rejects every stylesheet class without an HTML or runtime consumer, while focused contracts prevent these retired surfaces from returning. This is a maintenance-only cleanup: room visuals, gameplay, saves, controls, the classic climber and fixed dark-blue hair are unchanged.

- Removed a second consumerless runtime layer in `20260729-p212` and closed the gap that had hidden beneath it. Nineteen unreachable wrappers, short-label formatters, old HUD/detail renderers and duplicate review helpers are gone together with their relay/PB/Flow popup timers, labels, imports and checks that had incorrectly required dead code to remain. The cleanup exposed that the promised first-contact mechanic cue still had triggers but no render consumer: the existing restrained cue now renders once for Relay, Spring, Updraft, Crumble and Prism, mirrors its short lesson to the live status, yields to result/transition feedback, and no longer receives noisy text on every Spark. A generic public-surface gate now rejects any future main-runtime function whose only occurrence is its own definition. Gameplay scoring, maps, saves, physics, controls, the classic climber and fixed dark-blue hair remain unchanged.

- Made the summit review answer the run that just happened in `20260729-p211` without adding a card, menu or persistent HUD element. “下一 Drill” now ranks only visited current-run rooms: the room with the most mistakes receives Clean priority, otherwise the largest positive time over its room target receives Pace priority, and only an all-target run falls back to the long-term mastery plan. “本轮最大损失” now compares current splits with their targets instead of quietly reusing lifetime PB loss, and its detail names the actual split, target and fast route. A pure presentation model rejects unvisited/corrupt evidence, keeps deterministic ties and covers mistake, pace and all-target branches; browser regression plants an R10 mistake alongside older R1 history and requires the finish review to choose `R10 Clean`. The practice panel retains its long-term archive logic. Gameplay, maps, targets, records, controls, the classic climber and fixed dark-blue hair remain unchanged.

- Turned R10 into a real whole-run synthesis in `20260729-p210` without adding a mechanic, HUD element or menu. Its grounded opening now recalls Act I with a spring directly feeding the existing relay before the route enters Echo, updraft, prism and crumble pressure, so the finale changes sentence shape instead of merely repeating R9 at higher density. The concise room identity now exposes the spring callback and the wind segment that the map already contained but its skill model omitted, while the guide, purpose, safe/fast/expert lines, Style objective and Expert requirements agree on the complete six-part finale vocabulary. Exact map contracts protect the supported spring-to-relay launch and require both training modes to cover the full synthesis. Existing target time, summit pause, records, physics, controls, the classic climber and fixed dark-blue hair remain unchanged.

- Completed the fourth-act handoff in `20260729-p209` without lengthening the summit pause or adding a result card. R10's split and mastery overlays are now cleared before the 2.25-second summit reveal instead of expiring invisibly beneath it; the existing centered reveal keeps its quiet `山风停了一瞬。` line and adds one small data-backed `第四幕 · 星顶` time/mistake footer using the same complete/partial/assisted semantics as earlier act transitions. The same result is included in the live accessible status, while the existing fallback still guarantees entry into the modal review when animation frames are throttled. Browser coverage directly triggers a partial R10 route and requires `1/2 房` evidence through the reveal before review. Physics, timing duration, records, maps, controls, the classic climber and fixed dark-blue hair remain unchanged.

- Closed the act-to-act performance loop in `20260729-p208` without adding a card, HUD row or extra pause. The outgoing half of each existing chapter transition now replaces the generic “章节收束” footer with that act's current-run elapsed time and either `无失误` or its mistake count; partial/debug-derived acts state their visited-room coverage, direct Practice entry shows no fabricated outgoing result, and Gentle runs are explicitly marked assisted. The destination vow, two-stage cadence, gameplay pause, reduced-motion duration and four chapter sound identities remain unchanged. A pure UI model validates unique room membership, complete/partial coverage, clean/mistake aggregation and empty evidence; direct and public-runtime gates require the one computed result to flow into the existing transition. Maps, physics, records, controls, the classic climber and fixed dark-blue hair remain unchanged.

- Consolidated room-completion feedback in `20260729-p207` without adding UI. First clears now show the actual room time against the target, improved runs show the new PB against the previous PB, and slower runs show the current room time against PB; assisted clears use one explicit elapsed-time card that says records are not written. The duplicate CLEAR/CLEAN focus line has been removed, so a transition presents one concise split result plus one mastery card instead of stacking split, clear, mastery and next-room feedback. Clear audio now belongs to successful mastery presentation, preventing a failed Drill contract from briefly sounding completed before its retry. A pure UI model covers invalid timing, first clear, PB, slower split and assisted branches; public/runtime contracts prohibit the duplicate popup from returning. Physics, targets, records, maps, controls, the classic climber and fixed dark-blue hair remain unchanged.

- Removed the obsolete quiet-failure compatibility pipeline in `20260729-p206`. The runtime no longer allocates or ages invisible death marks/replays, maintains unused death-coach/failure-rehearsal state, calls empty render hooks, or carries unreachable coaching copy; 247 lines of state, timers, helpers and no-op drawing were deleted. Death/retry counts, live status, Focus statistics and advice, Drill retry feedback, PB/current route sampling, physics, maps, controls, the classic climber and fixed dark-blue hair remain unchanged. Release gates now reject any restoration of those dead markers instead of requiring empty hooks to exist, and the architecture explicitly forbids quality checks from preserving consumerless compatibility shells.

- Made saved PB replays explain themselves in `20260729-p205` without adding a menu, HUD row or free-play overlay. Drill, Route and Feel sessions now label the gold `PB 路线` separately from the cyan `本次` trace; the PB route marks bounded action transitions for Dash, Spark, Overdrive, Overdrive Dash and Prism Spark, uses at most one static label for each Dash/Spark/Overdrive family, and keeps combined or repeated transitions as quiet distinct symbols. The moving PB ghost names its current key action only while that action is active. A pure replay module rejects malformed/prototype-like state, caps markers for normal/calm/low-performance modes and preserves action precedence; direct tests, public-surface checks, HTTP boundaries, debug counts and the manual checklist protect the behavior. Free play, stored path schema, physics, maps, controls, the classic climber and fixed dark-blue hair remain unchanged.

- Gave the four acts their own restrained audio identity in `20260729-p204`. Ambient harmony profiles now own distinct chord pairs, pacing, waveform and gain while preserving the existing quiet Flow lift. A normal act boundary releases any scheduled old-act pad, resets the destination phrase, then plays a short source-resolution note before the new act's three-note arrival; direct Practice entry omits the false source resolution, and the summit uses its own four-note ascent before review. Scheduled ambient oscillators are tracked and softly cancelled on reset, room jump, act change and summit so future notes cannot bleed into the wrong chapter. Pure cue tests lock identity, cycling, gain/offset bounds and transition order; the public module, whitelist and listening checklist cover the runtime boundary. UI, physics, maps, controls, the classic climber and fixed dark-blue hair remain unchanged.

- Bounded long-session visual feedback in `20260729-p203`. Particles, dash ghosts, shards and light trails now share explicit normal, calm-effects, reduced-motion and low-performance budgets; when a burst exceeds its budget, the oldest entries are discarded so the newest player action remains legible. Full-run resets, debug room jumps and deliberate room restarts clear prior-room particle/shard residue, while the existing death-to-respawn burst remains continuous. A direct 10,000-append pressure contract, public-module ownership checks, HTTP whitelist coverage and debug counters protect the boundary. Physics, maps, timing, controls, the classic climber and fixed dark-blue hair remain unchanged.

- Closed three world-state feedback gaps in `20260729-p202` without adding HUD or tutorial surfaces. Entering an updraft now plays one restrained rising wind cue rather than retriggering every frame; a newly reached checkpoint plays a distinct confirmation chord and updates the existing live game status; crumble ice now gives a short brittle crack when armed and a separate low break sound when it actually disappears. Same-frame sound cooldowns now correctly suppress duplicates even when the WebAudio clock is exactly zero. Static release gates lock presets, entry detection, triggers, status copy and cooldown behavior, while the manual checklist names the R7 listening pass that still requires human ears. Physics, maps, visual timing, storage, the classic climber and fixed dark-blue hair remain unchanged.

- Gave all four acts distinct platform material language in `20260729-p201`. The Gate keeps clean slate cracks and cool snow edges, Old Peak gains restrained ruin seams and warm weathering, Wind Gorge uses directional wind-cut marks and green-cyan edges, and Star Summit carries quiet diamond etching and rose-gold edges. Materials are selected from immutable chapter data and included in the tile-sprite cache key, so the richer identity adds no per-frame geometry, DOM or collision work and remains compatible with low-performance mode. Data export, validation and public-surface contracts require all four unique supported materials. Maps, hazards, platform silhouettes, physics, timing, the classic climber and fixed dark-blue hair remain unchanged.

- Established the first UI presentation boundary in `20260729-p200` without changing visible behavior. Chapter completion weighting, grade thresholds, practice-room priority and ledger sorting now live in `public/modules/ui/presentation.mjs`; the main runtime supplies current state and keeps DOM ownership. Direct tests cover representative completion math, every grade boundary, invalid inputs, capped split loss, immutable ranking and caller-order preservation, while public-surface and HTTP gates require the versioned module and its runtime delegation. Architecture, quality and optimization docs now match the actual module state, and README's stale P183 “latest” section has been removed. Gameplay, maps, physics, timing, storage schema, DOM, the classic climber and fixed dark-blue hair remain unchanged.

- Tightened the opening mechanic lessons in `20260729-p199` without adding another HUD or menu surface. A new player now receives one short existing canvas cue when first activating a relay or landing on a spring; returning players with a clear or recorded time in the teaching room remain undisturbed. R2's first relay now sits on a level checkpoint-to-relay runway with stable recovery ground directly below, while R3's supported first spring is protected by an explicit route contract. Canonical copy, eligibility, runtime triggers and map safety are covered by direct and structural tests. Pressure, timing, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Closed the Echo-to-finale teaching loop in `20260729-p198`. R10's existing anchor has moved from an isolated lower gap to stable ground one tile beside the entry checkpoint, so every finale attempt establishes a clear safety decision before the combined route. R10 room skills, guide, purpose, route lines, Style objective and Expert requirements now all require establishing Echo, while recall remains optional rather than becoming a wasteful mandatory action. A successful recall now gives the restrained canvas confirmation “冲刺与体力已恢复” and updates the live game status for keyboard, gamepad and touch users. Map/route contracts lock the R9 teaching pocket and the one-tile R10 reuse pocket; the browser regression now proves real touch recall feedback and R10 anchor reactivation. Pressure, timing, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Added first-contact teaching feedback for the Wind Gorge mechanics in `20260729-p197`. A new player now receives one short existing canvas cue—the same restrained surface used for timing feedback—when they first enter an updraft, arm crumble ice or activate a prism. Each cue appears at most once per browser session, never pauses play, adds no DOM or menu element, and is automatically suppressed when the corresponding teaching room has already been cleared or has a recorded time. Canonical cue copy and the pure eligibility rule live with room data; tests cover unseen, session-seen, cleared, recorded, unknown and prototype-named inputs. Route contracts now also lock R7's supported crumble/updraft pocket and R8's stable first-prism landing. Removed two unreachable checks from the intentionally quiet DOM-tip path. Maps, physics, timing, the classic climber and fixed dark-blue hair remain unchanged.

- Gave chapter changes a complete emotional cadence in `20260729-p196`. Normal act boundaries now briefly acknowledge the chapter just cleared with a room-data-owned resolution line before cross-fading into the next chapter title, vow and mechanic focus; direct Practice entry still shows only the destination chapter. The existing canvas transition remains non-interactive and keeps Flow, route cues and mastery feedback paused behind the same breathing beat. Reduced-motion users receive a stable 1.2-second two-part reading window instead of compressed motion. No menu, modal or HUD was added, and gameplay, room timing, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Rebuilt the playable center of R5 “棱线回环” for `20260729-p195`. The lower approach now leads to a capped central ridge, the mid-room relay sits clearly left of that ridge, and the upper exit returns right, making the promised right–left–right switchback legible in collision rather than only in copy or scenery. The ridge adds a stable safe landing while giving the expert line a real Wall Spark cut that can skip the left recovery platform. R5 guidance, purpose, route lines and Style objective now describe the same geometry; dedicated map and route contracts lock the ridge cap, vertical face, left relay, recovery checkpoint and upper relay. Room timing, player physics, controls, other rooms, the classic climber and fixed dark-blue hair remain unchanged.

- Added a restrained, data-driven landmark layer for all ten rooms in `20260729-p194`. Each room now has a distinct non-colliding world silhouette—gate steps, relay bridge, mist springs, triple link, switchback, broken gate, wind notch, prism hall, echo rings or summit mark—so early and middle rooms no longer rely on the same floating-platform impression. The layer stays behind gameplay geometry, honors calm/reduced-motion/low-performance settings, adds no HUD or menu surface, and does not change maps, collision, timing, physics, the classic climber or fixed dark-blue hair. Landmark ownership lives with canonical room data, is recursively frozen, exported to the generated validation snapshot and covered by alignment, uniqueness, normalized-position and restrained-scale contracts.

- Completed the training result-assembly boundary for `20260729-p193`. Route interruption/completion records and summaries plus Feel interruption/completion records and card presentation now use exact-match pure rules in `public/modules/training/state.mjs`. The runtime no longer falls back to the first Route or Feel item when an active ID is invalid; stale state is safely cleared without fabricating a plausible but wrong review. Direct tests cover middle-step interruption, final completion, active/resumable/suggested summaries, invalid and prototype-named IDs, wrong-room/wrong-mode Feel completion, clean detail, and active/recent/interrupted/default presentation. Timers, visible copy, diagnostics shape, records, gameplay, rooms, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Removed challenge persistence side effects from rendering for `20260729-p192`. Active run/No-Death/Flow state, review copy, seven long-term challenge progress calculations and win reconciliation now live as pure rules in `public/modules/training/state.mjs`. Challenge cards, profile summaries and summit summaries no longer mutate or write the profile merely by rendering; eligible PB/Clean/Drill/Flow/summit events and one startup reconciliation explicitly persist newly earned wins exactly once. Direct tests cover failed and completed active challenges, all seven progress types, capped Flow display, invalid active IDs, repeated reconciliation, unknown-key removal and prototype-named rejection. Profile schema, challenge definitions, assist isolation, visible copy, gameplay, rooms, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Completed the Focus-stat derivation slice for `20260729-p191`. Fault, clear, Drill start/win counters now update immutably through `public/modules/training/state.mjs`, share the storage schema's 9,999 cap, and reject prototype-named Drill modes. Leading fault selection, contract stats/progress, pressure, mastery score/level and next review mode now use the same guarded pure rules. Direct tests cover tie order, fallback reasons, clean/non-clean clears, per-mode counters, unknown modes, zero/over-complete progress, corrupted numeric fields, pressure penalties and every mastery/review threshold. Focus storage keys and schema, cloud archives, visible copy, gameplay, rooms, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Established the first training-state boundary for `20260729-p190`. Immutable reset/room-jump policies, Drill creation and success rules, Route step clamping/current lookup/resume/matching/advancement, and Feel fixture mode/matching now live in `public/modules/training/state.mjs`. Direct tests cover inclusive Pace/Expert targets, Clean/Style failures, invalid and prototype-named transitions, empty/unknown Route contracts, bounded resume, mismatch preservation, final-step completion and Feel precedence. DOM copy, the 80ms Route handoff timer, records, physics, rooms, the classic climber and fixed dark-blue hair remain unchanged.

- Completed the input buffer rule boundary for `20260729-p189`. Jump and dash buffer fill, countdown, availability, consumption and reset now share guarded helpers in `public/modules/systems/input.mjs`; all keyboard, touch, gamepad, focus-release, death and action-success call sites use the same rules. Direct tests lock the existing 0.13-second windows, independent action consumption, zero clamping, invalid-duration fail-closed behavior and rejection of prototype-named actions. Timing constants, per-frame refill order, physics, rooms, the classic climber and fixed dark-blue hair remain unchanged.

- Unified keyboard, touch and gamepad held/edge/release handling for `20260729-p188`. Repeated keydown and touch events no longer create duplicate action edges, gamepad device changes are reconciled without replacing state ownership, and blur/visibility/panel transitions now neutralize both touch and gamepad digital state instead of leaving a stale gamepad direction until the next poll. Direct tests cover repeat suppression, release/re-press, per-frame edge clearing, touch transitions, gamepad reconciliation and full focus-release reset. Buffer windows, event ownership, gameplay, rooms, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Extracted the device-independent input mapping slice for `20260729-p187`. Gamepad axes, D-pad/buttons, trigger thresholds, drift diagnostics and edge presses now share `public/modules/systems/input.mjs` with preset/custom binding resolution, platform labels, reserved-key validation and duplicate-key swaps. Direct Node tests cover exact deadzone and trigger boundaries, mixed axis/button input, multi-pad diagnostics, opposing direction cancellation, prototype-named preset rejection, Mac/PC labels and binding swaps. DOM focus isolation, keyboard/touch listeners, jump/dash buffers, gameplay, rooms, physics, the classic climber and fixed dark-blue hair remain unchanged.

## 2026-07-28

- Completed the storage-rule boundary for `20260728-p186`. Settings migration and binding fallback, corrupted local JSON repair, save archive assembly, backup assembly/validation, and input clamps now join the P185 guards and transaction rollback in `public/modules/systems/storage.mjs`; the main runtime only supplies current state and retains UI/cloud orchestration. Direct tests lock field order, schema values, repair/write-failure notices, invalid backup rejection, prototype-named preset rejection, Mac/PC binding fallback, touch/deadzone bounds and prior archive behavior. Save keys and payload shape, cloud semantics, gameplay, rooms, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Extracted the directly testable storage foundation for `20260728-p185`. Numeric and boolean guards, profile/PB/path/Focus normalization, archive structure validation and multi-key rollback now live in `public/modules/systems/storage.mjs`; the main runtime retains schema configuration, UI, backup assembly and cloud orchestration. Direct Node tests cover malformed and oversized archives, legacy Focus envelopes, unknown challenge keys, path bounds, strict booleans, caps and exact restoration after a partial write failure. Browser storage/import/cloud behavior, save schemas, gameplay, rooms, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Completed the canonical room-content boundary for `20260728-p184`. Ten maps, targets, chapter copy, skill labels, route guidance, atmosphere palettes and Style/Expert contracts now live in `public/modules/game/room-data.mjs`, load in parallel with the existing core modules, and are recursively frozen to prevent accidental runtime mutation. Snapshot export now merges that module with the state-coupled Route/Feel fixtures still owned by the main runtime. Direct module checks, source ownership, build-version, MIME, whitelist, map and browser gates cover the new boundary. Gameplay values, maps, saves, DOM, physics, the classic climber and fixed dark-blue hair remain unchanged.

- Completed the second reversible core slice for `20260728-p183`. Rectangle overlap, rectangle-to-point distance and bounded numeric approach now live in `public/modules/core/math.mjs`; the format and math modules load in parallel so the extra boundary does not add a request waterfall. Direct Node tests lock strict edge-contact, inside/outside distance and no-overshoot behavior, while ownership, version, MIME and whitelist gates prevent duplicate or missing implementations. Physics constants and call sites, input, saves, DOM, rooms, the classic climber and fixed dark-blue hair remain unchanged.

- Completed the first reversible low-risk module slice for `20260728-p182` without changing gameplay, saves, DOM structure or visible surfaces. Time formatting, split grading and HTML escaping now live in `public/modules/core/format.mjs`, consumed through a versioned native dynamic import after the synchronous anti-embed guard. Added direct Node behavior checks, module ownership/version contracts, local-server MIME and whitelist coverage, and real-browser boot regression; the old climber silhouette and fixed dark-blue hair remain untouched.

- Removed the remaining Node 20 compatibility dependency from the release path without changing the public P181 runtime. Configure Pages, Upload Pages Artifact and Deploy Pages now use their reviewed native-Node-24 releases pinned to full official commit SHAs; the obsolete force-runtime override is gone, and repository checks now reject either old release set or a reintroduced compatibility flag. This closes the deprecation warning observed in the P181 deployment and keeps the Pages supply chain aligned with the project's Node 24 baseline.

- Restored input parity and softened the first Echo lesson for `20260728-p181`. R9 now places its first anchor one safe tile from the entry checkpoint so activation and the temporary device-aware recall cue happen before the wind/prism/crumble exam. Touch players gain a contextual `召` action in the action cluster's existing spare cell: it stays hidden outside Echo rooms, exposes unavailable/ready/cooldown states, and drives the same recall path as keyboard and gamepad. Browser smoke performs a real touch recall, rejects boot-time runtime errors, and covers the contextual control at 390px and 320px widths. Manual retry and room restart now refresh mistake HUD state synchronously instead of waiting for the next animation frame.

- Closed the human-playtest evidence loop for `20260728-p180` without adding a persistent surface or changing the save schema. The collapsed summit review now offers one `复制本轮` action that exports a bounded text report with build, total time, four-act and ten-room timing, mistakes, Flow and assist status. The report explicitly excludes identity, device names, raw input history and route coordinates, never uploads, and falls back to a local text download when clipboard access fails. Diagnostics, feedback templates and the new run report now share one clipboard/download helper, replacing duplicated error-handling code.

## 2026-07-28

- Added current-run evidence for `20260728-p179` without expanding the persistent HUD or save schema. Every timed room now contributes to an in-memory ten-room breakdown; the collapsed summit review compares all visited acts, reports their times and mistakes, and names the slowest complete-run act. Diagnostics expose bounded `roomTimes`, `roomMistakes`, and four `chapterSplits` arrays so a human R1–R10 pass can drive the next difficulty-tuning round instead of relying on lifetime PBs alone. The summit-to-review handoff now also has an identity-guarded timer fallback, preventing a throttled background tab from remaining stuck in the in-world reveal while keeping stale timers harmless after a reset.

## 2026-07-28

- Polished the chapter capstones and summit payoff for `20260728-p178`: R3 now closes Gate Approach with an offset two-spring exam, R6 closes Old Peak with paired relays and springs, and R8 reconnects prism/crumble pressure to a final updraft. Reaching the R10 goal now holds on a restrained in-world summit reveal before the finish review. The classic climber gains a subtle body-level updraft response while the restored silhouette and fixed dark-blue hair remain unchanged.

## 2026-07-28

- Restored the preferred classic climber silhouette for `20260728-p177`: removed the added light ribbon and fixed the hair to its dark-blue color instead of changing it with dash or overdrive state, while retaining the chapter pacing, room atmosphere, ambient harmony, accessibility, and assist-mode work from P175–P176.

## 2026-07-28

- Turned the existing four visual acts into a paced chapter experience for `20260728-p176`. Crossing into Old Peak, Wind Gorge, and Star Summit now creates a short non-timed breath at the safe room edge, names the act, states its movement promise, and then returns control without adding a menu or blocking cutscene. Each act also receives a restrained motion identity—gate motes, old-peak dust, wind streaks, or rising summit stars—while honoring reduced-motion and low-performance settings.

## 2026-07-28

- Added the restrained `20260728-p175` atmosphere/accessibility pass without expanding the main surfaces: an original light-ribbon silhouette for the climber, one quiet narrative line per room, a four-chapter procedural ambient harmony layer that subtly lifts with Flow, and a single Gentle assist setting (85% simulation speed, two dashes, unlimited stamina). Assisted runs remain playable to the summit but are isolated from PBs, clean clears, Flow bests, challenges, training contracts, summit profiles, and best times; settings migrate to schema v4.

## 2026-07-28

- Simplified the playable surfaces for `20260728-p174`: the start menu now has one dominant climb action, two compact utility actions, and a separate full-width cloud-save entry. Practice now opens with only `选择房间` and `训练记录`; route contracts, Feel Lab, progress history, and long-term goals are nested one level deeper so no capability is lost while the first view stays quiet.
- Reworked R4–R10 without adding another mechanic or room. The midgame now uses clearer alternating ledges, foldback recovery, and route splits; the wind/prism/echo rooms have stronger shafts and corridor silhouettes; the finale carries longer connected platform phrases. Target times now follow the enlarged routes, while pressure order, crumble teaching order, contracts, and Feel fixtures remain intact.

## 2026-07-28

- Consolidated the release into a truthful short-term architecture: `public/` is now the only deployable tree with one HTML entry, runtime assets, and the pinned Appwrite SDK; Pages stages that directory directly. Removed the duplicate standalone HTML, empty `src/` scaffold, one-shot patch, two write-capable seam workflows, the redundant maintenance workflow, eleven migration-planning documents, and eighteen unused adapter/seam tools. Replaced the 60KB release-history README with a focused run/architecture/test/deploy guide, rewrote the architecture, data, quality, roadmap, and tool docs around current behavior, and reduced maintenance checks to real runtime/release regressions plus guards against obsolete scaffolds returning. Bumped public assets to `20260728-p173`.
- Hardened the public, account, and CI supply-chain attack surfaces. Added a CSP that limits scripts to same-origin assets, connections to the pinned Appwrite region, inline script execution, objects, workers, and referrer leakage; framed copies now replace all account/game interaction before initialization, covering GitHub Pages where response-level `frame-ancestors` is unavailable. Restricted the local server to the six runtime/license files, GET/HEAD, and security headers; changed Pages to publish a staged runtime instead of the repository root. Disabled unused Appwrite services, GraphQL/WebSocket, JWT, and invites; enforced 30-day sessions, five concurrent sessions, three-password history, and new-session alerts on the live project. Password fields are cleared after successful login and logout. Pinned every GitHub Action—including write-capable PR automation—to an official full commit SHA. Extended public-surface, Appwrite, HTTP, and workflow gates to prevent policy, artifact-scope, embedding, or mutable-action regression. Bumped public assets to `20260728-p172`.

## 2026-07-26

- Made the collapsed mobile Settings drawer content-sized instead of stretching five system rows across nearly the full viewport; opening Account, Controls or Save now grows only to the dynamic viewport/safe-area ceiling and then scrolls. Promoted the transparent dismissal backdrop from the portrait game-stage rectangle to the full viewport so top, bottom and side blank areas share one reliable touch path. Added mobile geometry coverage that limits the empty tail while retaining keyboard-resized drawer checks. Bumped public assets to `20260726-p171`.
- Moved the pre-import recovery backup into the same local-storage transaction as all seven replaced save keys. A quota or write failure now restores the exact previous backup alongside settings, profile, room records, paths, focus statistics, best time and Flow instead of silently replacing the user's last recovery point before a failed import. Browser coverage seeds a prior backup, rejects a mid-transaction write and requires byte-for-byte rollback of every key. Bumped public assets to `20260726-p170`.
- Replaced the one-shot Appwrite SDK injection with a shared awaitable loader that removes failed script elements and can retry from the Account drawer or the next authentication action. A transient SDK network failure now reports a clear retry path and recovers without a full-page refresh; browser coverage blocks the first vendor request, confirms cleanup, unblocks it, and restores the real account surface through the Email entry. Bumped public assets to `20260726-p169`.
- Aligned the visible save-import textarea with the 1M archive parser and cloud limit instead of silently truncating user paste at the legacy 240k HTML maximum. Strengthened the large-archive browser regression to open the real Settings/Feedback & Save surface, focus the textarea, insert the 4,200-point archive through the browser input channel, and require its full length plus a valid import preview. Bumped public assets to `20260726-p168`.
- Made the guest/email chooser synchronous for genuinely new visitors instead of hiding the first screen behind Appwrite session restoration. Added a non-sensitive boolean account hint so signed-in refreshes and new tabs still restore without chooser flash; unauthorized sessions clear the hint, timeouts expose Guest without discarding the retry hint, and repeated background fallback no longer steals an active choice's focus. Added real-browser coverage for immediate entry, expired hints, hinted refresh and timeout recovery. Bumped public assets to `20260726-p167`.
- Pinned the repository Appwrite configuration to the live `fra` regional endpoint instead of relying on machine-local CLI state. Raised the conservative client archive guard from 240k to 1M characters to match the off-page `longtext` schema and prevent complete ten-room best-route history from being rejected; browser coverage now uploads and self-previews a 4,200-point archive above the former cap. Bumped public assets to `20260726-p166`.
- Replaced the browser-default first-run focus outline with a restrained two-layer teal ring that remains unmistakable without looking disconnected from the pale entry surface. Raised the Password mode recovery action from a measured 3.59:1 to at least 4.5:1 and added an ancestor-composited contrast assertion to the real mobile password flow. Bumped public assets to `20260726-p165`.
- Focused the Guest choice when the asynchronous account-session check resolves to the first-run chooser, while guarding against stealing focus from a recovery/account drawer. Suppressed the portrait room-coaching card for the full pending-entry phase so narrow phones present one clean guest-or-email decision, and added 320×568 safe-area, touch-target, focus, and background-isolation coverage. Bumped public assets to `20260726-p164`.
- Raised the compact key-binding section headings and disclosure chevrons from measured 3.70:1 and 3.98:1 contrast to at least 4.5:1, slightly enlarging the 10px Move/Action headings for crisper scanning. Replaced the settings contrast test's flat-background approximation with ancestor-aware alpha compositing, added both missed elements to the gate, and extended the mobile browser pass with a real touch tap on the exposed drawer margin that must dismiss without click-through and restore the Settings trigger. Bumped public assets to `20260726-p163`.
- Transferred modal return-focus ownership when the transparent backdrop maps a visible Practice or Account region into a one-click panel switch. Closing the switched panel now returns keyboard focus to the action the player actually selected instead of the stale Settings trigger; real-coordinate browser regressions assert both Practice and Account return paths. Bumped public assets to `20260726-p162`.
- Delayed settings-backdrop dismissal from pointer-down to the completed click so hiding the backdrop cannot retarget the same gesture onto the underlying Start action. Added a real-coordinate regression over the start-button region that requires the drawer to close while the start overlay and hidden HUD remain unchanged, alongside the Practice and Account one-click switching checks. Bumped public assets to `20260726-p161`.
- Added a real transparent settings backdrop above inert gameplay/start surfaces so clicks and taps on blank space or an underlying menu/action region are no longer swallowed. The backdrop closes the drawer everywhere outside it and preserves one-click switching to Practice or Account when those visible entry regions are selected; browser coverage now uses a real coordinate pointer over the start-menu Practice button instead of synthetic events. Bumped public assets to `20260726-p160`.
- Replaced placeholder-only identification for the signed-in New Password and Current Password fields with unique explicit accessible labels while preserving the compact visual layout. Upgraded mobile-browser account semantics coverage from checking HTML `name` attributes to resolving label/ARIA sources for all five email, OTP, and password fields, enforcing non-empty unique names alongside autocomplete purpose and live-status descriptions; bumped public assets to `20260726-p159`.
- Generalized dirty-cloud resumption beyond uploads so local changes made while a signed-in account operation such as password update is busy automatically restart cloud saving once that operation clears. Added a retry block so upload failures retain the visible “同步失败” state without an immediate loop or being overwritten by “待同步”; a new local change, explicit upload, or leave flush deliberately clears the block. Browser coverage holds password update open, changes settings outside the drawer, verifies no concurrent write, then confirms the resumed archive; bumped public assets to `20260726-p158`.
- Added explicit dirty and flush-request state to deferred cloud saving: every local write immediately reports “待同步”, an in-flight upload no longer drops changes whose debounce fires while busy, successful completion schedules a second upload containing the newest archive, and a pagehide received while busy makes that follow-up bypass the normal delay. Browser coverage holds one upload open, makes another setting change, requests a leave flush, then verifies a non-concurrent second write contains both changes before returning to “已同步”; bumped public assets to `20260726-p157`.
- Split cloud upload permission from inspection completion so a network/server read failure keeps both replacement actions locked instead of allowing a forced local overwrite of an unknown remote. Confirmed absence, a normalized remote, or a fetched-but-corrupt archive may explicitly permit upload; corrupt content still blocks download while allowing local repair. Added browser coverage for read-failure lockout and the asymmetric corrupt-archive repair state; bumped public assets to `20260726-p156`.
- Added an explicit pending cloud-inspection state so session restore reports “检查中” instead of prematurely claiming “已同步”, locks both upload and download until the remote result is known, preserves Logout, and only enables “使用云端” after the fetched archive passes normalization. Account autofocus now ignores disabled cloud actions, successful uploads establish a usable remote snapshot, and browser regressions cover pending permissions plus both conflict choices; bumped public assets to `20260726-p155`.
- Scoped cloud-save inspection to the account-session generation that initiated it, keeping fetched rows local until both generation and user identity are still current; logout now invalidates any pending inspection before deleting the session and a failed logout establishes a fresh generation before re-inspection. Added a browser race that suspends the cloud read, completes logout, then resolves the stale read with corrupt data and verifies the UI remains logged out; bumped public assets to `20260726-p154`.
- Made every outside-dismissed settings/account drawer return focus to its actual live trigger, with a rendered-overlay fallback for dynamically replaced start/finish content; the closed drawer is now inert, and delayed account autofocus verifies that the drawer is still open before moving focus, preventing rapid open/close from re-entering hidden fields. Added browser regressions for the entry account race, start-settings trigger and finish-review title, and bumped public assets to `20260726-p153`.
- Retired the summit review's complete modal lifecycle when “再来” starts the next run: the hidden overlay now drops its finish layout class, dialog role, modal/label relationships and scroll position before gameplay accessibility is restored, focus returns to the canvas, and restart uses overlay delegation so a real mobile-browser second-run regression can exercise the production path; bumped public assets to `20260726-p152`.
- Added a dedicated keyboard-focus trap to the modal summit review so forward Tab wraps from the final control to the first and Shift+Tab wraps back, reusing the same rendered-focus filtering as settings; added a mobile-landscape browser regression for both directions and bumped public assets to `20260726-p151`.
- Removed the remaining CSS-generated `+ / -` symbols from the dynamically rendered summit-review disclosures, replaced them with visually equivalent decorative chevrons, synchronized their expanded state through a delegated overlay listener, and added mobile-landscape browser coverage for initial and opened states; bumped public assets to `20260726-p150`.
- Replaced CSS-generated settings/practice disclosure arrows with real visually equivalent chevrons hidden from assistive technology, synchronized `aria-expanded` through both user and programmatic open/close paths, and added browser regressions that reject generated accessible text or stale disclosure state; bumped public assets to `20260726-p149`.
- Replaced the account login mode's incomplete tab semantics with a labelled segmented-button group whose pressed state follows the active code/password method, added password-manager/autofill names and live-status descriptions to every account field, and added mobile-browser and static contract regressions; bumped public assets to `20260726-p148`.
- Replaced the cloud-conflict check for a nonexistent `roomFocus.attempts` field with complete meaningful-save detection across customized settings, all profile/challenge records, room PBs, recorded paths, every focus/Drill/death counter, best time and Flow; added authenticated browser conflicts for focus-only, path-only and settings-only local saves and bumped public assets to `20260726-p147`.
- Bound every issued email OTP token to its normalized email, invalidated the old user/token/code state immediately when the email changes or a replacement send begins, cleared it after login/logout, and added browser regressions for both normal input edits and autofill-like value changes that bypass input events; bumped public assets to `20260726-p146`.
- Preserved the complete custom binding profile when switching between Windows/Linux and Mac keyboard labels, leaving the explicit Restore Layout action as the only platform-default reset path; added a browser regression that binds Jump to F, round-trips both platforms and verifies the custom preset and code remain intact, and bumped public assets to `20260726-p145`.
- Enabled edge-to-edge safe-area values and keyboard-driven content resizing in the viewport contract, bounded the mobile entry chooser and settings/account drawer against all four device insets, and added a real-browser regression with a 47px notch, 34px home indicator and a 390x420 keyboard-reduced viewport; bumped public assets to `20260726-p144`.
- Made local and cloud save replacement transactional across all seven storage keys so a quota or browser-storage failure rolls every partial write back to the exact pre-import values before reporting the error; added a real-browser regression that rejects the second write and verifies full rollback, and bumped public assets to `20260726-p143`.
- Made low-performance mode remove the whole-canvas filter, live backdrop blur on gameplay overlays and every nonzero canvas shadow blur while retaining solid readable surfaces and unchanged gameplay; added static and browser-enforced compositor-budget regressions and bumped public assets to `20260726-p142`.
- Raised the contrast of small entry, settings, account, keyboard-profile and training-detail text while preserving the pale adaptive sheet, strengthened success/error and placeholder colors, and added browser-enforced 4.5:1 contrast samples for the entry chooser and nine representative settings text roles; bumped public assets to `20260726-p141`.
- Isolated optional session-storage caching from Appwrite OTP results so privacy-restricted browsers cannot turn a successfully sent code or completed login into a false failure, removed unused cloud-sync metadata writes that could similarly mask a successful remote upload, and added a browser regression with all session-storage operations blocked; bumped public assets to `20260726-p140`.
- Made the game canvas buffer follow its actual responsive CSS size and physical pixel density instead of a fixed DPR-only multiplier, retained the explicit 1x low-performance path, cleared scale-dependent tile caches on resize, and added standard-density and Retina browser regressions; bumped public assets to `20260726-p139`.
- Added best-effort cloud-save flushing when the page moves to the background or unloads, made cloud uploads report success/failure to callers, prevented logout when the final upload fails, and replaced premature/stale “已同步” summaries with explicit syncing, conflict, read-error, corruption and sync-failure states; added browser coverage for pagehide flushing and guarded logout and bumped public assets to `20260726-p138`.
- Pulled the live Appwrite authentication and TablesDB resources into versioned configuration, enabled common-password dictionary and personal-data password protection, added precise client errors for password policy rejections, and added an Appwrite contract gate covering the regional endpoint, auth methods, password policies, row security, permissions and saves schema; bumped public assets to `20260726-p137`.
- Hardened Appwrite password recovery by removing `userId` and `secret` from the address bar immediately after capture, opening a focused single-purpose new-password drawer that hides unrelated login controls, restoring the regular login UI after success, and making Enter on the email field send an OTP; added mocked recovery and mobile visual regression coverage and bumped public assets to `20260726-p136`.
- Made key rebinding transactional so Escape or closing Settings restores the original preset and custom bindings instead of silently switching to Custom, locked conflicting choice controls during capture, corrected the restore-layout action's stale dark-theme styling, and added desktop/mobile/short-screen regression coverage; bumped public assets to `20260726-p135`.
- Added a bounded Appwrite session-restore check so stalled or offline refreshes return to the guest/email chooser instead of remaining in an indefinite loading state, unified busy-state locking across authentication tabs and fields, and added browser regression coverage; bumped public assets to `20260726-p134`.
- Added unique contextual accessible names to the compact audio, diagnostics, feedback-template and save actions so repeated visible labels such as “复制” remain unambiguous to assistive technology; bumped public assets to `20260726-p133`.
- Restored the guest-to-cloud entry as a full-width, readable 44px action on narrow screens, raised mobile authentication fields to touch-safe height, strengthened small settings typography, updated stale cloud-sync documentation, and bumped public assets to `20260726-p131`.
- Reduced the room selector to a concise room identifier/name plus urgent focus marker while keeping full medals, timing, goals and route detail in the adjacent room brief, replaced default black focus rectangles on auth/segmented/tertiary controls with the product's teal focus ring, and prevented outside-dismissal focus from remaining inside the hidden drawer; bumped public assets to `20260726-p132`.

## 2026-07-25

- Added an adaptive entry choice between guest play (device-only progress) and email login (cloud sync), with signed-in sessions skipping the choice automatically.
- Moved email authentication into a compact focused account drawer and added responsive widths/layouts for desktop, tablet, portrait mobile, and short landscape; bumped public assets to `20260725-p125`.
- Restored the settings header's clipped top corners, kept account summary metadata and disclosure control on one row, removed the redundant account intro block, and bumped public assets to `20260725-p126`.
- Refined the room coaching and bottom Pace bars to match the primary HUD, rebuilt keyboard editing into movement/action groups, added exact Celeste-inspired classic and community-inspired comfort bindings with Mac-safe labels, and bumped public assets to `20260725-p127`.
- Removed the redundant entry-switching sentence, tightened the chooser hierarchy, and bumped public assets to `20260725-p128`.
- Gated the entry chooser behind Appwrite session restoration so authenticated refreshes skip the guest/login screen, added a quiet pending indicator, and bumped public assets to `20260725-p129`.
- Made settings open with every section collapsed, aligned cloud-sync metadata with its disclosure control, added outside-pointer dismissal that preserves the clicked control's normal action, and bumped public assets to `20260725-p130`.
- Rebuilt settings and practice around an opaque mist-white surface with fixed font weights, clean contrast, custom segmented controls, and compact non-obstructive training feedback.
- Added Appwrite email OTP registration/login, password login and recovery, authenticated password changes, private per-user cloud saves, first-sync conflict protection, and debounced automatic progress sync.
- Provisioned the `summit-spark` Appwrite project, web platforms, auth methods, and row-secured `saves` table; bumped public assets to `20260725-p123`.
- Added Windows/Linux and Mac keyboard bases plus click-to-rebind controls for movement, jump, dash, grab, recall, retry, and room restart; conflicting bindings swap automatically and the current layout can be restored in one action.
- Raised the settings schema to v3 with legacy normalization, and lightened the settings surface from near-black to a clearer mist-blue grey.
- Reworked the full training surface around a clear deep blue-grey and frost-blue palette; removed muddy green casts, mustard dividers, and the remaining pale report cards.
- Unified chapter, plan, route, Feel, profile, and ledger components under one low-contrast hierarchy, and removed the redundant dense profile report from the visible panel.
- Redesigned settings as a compact cool-toned utility sheet and practice as a wider, warm-accented training sheet, using material, width, and action emphasis to make their roles immediately distinct.
- Replaced the nested pale-card look with flatter dark rows, quieter borders, clearer open-section markers, and a single stronger practice action; gameplay, storage schemas, and control behavior are unchanged.
- Preserved 44px mobile targets and responsive panel scrolling.

## 2026-07-21 - p118

- Removed the repeated pause/category subtitle, recommendation card, selected-room summary and decorative category dots from the right-side sheets.
- Reduced Practice to four task groups plus one primary launch action, moving destructive statistics reset into Advanced while retaining its two-step confirmation.
- Removed the first-run move/jump/dash strip and routine coach cards; warnings and save/storage confirmations remain available. Both panels were narrowed and darkened slightly; bumped public assets to `20260721-p118`.

## 2026-07-19 - p117

- Removed the dark shared capsule around the upper-right Practice and Settings actions; each tool now has its own quiet deep-mist surface, with sage and gold reserved for active state.
- Narrowed both panels, replaced the stark white sheet with a low-saturation mist palette, tightened the recommendation card and clarified disclosure color roles.
- Rebuilt the sticky launch area with a two-line room summary and calmer button hierarchy while preserving all settings, feedback, save and training behavior; bumped public assets to `20260719-p117`.

## 2026-07-18 - p116

- Rebuilt the mountain atmosphere around clear aerial perspective: pale distant ridges, structured midground facets and a grounded dark foreground.
- Replaced the repetitive eight-peak sawtooth silhouette with six wider peaks, shoulder breaks and restrained illuminated faces.
- Softened the moon and title shadows, refined rock values, cooled the page frame and consolidated the HUD into quieter deep-mist glass; bumped public assets to `20260718-p116`.

## 2026-07-17 - p115

- Added a non-collapsing 16px rhythm and a quiet separator between the display controls and the feedback/save section.
- Added browser geometry and source-contract guards so those sections cannot regress into a visually merged stack.
- Re-ran the complete interaction suite covering settings persistence, audio/display controls, diagnostics, feedback templates, save export/import/backup restore and responsive layouts; bumped public assets to `20260717-p115`.

## 2026-07-17 - p114

- Raised the in-game HUD Practice and Settings actions from 36×36px to 44×44px on narrow or coarse-pointer layouts.
- Kept the seven movement/action touch controls at 48px and preserved compact desktop HUD sizing and icon styling.
- Added browser and contract guards for the two remaining mobile HUD targets and bumped public assets to `20260717-p114`.

## 2026-07-17 - p113

- Raised the audio preview and feedback/save copy, download, import and restore buttons from 30px to at least 44px on narrow or coarse-pointer layouts.
- Preserved save validation, automatic pre-import backup, reversible restore behavior and compact desktop sizing.
- Added browser and contract coverage for the remaining settings actions and bumped public assets to `20260717-p113`.

## 2026-07-17 - p112

- Raised all visible start-screen actions from 40–42px to at least 44px on narrow or coarse-pointer layouts.
- Preserved the existing primary/secondary hierarchy, widths, desktop density and short-landscape fit.
- Added browser and contract guards for mobile start hit targets and bumped public assets to `20260717-p112`.

## 2026-07-17 - p111

- Raised the settings close button, disclosure rows, selects and range inputs to at least 44px on narrow or coarse-pointer layouts.
- Preserved the compact desktop mouse layout and the existing internal scrolling behavior on short landscape screens.
- Added browser and contract guards for mobile settings hit targets and bumped public assets to `20260717-p111`.

## 2026-07-17 - p110

- Fixed the top “Next step” card displaying the manually selected room while its click action still launched the global recommendation.
- Kept the top card consistently global and the room brief, variants, coaching dock and Start action consistently bound to the manual selection.
- Added source and browser regression guards for the two distinct entry points and bumped public assets to `20260717-p110`.

## 2026-07-17 - p109

- Stopped the practice-room selector from immediately closing the panel and teleporting into gameplay on every change.
- Room selection now updates the room brief, coaching summary, Drill variants and explicit launch action in place.
- Kept gameplay entry behind the existing Start/variant buttons, updated browser and contract coverage, and bumped public assets to `20260717-p109`.

## 2026-07-17 - p108

- Fixed updraft rendering ending nearly two tiles above the bottom of its actual physics field.
- Centralized updraft field bounds so collision and drawing now share the same full-height rectangle.
- Modestly raised the static fill and dashed-edge contrast without adding particles, glow, or animation, added a contract guard, and bumped public assets to `20260717-p108`.

## 2026-07-17 - p107

- Replaced the wide, thin airborne leg fork with a short tucked pose that stays visually attached beneath the coat at gameplay scale.
- Pulled the rear leg inward, limited the lead-leg opening, and brought both stroke weights closer to the grounded silhouette.
- Kept rounded integrated endpoints with no separate toe or boot geometry, updated the player contract, and bumped public assets to `20260717-p107`.

## 2026-07-17 - p106

- Converted the critical dash and climbing-stamina HUD meters from color-only decorative elements into localized live progressbars.
- Exposed remaining dash charges and stamina percentage without adding persistent explanatory copy or enlarging the compact HUD.
- Raised the in-meter visual labels from 7px to 8px, retained the existing short-landscape footprint, added contract guards, and bumped public assets to `20260717-p106`.

## 2026-07-17 - p105

- Renamed the visible `D/death` metric to the accurate Chinese `mistake` semantic because hazards, falls, quick retries and room restarts all contribute to it.
- Updated the summit summary, no-mistake challenge, challenge progress and long-term profile copy while preserving the existing counting rules.
- Kept internal save keys such as `bestDeathCount` unchanged for backward compatibility, updated browser/contract guards, and bumped public assets to `20260717-p105`.

## 2026-07-17 - p104

- Removed the redundant red death burst that was immediately covered by the white respawn burst during an intentional quick retry.
- Matched calm-mode current-room restarts to the normal respawn particle budget while preserving the full non-calm count.
- Kept status copy, audio, counters and restart behavior unchanged, added a contract guard, and bumped public assets to `20260717-p104`.

## 2026-07-17 - p103

- Reduced idle visual density for relay and prism clusters in R9–R10 when calm effects are enabled.
- Slowed idle rotation and hid secondary ready-state side ticks, arcs and chevrons while preserving the core mechanic silhouettes, cooldown rings and trigger pulses.
- Left collision, timing, colors and the explicit non-calm presentation unchanged, added a contract guard, and bumped public assets to `20260717-p103`.

## 2026-07-17 - p102

- Added a portrait-only player render scale so the character remains locatable when the complete 1200px room is reduced to a narrow phone playfield.
- Kept the scale anchored at the feet and left collision geometry, physics, desktop/landscape rendering and map framing unchanged.
- Avoided locator rings, arrows, labels or extra effects, added a contract guard, and bumped public assets to `20260717-p102`.

## 2026-07-17 - p101

- Moved the moon along a four-chapter right-to-left track instead of pinning it behind every room's right-edge exit.
- Added small per-room offsets and chapter-specific heights so the sky composition evolves across the climb while R1, R7 and R10 goals retain a clear focal area.
- Kept the change static and background-only with no added particles, glow budget or gameplay markers, and bumped public assets to `20260717-p101`.

## 2026-07-17 - p100

- Replaced the dangling airborne leg strokes with a compact articulated jump pose: the lead leg opens while the rear leg folds back.
- Gave ascent and descent distinct knee/toe geometry, softened the rear-leg hierarchy, and ended both feet as rounded continuations of the legs rather than dark boot shapes.
- Updated the player silhouette contract and bumped public assets to `20260717-p100`.

## 2026-07-17 - p99

- Removed the duplicate dash afterimage created at the start position on the first physics frame.
- Made afterimage cadence, opacity and lifetime respect calm and low-performance settings, reducing the default 135ms dash from roughly six overlapping silhouettes to about three while preserving direction readability.
- Added a contract guard for the quiet cadence and bumped public assets to `20260717-p99`.

## 2026-07-17 - p98

- Restored the airborne legs' minimum readability after frame-by-frame review showed the previous slim pass nearly disappearing at normal play size.
- Kept the asymmetrical front/rear curves and block-free rounded ends while modestly increasing lower contrast, stroke weight, rear-leg opacity and extension.
- Updated the player silhouette contract and bumped public assets to `20260717-p98`.

## 2026-07-16 - p97

- Restored 44px minimum hit targets for the practice launch and reset actions on short coarse-pointer landscape screens such as 568×320.
- Kept the compact 38px dock for mouse-driven short landscape windows so the change does not unnecessarily reduce panel content space.
- Added a live 568×320 touch-landscape guard for panel/dock bounds and both action heights, and bumped public assets to `20260716-p97`.

## 2026-07-16 - p96

- Fixed the room brief overlapping the stage HUD on short 320×480 portrait screens.
- Moved only the short-portrait brief into the upper safe field and tightened its three-line typography while preserving normal-phone spacing, stage scale and touch layout.
- Added a live 320×480 browser guard for brief/HUD separation and on-screen touch controls, and bumped public assets to `20260716-p96`.

## 2026-07-16 - p95

- Extended the compact room-entry card's fully readable hold while retaining one quiet fade and its existing footprint.
- Raised the mist-light surface, hairline border and secondary chapter/target text contrast without adding glow, motion or player-adjacent labels.
- Added a contract guard for the readable timing and palette, and bumped public build assets to `20260716-p95`.

## 2026-07-16 - p94

- Reconciled the manual playtest checklist with the current quiet first-run keyboard strip: toast/head-level coaching stays forbidden, while the compact Move → Jump → Dash strip is expected to advance and exit from real input.
- Added explicit manual/release checks for touch-label suppression, the 390px/64px control boundary and operating-system reduced-motion behavior.
- Added contract guards preventing the human verification standard from drifting away from the browser-tested product behavior.
- Bumped public build assets to `20260716-p94`.

## 2026-07-16 - p93

- Added operating-system `prefers-reduced-motion` support across CSS and Canvas rendering.
- Disabled nonessential ribbons, snowfall and velocity wakes; froze ambient moon/entity drift and rotation; reduced particle budgets while preserving gameplay movement, hazards and action confirmation.
- Added a live browser-smoke check that toggles the emulated system preference and verifies both UI and Canvas reduced-motion state.
- Bumped public build assets to `20260716-p93`.

## 2026-07-16 - p92

- Redrew spring entities with a distinct green cap, two compressible coils and a blue-gray base so intentional midair relay springs no longer resemble floating status bars.
- Preserved every spring position, collision box, launch force and dash/stamina restore behavior.
- Bumped public build assets to `20260716-p92`.

## 2026-07-16 - p91

- Changed portrait action controls to a two-column layout so the 64px comfort setting keeps Dash on-screen at 390px width.
- Kept Jump and Dash paired on the lower thumb row, placed Grab above, and responsively capped the requested size only when the viewport cannot safely fit it.
- Added a mobile browser-smoke guard that measures the 64px state for viewport bounds, cluster separation and action placement.
- Bumped public build assets to `20260716-p91`.

## 2026-07-16 - p90

- Replaced the manual playtest checklist's stale pinned build with a dynamic meta/CSS/JS version check backed by `check-public-surface.js`.
- Expanded the default `npm run check` gate to include documentation, public surface, data contracts and maintenance tool validation.
- Added guards preventing future playtest checklists from pinning a release version that will immediately drift.
- Bumped public build assets to `20260716-p90`.

## 2026-07-16 - p89

- Increased the static outline contrast of inactive echo anchors in R9–R10 so they remain readable against green and violet late-chapter backgrounds.
- Preserved the existing anchor silhouette, activation feedback and mechanics without adding rings, links or animation.
- Bumped public build assets to `20260716-p89`.

## 2026-07-16 - p88

- Raised the at-rest readability of R7–R8 updraft fields, dashed boundaries, short stream marks and compact direction arrows.
- Kept the existing effect count and avoided new particles, glow, flashing or long trails.
- Bumped public build assets to `20260716-p88`.

## 2026-07-16 - p87

- Extended the mobile portrait atmosphere beyond the fixed-ratio canvas with chapter-aware page tones for Gate, Old Peak, Wind Gorge and Summit.
- Added one static, low-contrast ridge behind the brief, playfield and touch zone; no animation or new gameplay marks were introduced.
- Reduced the portrait room brief's floating-card treatment while preserving stage size and touch safe areas.
- Bumped public build assets to `20260716-p87`.

## 2026-07-16 - p86

- Reworked airborne legs into two slimmer, asymmetrical strokes: the rear leg now tucks and recedes while the front leg opens with vertical speed.
- Removed the remaining equal-weight boot-blob impression without adding detached soles or extra airborne effects.
- Bumped public build assets to `20260716-p86`.

## 2026-07-16 - p85

### Changed
- Lifted normal rock faces from near-black navy to layered blue-gray values.
- Reduced exposed side and bottom edge darkness while keeping snow caps and landing boundaries crisp.
- Slightly increased rock crack visibility without adding per-frame work or changing cached-sprite behavior.
- Preserved crumble contrast, hazards, collision geometry, and all room layouts.
- Bumped public build assets to `20260716-p85`.

## 2026-07-16 - p84

### Changed
- Audited settings and practice panels at desktop, 390x844 portrait, and 844x390 landscape sizes.
- Collapsed the short-landscape practice dock from a two-line label plus summary to one ellipsized summary line.
- Reduced only the short-landscape launch action height while preserving fixed reachability, scroll separation, and touch targets elsewhere.
- Bumped public build assets to `20260716-p84`.

## 2026-07-16 - p83

### Changed
- Reduced persistent relay and prism blur from 8px to 2px in calm mode and tightened their idle rings.
- Shrunk relay/prism pulse expansion while keeping contact-triggered alpha response and cooldown rings.
- Removed calm-mode glow from inactive echo anchors and reduced active anchor blur, breathing amplitude, and outer radius.
- Bumped public build assets to `20260716-p83`.

## 2026-07-16 - p82

### Changed
- Replaced full-height glowing updraft strokes with three or four short local flow segments.
- Reduced each updraft to one compact moving chevron and a smaller top boundary marker.
- Lowered in-field snow spawning while preserving the complete physical field, pull, stamina recovery, and rise speed.
- Bumped public build assets to `20260716-p82`.

## 2026-07-16 - p81

### Changed
- Brightened R1 from a dense cold-blue opening to a clearer dawn-mist palette while preserving terrain contrast.
- Increased only the first chapter's landmark presence after representative R1/R4/R7/R10 visual comparison.
- Added two small static gate lanterns with no shadow blur, pulse, particles, or gameplay obstruction.
- Bumped public build assets to `20260716-p81`.

## 2026-07-16 - p80

### Changed
- Reduced both arm strokes and hand circles, and muted the hand color so the upper-body silhouette no longer reads as two bright floating balls.
- Removed the duplicate green wall-grip hand dot while preserving the actual grip hand and wall-state framing.
- Replaced the square backpack block with a narrower, lighter rounded side pack.
- Bumped public build assets to `20260716-p80`.

## 2026-07-16 - p79

### Changed
- Increased the player render scale from 1.015 to 1.09 around the existing foot anchor without changing collision dimensions.
- Removed respawn from both aura-ring render paths so restarting no longer stacks two oversized circles over the character.
- Matched grounded legs to the thinner mist-blue airborne silhouette instead of restoring two dark boot-like columns on landing.
- Preserved action-relevant dash, prism, recall, wall, landing, and death feedback.
- Bumped public build assets to `20260716-p79`.

## 2026-07-16 - p78

### Changed
- Removed the pale airborne and grounded sole strokes that became detached horizontal dashes at gameplay scale.
- Narrowed, lengthened, and slightly separated the airborne legs so both connect visibly to the coat hem and finish as rounded endpoints.
- Added a contract guard against reintroducing detached sole highlights.
- Bumped public build assets to `20260716-p78`.

## 2026-07-16 - p77

### Changed
- Localized all player-facing death and retry causes while preserving the existing internal save keys.
- Replaced exposed Focus/watch/saved/score wording in practice summaries, room selectors, popups, and the mastery ledger with concise Chinese labels.
- Added contract coverage for localized reason labels and English diagnostic-copy regressions.
- Bumped public build assets to `20260716-p77`.

## 2026-07-16 - p76

### Changed
- Removed the duplicate “no mistakes” claim from the Clean Drill canvas title.
- Replaced diagnostic `!1` / `run !1` notation with natural Chinese mistake counts across HUD, practice summaries, focus feedback, and room labels.
- Split practice-card target conditions from route advice so Clean and Pace no longer repeat the same requirement in two phrasings.
- Let the active Clean HUD show route advice plus the live mistake count, avoiding the contradictory “no mistakes … mistake 1” state.
- Standardized compact training detail separators to middle dots for calmer scanning.
- Bumped public build assets to `20260716-p76`.

## 2026-07-16 - p75

### Changed
- Reduced the persistent route compass to a thin low-alpha dashed line with a small open chevron and no glow.
- Replaced the remaining dark compass label with the shared mist surface and dark text.
- Removed pulsing opacity from the compass so navigation remains steady and secondary to the route.
- Bumped public build assets to `20260716-p75`.

## 2026-07-16 - p74

### Changed
- Unified route guidance, Drill objectives, active challenges, and mastery popups with a shared light-mist canvas card and dark text hierarchy.
- Removed repeated black panels, colored glow borders, and glowing copy from training feedback.
- Moved advanced move feedback (buffer, coyote, spark, wall grace) into a fixed edge card so text never follows the character's head.
- Retained functional color only in thin progress strips and compact state segments.
- Bumped public build assets to `20260716-p74`.

## 2026-07-16 - p73

### Changed
- Unified the desktop first-run keyboard strip and mobile touch buttons with the same restrained mist-blue input surface language.
- Replaced the bright white keyboard card and near-black touch blocks while preserving compact geometry and readable labels.
- Reduced touch feedback to a subtle gold pressed state and kept low-performance mode visually consistent.
- Added browser checks for the final computed keyboard and touch surfaces.
- Bumped public build assets to `20260716-p73`.

## 2026-07-16 - p72

### Changed
- Replaced near-black brand, telemetry, counter, and action surfaces with one mist-blue glass HUD language.
- Lightened the internal meter tracks and softened shadows while preserving high-contrast white telemetry.
- Increased the active-play brand opacity slightly so the mark remains legible without becoming a focal point.
- Added browser coverage for the final computed HUD surfaces.
- Bumped public build assets to `20260716-p72`.

## 2026-07-16 - p71

### Changed
- Coupled the portrait room brief to the fixed-aspect playfield with a viewport-height-aware offset, removing the large arbitrary gap on tall phones.
- Hide the first-run keyboard strip whenever touch controls are actually rendered, covering hybrid/narrow input environments where pointer media queries alone can disagree.
- Bumped public build assets to `20260716-p71`.

## 2026-07-16 - p70

### Changed
- Replaced the large dark room-entry banner with a compact warm-light chapter card that matches the brighter stage language.
- Tightened the intro from 1.15s to 0.95s and reduced its footprint while preserving room, chapter, and target-time context.
- Removed heavy text glow and high-contrast framing so the cue does not compete with the route.
- Bumped public build assets to `20260716-p70`.

## 2026-07-16 - p69

### Changed
- Removed the character-attached contact shadow while airborne so it cannot read as an extra dark foot.
- Unified idle and running legs with the same soft rounded silhouette used in the revised jump animation.
- Removed the two standalone dark grounded boot blocks and softened the remaining floor shadow.
- Bumped public build assets to `20260716-p69`.

## 2026-07-16 - p68

### Changed
- Redrew airborne legs as two separated rounded phase-aware strokes, removing the fused dark blob and detached-boot silhouette at gameplay scale.
- Kept the tiny sole edge low-contrast so feet remain readable over dark platforms without creating a black border.
- Suppressed the first-run keyboard strip at the logic layer on coarse-pointer devices as well as through CSS.
- Bumped public build assets to `20260716-p68`.

## 2026-07-16 - p67

### Changed
- Replaced the disabled first-run onboarding path with a quiet bottom keyboard strip for move, jump, and dash.
- Advance each cue only after the corresponding real input, then remove the strip after the first dash.
- Keep the hint off the character, out of modal panels, and entirely hidden on coarse-pointer/touch layouts whose buttons are already labelled.
- Added an empty-save browser behavior flow covering all three onboarding transitions.
- Bumped public build assets to `20260716-p67`.

## 2026-07-16 - p66

### Changed
- Made the portrait brief context-aware on the start overlay: saved players see “last training” with the same recommended room/mode as the resume button.
- New players see an explicit “climb start” R1 brief, while active play continues showing the live current room.
- Added mobile start-context coverage so the portrait brief cannot contradict the resume action again.
- Bumped public build assets to `20260716-p66`.

## 2026-07-16 - p65

### Fixed
- Bound the persistent practice-dock coaching summary to the selected room, matching its launch button and room selector.
- Kept the top priority card bound to the global recommendation so the two surfaces no longer contradict each other.
- Added a browser behavior guard that selects R2 and verifies both the dock copy and actual Drill launch remain on R2.
- Bumped public build assets to `20260716-p65`.

## 2026-07-16 - p64

### Performance
- Cached rock tiles by left/right/below adjacency, snow-cap exposure, crack variant, and canvas density.
- Removed per-frame gradient/path construction for the 46–66 ordinary rock tiles in every room.
- Made both rock and crumble sprites density-aware so normal 1.5x buffers retain sharp edges while low-performance mode uses 1x assets.
- Bumped public build assets to `20260716-p64`.

## 2026-07-16 - p63

### Performance
- Pre-rendered the static crumble-tile gradient, highlight, and base cracks once instead of rebuilding them for every tile on every frame.
- Kept triggered crumble jitter, countdown, danger wash, and expanding cracks fully dynamic.
- Targeted the late-room cost increase where R9/R10 contain 20/21 crumble blocks.
- Bumped public build assets to `20260716-p63`.

## 2026-07-16 - p62

### Changed
- Split settings/practice panels into a fixed header, independently scrolling body, and non-scrolling footer.
- Moved the selected-room Drill action into a persistent practice launch dock so it remains reachable at 720px and shorter viewport heights.
- Kept the selected-room coaching summary in the desktop dock and simplified mobile to a full-width 44px launch action plus reset.
- Bumped public build assets to `20260716-p62`.

## 2026-07-16 - p61

### Changed
- Rebalanced portrait play so the stage is centered against the fixed thumb-control zone instead of drifting too low.
- Added a quiet live chapter/room/goal brief to the otherwise unused upper portrait field without cropping the map.
- Hide the portrait brief while settings or practice is open to keep panel focus clean.
- Added portrait geometry and live-copy coverage to the browser smoke suite.
- Bumped public build assets to `20260716-p61`.

## 2026-07-16 - p60

### Changed
- Replaced the fixed pair of bulbous airborne leg shapes with one connected hip-to-toe silhouette.
- Added restrained rise/fall phase shaping so ascent tucks and descent extends toward landing without extra particles or speed lines.
- Removed detached dark shoe reads and used one low-contrast fabric seam to clarify the forward knee.
- Bumped public build assets to `20260716-p60`.

## 2026-07-16 - p59

- Found that the room card's primary action always launched the globally recommended room even when the room selector and all four variant buttons targeted a different room.
- Made the room-card coach summary and primary action follow `practiceTargetRoom()`, with an explicit `开始 Rn Mode` label.
- Kept the top priority card as the sole global recommendation entry, removing a duplicated and misleading route inside the selected-room context.
- Added a browser behavior test that selects R2, verifies the button label, clicks it, and confirms an R2 Drill starts.
- Bumped public build assets to `20260716-p59`.

## 2026-07-16 - p58

- Audited the expanded room-practice flow on desktop and portrait mobile.
- Replaced unexplained `Clean / Pace / Style / Expert` buttons with bilingual action labels that expose each mode's purpose at the decision point.
- Raised mobile Drill variant buttons from 30px to a 44px minimum while retaining the existing two-column portrait layout.
- Added mobile browser coverage for all four labels and touch target geometry.
- Bumped public build assets to `20260716-p58`.

## 2026-07-16 - p57

- Audited the expanded audio settings state and found the default controls group remained open, forcing a scrollbar and pushing display/feedback entries out of the first view.
- Made settings-only details behave as a single-open accordion; opening audio, display, or feedback now closes the other settings groups.
- Restored true collapsed-details behavior by explicitly removing closed group bodies from layout and keyboard focus; author grid styles had overridden the native hidden state.
- Kept practice-only groups unchanged so training information can still be cross-referenced.
- Added desktop browser coverage for group state and the absence of forced panel scrolling when audio is expanded.
- Bumped public build assets to `20260716-p57`.

## 2026-07-16 - p56

- Audited real 700×390 gameplay geometry and the coarse-pointer CSS path for landscape touch controls.
- Reduced landscape-only over-map button opacity from 50% to 30%, blur from 8px to 4px, and shadow weight so bottom terrain stays readable beneath controls.
- Kept portrait controls unchanged because they already live outside the playfield.
- Added mobile landscape browser coverage for control visibility, seven usable hit targets, background alpha, and restrained blur.
- Bumped public build assets to `20260716-p56`.

## 2026-07-16 - p55

- Audited the start screen on desktop and 390×844 portrait layouts and found the primary free-climb action occupied only the left half of its row while the right half remained empty.
- Made the primary start action span the full menu width, restoring clear hierarchy over resume/practice/settings without adding copy or decoration.
- Added desktop browser coverage for the two-column start menu geometry.
- Bumped public build assets to `20260716-p55`.

## 2026-07-16 - p54

- Audited R8-R10 as full desktop scenes and found the summit goal still shared the same enlarged gold-diamond language as lumen and prism objects.
- Replaced the final collectible-like diamond with a unique restrained summit beacon: open ring, mountain line, summit star, and short base marker.
- Reduced the goal's bob distance and ambient halo so it stays legible beside the R10 moon without adding spectacle.
- Replaced stale panel status after deaths and manual retries with quiet current room/restart announcements; no additional visual toast is introduced.
- Added browser coverage for one-key retry status and its single death-count increment.
- Added a contract guard preventing the summit from falling back to the generic diamond renderer.
- Bumped public build assets to `20260716-p54`.

## 2026-07-16 - p53

- Measured a roughly 190px visual gap between the playfield and fixed touch controls on a 390×844 portrait viewport.
- Added a capped, excess-height-only portrait stage shift so tall phones keep the character and thumb controls visually coupled without changing ordinary portrait or landscape layouts.
- Upgraded the mobile browser smoke to a 390×844 viewport and added a maximum 150px playfield-to-control gap guard.
- Bumped public build assets to `20260716-p53`.

## 2026-07-16 - p52

- Added quiet in-meter labels for dash and stamina so the two compact bars no longer rely on color or hover titles alone.
- Added restrained `✦` and `R` prefixes to lumen and room counters, improving first-glance HUD comprehension without expanding the top bar.
- Covered the HUD labels and counter prefixes in the public contract guard.
- Bumped public build assets to `20260716-p52`.

## 2026-07-16 - p51

- Replaced the two rotated capsule legs with a single visually connected, softly curved tucked pose that stays attached to the coat at gameplay scale.
- Removed the ordinary-jump square particle burst beneath the player; jump confirmation now relies on motion, sound, and restrained camera feedback instead of debris that could read as detached feet.
- Added contract coverage for the curved airborne silhouette and the absence of the regular-jump debris burst.
- Bumped public build assets to `20260716-p51`.

## 2026-07-16 - p50

- Replaced the thin articulated airborne legs and detached tiny boots, which still read as a broken fork at gameplay scale.
- Airborne lower-body motion now uses two compact rounded tucked silhouettes attached directly beneath the coat, with the darker boot area integrated into each shape.
- Kept explicit separate feet only for grounded running and landing poses.
- Bumped public build assets to `20260716-p50`.

## 2026-07-16 - p49

- Prevented ordinary vertical jumps from triggering long velocity wakes beneath the boots, which visually stretched the feet toward the platform.
- Velocity wakes now belong only to dash, Spark, spring, overdrive, or genuinely boosted horizontal motion.
- Bumped public build assets to `20260716-p49`.

## 2026-07-16 - p48

- Removed the duplicate pale airborne leg strokes that read as broken extra feet beneath the character.
- Rebuilt the actual airborne legs as a compact articulated front/back tuck with smaller boots aligned to each leg.
- Bumped public build assets to `20260716-p48`.

## 2026-07-16 - p47

- Removed the remaining gold jump chevron found during a real airborne-state visual check. Jumping now reads through character motion without any symbol above the head.
- Bumped public build assets to `20260716-p47`.

## 2026-07-16 - p46

- Removed both sources of the line above the airborne player: the apex input stroke and the detached physics-driven hair strand. Hair now remains entirely inside the head silhouette.
- Hid the persistent dotted dash-aim arrow during free climbing; it remains available only in explicit practice sessions where route visualization is expected.
- Bumped public build assets to `20260716-p46`.

## 2026-07-16 - p45

- Removed the sticker-like black outline from the face, coat, and backpack; legs and boots now use softer blue-grey structure and the ground shadow is smaller and lighter.
- Removed player-attached Flow, relay-chain, PB, and Feel text popups. Results remain available through the HUD, room feedback, and finish review without covering the character.
- Bumped public build assets to `20260716-p45`.

## 2026-07-16 - p44

- Replaced the seven-segment yellow broom-like hair chain with a short five-segment tuft that follows the character's actual hair state.
- Rebuilt the boxy robot-like body as a lighter climber silhouette with a shaped coat, backpack, smaller boots, articulated arms, softer face, and restrained outline.
- Replaced solid glowing dash slabs with shorter tapered line trails and restored stronger cool/warm separation across all ten room atmospheres.
- Hid the large canvas PACE ribbon during free climbing; it now appears only in explicit pace, Route, Feel, or pace-challenge sessions.
- Bumped public build assets to `20260716-p44`.

## 2026-07-15 - p43

- Raised the normal canvas buffer cap from 1.25x to a restrained 1.5x for sharper rendering on high-DPI displays.
- Kept low-performance mode at a true 1x buffer and rebuild the canvas immediately when the setting changes.
- Added browser coverage for 2x device-pixel-ratio rendering and live normal/low-performance density switching.
- Bumped public build assets to `20260715-p43`.

## 2026-07-15 - p42

- Switched the long finish review from centered overflow to top-aligned scrolling so mobile landscape can always reach the heading and run summary.
- Moved the recommended training actions above optional collapsed detail, keeping the next meaningful choice in the first review screen.
- Demoted an inactive route contract to extra detail; it remains a primary card only when the completed run produced an actual route-contract result.
- Bumped public build assets to `20260715-p42`.

## 2026-07-15 - p41

- Moved keyboard and screen-reader focus from the newly inert canvas to a labelled modal finish heading when the summit review opens.
- Localized the finish summary as 新纪录 / 死亡 / 光继连锁 while keeping Flow as the established metric.
- Reduced the summit burst from 64 high-speed particles to 30 lower-speed particles, preserving celebration without overwhelming the review.
- Bumped public build assets to `20260715-p41`.

## 2026-07-15 - p40

- Synchronized the visual overlay class with real `hidden`, `inert`, and `aria-hidden` state so startup controls disappear from the accessibility tree after gameplay begins.
- Kept a visible start/finish overlay accessible only while it owns interaction; opening settings from the start screen now preserves its backdrop while isolating its controls behind the modal.
- Bumped public build assets to `20260715-p40`.

## 2026-07-15 - p39

- Fixed an author-style conflict where `.hud { display: flex }` overrode the HTML hidden state, leaving unnamed background HUD nodes rendered under the start overlay.
- Added computed-style browser coverage requiring both HUD and touch controls to resolve to `display: none` while the overlay owns interaction.
- Bumped public build assets to `20260715-p39`.

## 2026-07-15 - p38

- Fully hid the HUD and touch controls while the start or finish overlay owns the page, eliminating even unnamed background nodes from the startup accessibility tree.
- Kept the rendered canvas as the quiet visual backdrop while removing it from focus order; active settings/practice modals still preserve a dimmed visual HUD but make it inert.
- Bumped public build assets to `20260715-p38`.

## 2026-07-15 - p37

- Made the canvas, HUD, and touch controls inert and hidden from assistive technology while the start/finish overlay or a modal panel owns interaction.
- Restored the gameplay surface only after free play or training actually begins, removing duplicate hidden 练习/设置 controls from the startup focus order.
- Bumped public build assets to `20260715-p37`.

## 2026-07-15 - p36

- Corrected manual practice-panel closure to announce 练习面板已关闭 instead of the unrelated 设置已关闭 status.
- Localized the successful destructive action as 专注训练统计已清空, matching its confirmation labels.
- Extended browser regression coverage to prove the run timer remains frozen while settings pause an active timed room.
- Bumped public build assets to `20260715-p36`.

## 2026-07-15 - p35

- Renamed the progress-state primary action from the misleading 路线 to 自由攀登 because it starts free play rather than a route contract.
- Clarified the separate recommendation as 继续训练 · Rn Mode and labeled the quiet status strip as 建议, while new profiles now see 开始攀登.
- Bumped public build assets to `20260715-p35`.

## 2026-07-15 - p34

- Replaced the large translucent checkpoint diamond behind the player with a small offset ground flag, keeping the character silhouette readable at every room spawn.
- Checkpoints now emit activation particles only when the respawn point actually changes instead of probabilistically spawning particles every frame while the player remains nearby.
- Bumped public build assets to `20260715-p34`.

## 2026-07-15 - p33

- Audited R7-R10 as rendered scenes: R7 retains a safe wind introduction and fallback surfaces before its wind/crumble combinations, so its pressure jump does not require a route rewrite.
- Replaced the dominant solid arrow above every updraft with a shorter low-contrast stroke marker, preserving direction clarity without overpowering platforms or the player.
- Gave echo anchors a distinct pin-and-fork silhouette so R9/R10 no longer rely on green versus cyan alone to distinguish anchors from relays.
- Bumped public build assets to `20260715-p33`.

## 2026-07-15 - p32

- Added a real keyboard focus loop to the settings/practice modal so Tab and Shift+Tab cannot move into the obscured game surface.
- Restored focus to the exact control that opened the panel, including the start overlay, instead of always sending focus to the game canvas.
- Guarded game-focus requests while the modal is open so audio tests, control changes, and destructive-stat actions keep keyboard context inside the panel.
- Bumped public build assets to `20260715-p32`.

## 2026-07-15 - p31

- Unified short route labels as 稳健/快速/高手 while keeping Clean/Pace/Style/Expert as distinct training mode names.
- Reworked destructive practice reset copy into explicit 清空统计/确认清空 states with a clearer confirmation status and tooltip.
- Rebuilt the room brief from eight equal-weight debug-like lines into a layered overview, objective block, and three compact route cards.
- Added contract guards against reintroducing direct one-dash resets that would discard an unused lumen reserve.
- Localized the no-script practice fallbacks and bumped public build assets to `20260715-p31`.

## 2026-07-15 - p30

- Centralized dash restoration so lumen reserve now survives landing, refills, relays, prisms, springs, echo recall, death retry, and manual room retry until the bonus dash is actually used.
- Fixed the previous reward-loss edge case where a collected lumen disappeared permanently but its unused reserve was cleared on death.
- Replaced the settings/practice dialog's generated subtitle with real dynamic text, `aria-labelledby`, mode-aware close labels, and modal semantics.
- Localized remaining player-facing room target and HUD delta labels plus several English-only training accessibility labels.
- Bumped public build assets to `20260715-p30`.

## 2026-07-15 - p29

- Rebuilt normal rock rendering around connected platform silhouettes: continuous snow caps, boundary-only side shading, quieter seams, and less repeated tile-box rhythm.
- Reduced overlapping updraft strokes in calm-effects mode from three streams to one and halved the guide-field emphasis.
- Gave lumens a distinct restrained bracket mark so optional route resources no longer read like small goals or refills.
- Added a one-time short lumen-reserve explanation plus a persistent HUD tooltip; no new screen shake or large pickup effects.
- Bumped public build assets to `20260715-p29`.

## 2026-07-15 - p28

- Lifted every room into a brighter dawn/twilight palette with clearer separation between sky, landmarks, mountains, platforms, hazards, and the player.
- Reworked the settings and practice surfaces into a warm light map-sheet treatment with cleaner open/closed hierarchy and less nested-card weight.
- Reduced playfield dimming while a panel is open so settings no longer make the game disappear behind a black veil.
- Turned the 12 optional lumens into route resources: each restores a dash, and collecting one while charged banks a restrained second dash until used.
- Added a quiet gold dash-meter state for the lumen reserve and reduced the pickup burst.
- Bumped public build assets to `20260715-p28`.

## 2026-07-15 - p27

- Made the game stage fit against both viewport width and dynamic viewport height while preserving the 960:544 scene ratio.
- Added safe-area-aware page padding and stable centering for resized, split-screen, and portrait windows.
- Added stage-size container rules so the HUD compacts when the game surface is narrow, even if the browser window itself is wide.
- Tightened short-landscape settings, tips, and touch controls without stretching or cropping the Canvas.
- Bumped public build assets to `20260715-p27`.

## 2026-07-15 - p26

- Reframed the ten-room slice as four visible chapter phases: 山门, 旧峰, 风峡, and 星顶. Room entry chips now identify the current phase without adding tutorial copy.
- Added restrained phase-specific background landmarks: mountain gates and cairns, broken bridge ruins, wind banners, and a summit observatory with a small constellation line.
- Strengthened early-room identity: R2 now teaches a two-relay movement sentence and R3 uses two springs to build a distinct vertical rhythm; guides, purposes, route lines, and Style goals were updated to match.
- Removed the premature echo anchor from R7 so wind and crumble own the pressure introduction, making R9 the deliberate first reveal of the echo mechanic.
- Moved the R10 summit goal from the floor to the upper skyline so the complete tool chain resolves spatially as an ascent.
- Practice paths, relay route lines, and best ghosts now render only during Drill, Route, or Feel sessions; free play keeps the chapter scenery and mechanics unobstructed.
- Added map guards for the R2 double relay, R3 double spring, R9 echo reveal, and upper-half R10 summit goal, then refreshed the generated room-data snapshot.
- Bumped public build assets to `20260715-p26`.

## 2026-07-15 - p25

- Completed a second autonomous polish pass across desktop, gamepad, touch, free play, late-room mechanics, training overlays, death, and retry behavior.
- Opposing directional inputs now resolve to neutral instead of silently preferring right or down, and losing window focus releases held keyboard, touch, gamepad, grab, jump-buffer, and dash-buffer state while pausing the simulation.
- Free play no longer opens with an automatic route compass; explicit Drill, Route, and Feel sessions still arm focused guidance with a shorter display window, while Drill start avoids stacking the contract bar, focus popup, route card, and compass at once.
- Shortened death recovery and reduced death, respawn, retry, relay, prism, goal, wind, trail, aura, and global particle intensity under the default restrained-effects setting.
- Rebalanced crumble, wind, relay, prism, and goal rendering so late-room mechanics remain readable without overpowering the player silhouette.
- Replaced ambiguous touch action symbols with direct Chinese labels and added a calmer portrait control surface.
- Bumped public build assets to `20260715-p25`.

## 2026-07-15 - p24

- Reworked the ten-room atmosphere into clearer twilight color families with stronger foreground/background separation, quieter sky motion, restrained moonlight, and more readable rock, snow, and spike silhouettes.
- Increased the player silhouette slightly and strengthened its dark outline so dash availability, facing, airborne posture, and wall contact remain legible against every room palette.
- Reduced stacked spectacle during jump, wall jump, dash, Spark, trails, ghosts, auras, and particles; feedback now prioritizes direction and timing over glow volume.
- Improved control forgiveness with slightly longer jump, ledge, and wall grace windows, more responsive air steering, and a softer variable-jump release without changing maps or core abilities.
- Bumped public build assets to `20260715-p24`.

## 2026-06-08 - p23

- Bumped public build assets to `20260608-p23`.
- Split the HUD and start overlay into separate Settings and Practice entries: Settings stays focused on controls, audio, display, feedback, and save management; Practice owns Room, Route contracts, Feel Lab, profile, training, and advanced practice tools.
- Added a local backup restore button for `summit-spark-save-backup` so a valid import can be reversed from the UI instead of only being recoverable through devtools.
- Hardened mobile browser smoke tap coordinates against `visualViewport` offsets so narrow controls like the close button are tested at the same effective coordinates a phone uses.
- Restored the practice priority card in Practice mode while keeping it hidden from quiet Settings, and guarded the split with contract/smoke/browser checks.
- Cleaned the first-version public package by removing internal long-form planning documents from the tracked surface while keeping README, changelog, known issues, release checklist, playtest checklist, and automated gates.

## 2026-06-06 - p22

- Bumped public build assets to `20260606-p22`.
- Save import now writes a local `summit-spark-save-backup` before replacing settings, profile, room times, paths, and Focus data.
- Added clearer player state framing for dash direction, wall contact, airborne posture, and running foot motion without changing physics.
- Moved portrait touch controls below the playfield and added browser smoke coverage so mobile thumbs do not cover the 16:9 stage.
- Clamped mobile Room settings, route notes, and coach rows so narrow portrait settings do not crop text or controls.
- Opted the Pages workflow into Node 24 for both project runtime and GitHub JavaScript action compatibility.

## 2026-06-06 - p21

- Bumped public build assets to `20260606-p21`.
- Added stage play-mode classes so free play can use a quieter HUD while Drill, Route, Feel, and challenge runs keep advanced training meters.
- Reworked settings into a calmer one-column system list with lighter system typography, clearer rows, and toggle-style switches.
- Simplified the start overlay presentation so the first screen feels like a game entry point instead of a boxed instruction panel.
- Added smoke/contract/browser guards for the quiet HUD and one-column settings surface.

## 2026-06-05 - p20

- Bumped public build assets to `20260605-p20`.
- Split mobile touch controls into direction and action clusters with safer hit targets.
- Added non-sensitive gamepad axis magnitude and near-deadzone status for real controller tuning.
- Reduced default audio gains so movement and death feedback are less fatiguing.
- Improved late-room wind, crumble, and prism readability without adding default tutorial copy.
- Simplified the finish review surface: primary cards stay visible, extra review detail and the mastery roadmap are collapsible.

## 2026-06-05 - p19

- Bumped public build assets to `20260605-p19`.
- Quieted normal gameplay by removing visible fall/death correction cards, route arrows, death marks, death replays, and first-input timing prompts.
- Reworked settings into a controls-first system panel: Controls is the only default-open group, with Audio and Display split into separate groups.
- Updated smoke, contract, route, and Feel checks so quality gates preserve the quiet play mode instead of requiring old coaching overlays.
- Refined settings typography, spacing, and button weights toward a cleaner single-column options surface.

## 2026-06-05 - p18

- Bumped public build assets to `20260605-p18`.
- Removed explanatory start-screen copy and the visible control guide.
- Defaulted all settings groups to collapsed so the panel opens as a cleaner system-style index.
- Suppressed automatic beginner/death coaching toasts; necessary storage, diagnostics, and error feedback remains.
- Lightened UI typography and canvas HUD text from heavy 800/900 weights toward a calmer system-font hierarchy.
- Replaced the large room-intro teaching card with a compact room/target chip that does not render behind the start screen.

## 2026-06-05 - p17

- Bumped public build assets to `20260605-p17`.
- Reduced start-screen copy and first-room onboarding prompts.
- Reworked settings into grouped disclosure sections so only Training and Room are open by default.
- Toned down the blue/glow-heavy visual treatment toward a calmer graphite and warm-neutral hierarchy.
- Browser smoke now opens collapsed groups before testing controls, feedback, save import/export, Route, and Feel paths.

## 2026-06-05 - p16

- Bumped public build assets to `20260605-p16`.
- Added live save-import preview status for pasted `summit-spark-save` JSON.
- Save import preview summarizes source build, summit clears, room PB count, Flow, and touch size before import.
- Invalid JSON and wrong archive kinds now fail in place without refreshing the page.
- Browser smoke now verifies invalid import guards, wrong-kind errors, useful valid previews, and normalized import.

## 2026-06-05 - p15

- Bumped public build assets to `20260605-p15`.
- Added a feedback-template copy button that turns the current diagnostics context into a paste-ready report outline.
- Added local save archive copy/download/import for `summit-spark-save` JSON with schema normalization on import.
- Added non-sensitive gamepad status and gamepad diagnostics summary without collecting controller IDs.
- Browser smoke now verifies save export/import, feedback templates, mobile visual overflow guards, and gamepad diagnostics.

## 2026-06-05 - p14

- Bumped public build assets to `20260605-p14`.
- Added feedback type and a short feedback note field to the review section.
- Diagnostics snapshots now include the current feedback type and sanitized note.
- Fixed settings hotkey isolation so typing `O` in the feedback note stays inside the textarea instead of toggling the settings panel.
- Browser smoke now verifies feedback note hotkey isolation and diagnostics note capture.

## 2026-06-05 - p13

- Bumped public build assets to `20260605-p13`.
- Added a settings-panel diagnostics copy button for local playtest feedback.
- Diagnostics snapshots include build, settings, viewport, storage presence, current run state, Route/Feel/Challenge summary, and progress counts.
- Diagnostics intentionally exclude user identity, user agent, raw input history, replay paths, and secrets.
- Browser smoke now clicks the diagnostics button and verifies the generated snapshot shape.
- HTTP smoke and contract checks now require diagnostics UI and helpers.

## 2026-06-05 - p12

- Bumped public build assets to `20260605-p12`.
- Extended browser smoke to verify keyboard-only settings access through `O` and `Escape`.
- Extended browser smoke to verify Route contract interruption, visible "继续上次" recovery, and resumed contract launch.
- Extended browser smoke to verify Feel Lab interruption remains visible after switching to another Drill.
- Added `PLAYTEST_CHECKLIST.md` for first-three-minutes, ten-room, Route/Feel, mobile, and comfort manual passes.
- Added `KNOWN_ISSUES.md` for real human/device verification limits and low-value next steps to avoid.
- Contract check now requires the manual playtest and known-issues docs to stay linked from release surfaces.

## 2026-06-04 - p11

- Added direct "继续 Rn Drill" resume action on the start overlay.
- Added settings schema versions and migrated room Focus storage to a versioned envelope while keeping old arrays readable.
- Added low-performance mode that reduces visual particle/background budget without changing gameplay rules.
- Added touch button size setting.
- Added `npm run state-check` for Drill/Route/Challenge/Feel transition semantics.
- Extended browser smoke to cover direct resume, schema migration, mobile landscape settings, and finish review scroll safety.

## 2026-06-04 - p10

- Added route audit gate: `npm run route-audit` checks ten-room route readability, route contracts, Feel Lab fixtures, transition guards, and key visual helpers.
- Extended browser smoke to verify canvas pixels, keyboard movement, corrupted-storage toast, mobile settings fit, and gamepad deadzone mock.
- Added gamepad deadzone setting in the training cockpit.
- Made interrupted Route contracts show an explicit "继续上次" badge.
- Added one-shot storage repair toast while preserving non-blocking play.
- Moved training cleanup into a small `TRAINING_TRANSITIONS` table.
- Prioritized finish review cards for mobile readability.
- Added directional arrows to failure ghost lines.
- Strengthened Wall Spark and Prism Spark visual pulses.

## 2026-06-04 - p9

- Added headless browser smoke for start/settings/Feel Lab/route/mobile/storage paths.
- Hardened Route contract generation guards and Flow challenge state.
- Normalized corrupted storage inputs and improved mobile viewport handling.

## 2026-06-03 - p5-p8

- Added Feel Lab, route contracts, audio test, HTTP smoke, storage recovery, and mobile-safe settings cards.
- Added action audio, Spark variants, failure rehearsal ghost lines, chapter resonance, and landing/platform quality checks.
