# Wasel Egypt Demo Scenario

## Executive Summary

This document defines a concrete, compelling demonstration scenario for the Wasel Egypt platform that showcases its value proposition for solving real Egyptian transit problems. The scenario follows a complete user journey from problem identification through journey planning, execution, deviation handling, and recovery - demonstrating the platform's ability to improve daily transit life in Egypt.

**Demo Theme**: "Navigating Cairo's Transit Challenges with Confidence"

**Target Audience**: Graduation judges, potential users, stakeholders

**Duration**: 5-7 minutes live demo or 2-3 minute recorded walkthrough

**Key Value Demonstrated**: Wasel reduces transit stress by providing accurate, real-aware journey planning and adaptive support when things don't go as planned.

---

## 1. Problem Context: Why Transit in Egypt is Challenging

### Real Pain Points to Highlight (15-30 seconds)

Before launching the app, set the stage with concrete examples every Egyptian transit user recognizes:

1.  **Last-Mile Uncertainty**: "You need to get from Dokki to Nasr City for a job interview. Metro gets you close, but which exit? How far to walk through Dokki streets to reach the microbus stop? Is there a safe crossing?"

2.  **Transfer Anxiety**: "You're on the metro heading to 6th of October City. You need to transfer to a minibus at El-Maqsad, but you've heard they changed the stop location last week. Will you miss it?"

3.  **Disruption Frustration**: "You planned your morning commute based on yesterday's schedule, but Line 2 has a signal problem today. Do you wait, try an alternative, or call a costly ride-hail?"

4.  **Information Gaps**: "The next microbus to your destination should arrive in 5 minutes according to the schedule you saw online, but you've been waiting 15 minutes. Is it coming, or did the route change?"

5.  **Safety & Accessibility Concerns**: "Traveling with luggage or as an elderly parent, you need to know which stations have elevators, which routes are least crowded, and where to find safe crossings."

**Transition**: "Wasel Egypt solves these problems by combining real Egypt transit data with intelligent journey planning that understands the realities of moving through our cities."

---

## 2. Demo Scenario: Layla's Job Interview Journey

### Character: Layla, 24, Recent Graduate

- Lives in Maadi, needs to get to interview in Nasr City
- Has one suitcase, prefers minimal walking
- Values time reliability (can't be late for interview)
- Uses smartphone regularly, comfortable with apps
- Represents target user: educated, transit-reliant Egyptian seeking efficiency

### Timeline: Thursday Morning, 8:30 AM (Typical Commute Rush)

#### Phase 1: Problem Recognition & App Launch (0:00-0:30)

**Scene**: Layla in her Maadi apartment, checking calendar, sees interview at 10:00 AM in Nasr City.

**Action**: Opens Wasel Egypt app (show home screen/logo)

**Narration**: "Layla knows the metro gets her partway, but she's unsure about the first and last miles. Instead of guessing or calling multiple friends for advice, she opens Wasel Egypt to plan her journey with confidence."

**UI Showcase**: Clean landing page with value proposition, prominent "Plan Your Journey" CTA button.

#### Phase 2: Journey Search with Realistic Constraints (0:30-1:30)

**Action**: Taps "Plan your journey", sets origin: "Maadi, near Carrefour" (specific landmark), destination: "Nasr City, Al-Ahram Building" (specific), departure: "now" (8:30 AM).

**Constraints Applied** (show UI as she sets them):
- Max walk: 800 meters (prefers minimal walking with suitcase)
- Max transfers: 2 (values simplicity)
- Avoid: Microbuses (perceived as less reliable with luggage)
- Alternatives: 3 (wants options but not overwhelmed)

**Search Execution**: Show search button, brief loading state (skeleton/shimmer - not blank), results appear.

**Narration**: "Layla sets her preferences: reasonable walking distance with her suitcase, limited transfers for simplicity, and avoids microbuses she finds unpredictable. Wasel searches real Cairo transit data from multiple operators to find her best options."

**UI Showcase**: Journey search form with actual Cairo landmarks (Carrefour Maadi, Al-Ahram Nasr City), constraint chips updating, search button, loading state, results appearing.

#### Phase 3: Results Evaluation - Comparing Real Options (1:30-2:30)

**Results Display**: Show 3 journey options in card/list format with:
- Primary: Total time (clear winner on time?)
- Secondary: Transfers badge, mode strip (metro + bus icons)
- Tertiary: Walk distance, fare, score (subtle)
- **NEW**: Visual distinction (maybe time-based coloring or clear "Recommended" tag if disruption-free)

**Option Examples** (realistic for Cairo):
1.  **Option A (Fastest)**: Metro Line 1 (Sadat) → Microbus 777 (Salah Salem to Nasr City) - 45 min, 1 transfer, 600m walk, 8 EGP
    - *Note: Shows transfer at Sadat (known to be busy)*
2.  **Option B (Recommended)**: Metro Line 1 (Sadat) → Bus 77 (from Tahrir to Nasr City via Orman) - 50 min, 1 transfer, 350m walk, 5 EGP  
    - *Note: Avoids microbus, slightly less walk, reputable bus route*
3.  **Option C (Most Reliable)**: Walk to Maadi Metro → Metro Line 1 → Metro Line 2 (Shubra) → Walk from Kolleyet El-Zeraa to Nasr City - 55 min, 2 transfers, 1200m walk, 7 EGP
    - *Note: All metro, but much more walking and transfers*

**Narration**: "Wasel presents three real options based on current Cairo transit schedules. Option A is fastest but requires a microbus Layla wants to avoid with her suitcase. Option B offers the best balance - reasonable time, minimal walk with her luggage, uses the reliable Bus 77 route. Option C avoids surface transit entirely but doubles her walking distance."

**UI Showcase**: Journey results page showing the three options, highlight Option B as selected/recommended, show mode strip (metro + bus icons), walk distance clearly visible, transfer count, fare. If implemented: subtle disruption check (none active today).

**Key Demo Point**: Show the map tab - clicking it reveals real MapLibre map with:
- Base map showing Maadi to Nasr City corridor
- Option B route visualized: Metro Line 1 (red line) from Maadi to Sadat, then Bus 77 route (blue line) from Tahrir Square area toward Nasr City
- Accurate stop markers at origin/destination and transfer points
- Layla's current location (Maadi) pulsing dot
- **NO** placeholder SVG - real streets, parks (Orman Garden visible near Bus 77 route), water (Nile if in view)

**Narration**: "Instead of a fake map, Layla sees the actual route on real Cairo streets. She can see the Bus 77 will take her through Orman Garden, a pleasant walk from the stop to her interview building. The map shows exactly where to transfer and what to expect."

#### Phase 4: Journey Start & Active Tracking (2:30-3:30)

**Action**: Layla taps "Save & Start Journey" on Option B. Shows confirmation toast, transitions to Active Journey screen.

**Active Journey UI Showcase**:
- Map view: Shows full route, Layla's dot starting at Maadi Metro
- Progress bar: 0% complete
- Current leg: "Walk to Maadi Metro Station" (with distance countdown)
- Next stop pill: "Maadi Metro · 4 min walk"
- Controls: Recenter, layers (optional), location accuracy indicator

**Narration**: "Layla starts her journey. Wasel switches to active tracking mode, showing her real-time progress on the actual map. Instead of guessing when to leave for the station, she sees a live countdown to her walk duration. The next stop clearly identifies Maadi Metro station."

**Simulate Progress** (fast-forward or skip):
- Show Layla walking: dot moving along Maadi streets toward metro
- Update: Walk leg complete, transfer wait begins at station
- Show: Transfer leg timer counting down, next stop shows "Sadat Station · Metro Line 1"
- Optional: Show brief delay at transfer (simulate platform crowding)

**Narration**: "As Layla walks, Wasel updates her position in real-time. When she arrives at Maadi Metro, it automatically detects the station arrival and switches to counting her wait for the metro. The interface clearly shows what's happening now and what's next - reducing uncertainty and stress."

#### Phase 5: Realistic Deviation Scenario (3:30-5:00)

**The Problem**: Simulate a common Cairo transit issue - sudden metro disruption.

**Trigger**: At Sadat Station, during transfer wait, show deviation banner appearing:
- **Banner**: Red/orange color, icon: "⚠️ Service Disruption"
- **Title**: "Metro Line 1 Delayed"
- **Description**: "Signal problem between Sadat and Nasser. Expect 10-15 minute delays."
- **Severity**: Medium (banner not full-screen takeover)
- **Actions**: [Resume Journey] [View Recovery Options]

**Narration**: "Just as Layla arrives at Sadat, Wasel detects an active service alert - a signal problem on Metro Line 1 causing delays. Instead of leaving her waiting helplessly at the platform, Wasel immediately informs her of the issue and offers recovery options."

**Recovery Options Screen Showcase**:
- Title: "Find an alternative route"
- Subtitle: "Your current journey is affected by a Metro Line 1 signal problem. Here are options to reach your interview on time."
- List of 2-3 options (show as cards, similar to journey results but focused on alternatives from current point):
  1.  **Option 1 (Wait it out)**: Stay on planned route, wait for metro delay - Estimated additional delay: 12 min, New arrival: 10:02 AM (LATE)
  2.  **Option 2 (Bus Transfer)**: Walk to nearby Bus stop (300m), take Bus 94 from Tahrir to Nasr City via October 6 Bridge - Estimated time: 8 min walk + 20 min bus, New arrival: 9:55 AM (ON TIME), 1 transfer
  3.  **Option 3 (Longer Walk)**: Walk from Sadat to Nasser Station (1.2km through downtown), take Metro Line 2 there - Estimated time: 15 min walk + 8 min metro, New arrival: 9:58 AM (ON TIME), 0 transfers but more walk

**Narration**: "Wasel doesn't just tell her there's a problem - it gives her real alternatives to still make her interview on time. Option 2 involves a short walk to catch a reliable bus that bypasses the delayed metro section. Option 3 is more walking but avoids surface transit entirely. Both get her there on time despite the disruption."

**Selection & Continuation**:
- Layla selects Option 2 (Bus Transfer) - taps "Use This Route"
- Show confirmation: "Recovery accepted! New route active."
- Transition back to Active Journey, now showing:
  - Updated route: Walk to Bus stop → Bus 94 → Walk to destination
  - Reset progress: 0% on new leg
  - Next stop: "Bus 94 Stop · 5 min walk"
  - Possible subtle visual indicator: rerouted accent color on map

**Narration**: "Layla chooses the bus alternative. Wasel instantly updates her active journey to the new route. She now follows walking directions to the Bus 94 stop, confident she'll still reach her interview on time despite the metro delay."

#### Phase 6: Successful Arrival & Completion (5:00-6:00)

**Simulate Progress**:
- Show Layla walking to bus stop, arriving, boarding Bus 94
- Bus leg progress: show movement along route toward Nasr City
- Arrival at destination area, begin egress walk
- Next stop: "Al-Ahram Building · 3 min walk"

**Completion**:
- Layla arrives at Al-Ahram Building, taps "Complete Journey"
- Show journey summary card:
  - Total time: 52 minutes (original estimate 50, very close)
  - Actual transfers: 2 (walk+bike? No: walk to metro, metro to Sadat, walk to bus, bus to destination, walk to dest = 4 legs but 2 transit transfers)
  - Total walk: 950 meters (including detour for bus)
  - Fare: 7 EGP (metro + bus)
  - Status: Completed Successfully
  - Optional: Trust points earned, community contribution prompt

**Narration**: "Despite the unexpected metro delay, Layla arrives at her interview building just a few minutes after her original estimate - on time and prepared. Wasel guided her through the disruption with a practical alternative that kept her schedule intact. The journey summary shows the actual time, distance, and cost - honest data she can trust."

#### Phase 7: Post-Journey Value (Optional: 6:00-6:30)

**Quick Flash**:
- Show notification bell with 1 new item: "Your journey from Maadi to Nasr City has been completed! Rate your experience?"
- Or show profile tab: "Trust Score: 85/100 (+5 from today's journey)"
- Or show reports tab: "Help improve transit - report issues you saw today"

**Narration**: "After her journey, Wasel invites Layla to contribute to improving transit for everyone - completing the cycle of community-powered reliability that makes the system stronger over time."

---

## 3. Technical Requirements for Demo Execution

### Must-Work Components

1.  **Real Map Functionality** (Non-negotiable)
    - MapLibre loads OSM vector tiles successfully
    - Base map shows recognizable Cairo features (streets, parks, water, districts)
    - Route polylines follow actual roads/transit lines (not straight lines)
    - Stop markers accurately placed at transit locations
    - User location dot moves smoothly along route
    - Map responds to pan/zoom/rotate
    - Mobile-friendly touch interaction

2.  **Accurate Journey Planning with Realistic Data**
    - Origin/destination: Carrefour Maadi to Al-Ahram Building Nasr City are real landmarks
    - Transit options include real Cairo routes:
      - Metro Line 1 (Red Line): El-Marg to New Helwan (real)
      - Bus 77: Real route serving Tahrir to Nasr City area (verify actual route)
      - Bus 94: Real route (if used in recovery)
    - Walking distances reflect actual pedestrian pathways (if road-aware implemented) or at least plausible estimates
    - Transfer times realistic (3-5 min for metro-metro, 5-8 min for metro-bus with station navigation)
    - Fares match actual Cairo tariffs (metro: ~2-3 EGP, bus: ~2-5 EGP)

3.  **Deviation Detection & Recovery**
    - System must show active service alert for Metro Line 1 between Sadat-Nasser
    - Recovery options must be geographically and temporally plausible
    - Selected recovery option must update active journey correctly
    - UI must clearly distinguish original vs recovery route

4.  **Professional Polish Throughout**
    - No emoji as primary icons where custom defined (use M/B/R for metro/bus/rail)
    - Consistent typography, spacing, colors per design system
    - Polished loading/shimmer states (never blank screens)
    - Empty/error/success states follow UI spec
    - Micro-interactions present (button press, sheet slide, etc.)
    - Responsive layout works on 390 width (mobile primary)

5.  **Data Integrity - NO FAKE STATISTICS**
    - If showing service alerts: must reflect real/backend data
    - If showing journey counts: must be real
    - If showing community stats: must be real
    - Better to show "0 reports today" than fake "12 reports"
    - Trust in data is paramount; honesty builds credibility

### Demo Data Requirements

#### Geographic Scope
- **Origin**: Carrefour Maadi (30.0331° N, 31.2198° E) - real landmark
- **Destination**: Al-Ahram Building, Nasr City (30.0686° N, 31.5536° E) - real landmark
- **Key Transit Nodes**: 
  - Sadat Station (Metro Lines 1 & 2 interchange) - 30.0479° N, 31.2356° E
  - Tahrir Square area (Bus 77/94 access) - 30.0444° N, 31.2357° E
  - Al-Ahram Building location verified

#### Transit Data Coverage Needed
For this demo to work with real data:
1.  **Metro Line 1**: Full route GTFS or at least Maadi <-> Sadat <-> Nasser segments
2.  **Bus 77**: Route serving Tahrir Square to Nasr City area (October 6, Salah Salem etc.)
3.  **Bus 94**: Alternative route (if used in recovery)
4.  **Walking Network**: OSM footways for origin to Maadi Metro, Sadat to Bus stop, Nasr City bus stop to Al-Ahram Building
5.  **Service Alerts**: Ability to inject/show active alert on Metro Line 1 Sadat-Nasser segment (can be test data if real GTFS-RT unavailable)

#### Acceptable Alternatives if Real GTFS Unavailable
1.  **Realistic Synthetic GTFS**: Data patterned on actual Cairo transit:
    - Headways: Metro 3-5 min peak, buses 8-15 min
    - Speeds: Metro 30-40 km/h, bus 15-25 km/h in traffic
    - Stop spacing: Metro ~1-1.5km, buses ~400-800m in urban
    - Routes: Geographically accurate paths (use OSM to trace actual routes)
    - **Critical**: Must still use REAL OSM for base map and walking geometry
    - **Must Document**: Provenance that data is realistic synthetic, not claiming as real GTFS
2.  **OSM Public Transport Relations**: If OSM has complete route relations for Cairo, can derive schedules/headways from typical values

### Risks & Mitigations for Demo

| Risk | Probability | Impact | Mitigation |
| ---- | ----------- | ------ | ---------- |
| MapLibre fails to load/tiles missing | Low | High (no map = immediate prototype feel) | Test map load early; have cached tiles fallback; verify tile service URL and quota |
| Journey planning returns no options | Low | High (core flow broken) | Test search with origin/dest early; if no real GTFS, use realistic synthetic patterned on Cairo; verify OSM stop snapping finds nearby transit |
| Recovery options not plausible | Medium | Medium | Pre-calculate recovery options for known disruption scenario; ensure geographic/logical sense |
| UI feels unfinished/unpolished | Medium | High | Polish pass focused on demo screens: search, results, active journey, deviation, recovery, completion. Use design spec as checklist. |
| Mobile performance poor | Low | Medium | Test on mid-range Android simulation; optimize MapLibre render settings; reduce marker density if needed |
| Accidentally shows fake stats as real | Medium | High | Audit all numbers shown: are they from backend state or hardcoded? Replace hardcoded with real/zero; document any demo-specific test data clearly |

### Success Criteria for Professional Demo

**Immediate Viewer Reaction (within 10 seconds)**:
- "Oh, that's a real map!" (not SVG placeholder)
- "This looks like a professional app" (not student project)

**Journey Flow Comprehension (by 2:00)**:
- User understands Layla is planning a real trip in Cairo with real constraints
- App is helping her make an informed decision

**Value Realization (by 4:00)**:
- "It helped her avoid being late when the metro had a problem" 
- "She got real alternatives instead of being stuck"

**Credibility Established (by 6:00)**:
- "The times and distances seem realistic for Cairo"
- "I believe this could actually work in Egypt"

**Recommendation to Proceed**: **YES** - If the critical path (real map, polished UI, realistic data flow) is executed, Wasel Egypt will demonstrate clear value solving actual Egyptian transit problems in a professional, credible manner worthy of a graduation demo.

---

## Appendix: Demo Script (Concise Version for Presenter)

**[0:00] Problem Setup**
"Transit in Cairo presents real challenges: uncertain last-mile walks, stressful transfers, unexpected delays. Wasel Egypt combines real transit data with intelligent journey planning to help users navigate with confidence."

**[0:30] Introduce Layla**
"Meet Layla - she lives in Maadi, has a job interview in Nasr City at 10 AM, and needs to get there efficiently with her suitcase."

**[0:45] Launch App & Search**
"She opens Wasel, sets her journey from Carrefour Maadi to Al-Ahram Building, prefers minimal walking, avoids microbuses with her luggage, and searches."

**[1:15] Show Results**
"Wasel finds three real options. She chooses Option B: Metro Line 1 to Sadat, then Bus 77 to Nasr City - good balance of time, walk, and reliability."

**[1:45] Map Visualization**
"Instead of a fake map, she sees the actual route on real Cairo streets - metro line here, bus route through Orman Garden, clear stop markers."

**[2:15] Start Journey**
"She starts her journey. Wasel switches to live tracking - showing her walk to the station, wait for the metro, and progress in real-time."

**[2:45] Deviation Detected**
"At Sadat Station, Wasel detects a Metro Line 1 signal problem causing delays. Instead of leaving her stranded, it immediately shows recovery options."

**[3:15] Recovery Options**
"It gives her real alternatives: wait and be late, or take a short walk to catch Bus 94 that bypasses the delay and gets her there on time."

**[3:45] Selected Recovery**
"She chooses the bus alternative. Wasel instantly updates her active journey to the new route - now she follows walking directions to the Bus 94 stop."

**[4:15] Successful Arrival**
"Despite the delay, Layla arrives at her interview building on time - guided by Wasel through the disruption with accurate, real-aware planning."

**[4:45] Closing**
"Wasel Egypt doesn't just plan journeys - it adapts to reality, reduces transit stress, and helps Egyptians get where they need to be, on time and with confidence. Thank you."
---

## VERIFIED LIVE DEMO SCRIPT (2026-09-06)

The following script was executed end-to-end against the real system
(backend 127.0.0.1:8000, frontend 127.0.0.1:5173/5174) and **worked**.
All data below is real: imported Transport for Cairo GTFS (1,014 routes,
3,025 stops) + OSM Cairo Metro (Lines 1–3).

### Setup before the demo

```bash
php artisan serve --host=127.0.0.1 --port=8000   # API
cd frontend && npm run dev                        # SPA (note the port it prints)
# Credentials: admin@example.com / password  (also: moderator@example.com / password)
php artisan cache:clear                          # fresh planner index
```

### Act 1 — Landing & search (guest → user)

1. Open the SPA root. Landing shows the hero and — from live API data —
   **"3,025 stops in the live network · 1,014 routes planned across"**.
2. Log in as `admin@example.com` / `password`.
3. Go to Search. Enter origin `30.0444, 31.2357` (Tahrir) and destination
   `29.9773, 31.1325` (Giza pyramids area). Set Departure to **10:00**
   (important: daytime, inside service windows — late-night searches
   truthfully return long waits until the 05:30 first service).
4. **Find journeys** → 3 options, e.g.:
   - ★ Best — 65 min, 1 transfer, minibus `Ms4` Shepheard Hotel → Khufu
     Gate, then CTA `2002` → Mena House; 1.3 km walking.
   - Same journey via Green G1 bus instead of the minibus.
   - 49 min alternative bus + minibus.

### Act 2 — Journey execution & deviation

1. Save the journey, Start it.
2. Send location updates (`POST /active-journeys/{id}/location`) — or click
   through the ActiveJourney screen — walking to the boarding stop
   (30.0423, 31.2315 → "Shepheard Hotel (Qasr Al Nile)"), then along the
   corridor (30.02, 31.20). Watch next-stop/progress update live.
3. Send the deviation ping (30.09, 31.29) → the system detects
   **"Off route: 478 m from the corridor of the current minibus leg towards
   Khofo Gate"**, journey status flips to `deviated`, a high-priority
   notification appears.

### Act 3 — Recovery

1. Generate recovery options → **3 alternatives**, each a full re-plan from
   the deviation position (origin becomes 30.02, 31.20), with scores,
   walking, transfers.
2. Accept option → status `rerouted`, journey legs replaced.
3. Complete the journey → status `completed`; notification feed shows the
   full story in order: deviation detected → recovery options ready →
   journey rerouted → journey completed.

### Act 4 — Community trust loop

1. Submit a community report (type `delay`) at Shepheard stop with a past
   timestamp.
2. Try moderating it as the same user → **409 "Moderators cannot moderate
   their own reports"** (integrity guardrail — show this to the judges).
3. Log in as `moderator@example.com` / `password`, moderate → `verify`.
4. The report now appears in the public community feed (`verified`).

### Act 5 — Admin

1. Open Admin dashboard → live KPIs: completion rate, cancellation rate,
   report approval rate, average trust score, all reflecting the journey
   just performed.
2. Deviation analytics and moderation queue show the events from Acts 2–4.

### What this proves

- Real Egyptian data at demo scale (3,000+ stops, 1,000+ routes incl.
  microbus paratransit and the Cairo Metro).
- Deterministic, explainable multimodal planning (metro + bus + minibus +
  microbus, real headway-based departures).
- The flagship differentiator: live execution → deviation detection →
  recovery rerouting, closed loop.
- Community trust with moderation integrity (self-moderation blocked).
- Admin analytics reflecting real activity — no fake numbers anywhere.
