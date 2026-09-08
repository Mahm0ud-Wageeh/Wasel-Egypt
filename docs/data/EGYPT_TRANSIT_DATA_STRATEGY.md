# Egypt Transit Data Strategy for Wasel Egypt

## Overview
This document outlines a comprehensive strategy for sourcing, processing, validating, and maintaining transit data for Egypt to support the Wasel Egypt platform. It addresses the critical need for high-quality, reliable transit data that goes beyond the current seeded/test data to enable a production-ready, professional transit application.

---

## 1. Current State Assessment

### Existing Data Sources
- **Seeded/Test Data**: Minimal sample data for development/testing only
- **GTFS Import Capability**: Backend includes GTFS import controllers but no actual Egyptian GTFS feeds are currently imported
- **Manual Entry Possible**: Transit operators, routes, stops can be entered manually via admin interfaces (requires permission:transit-data-edit)

### Data Gaps
- No real Egyptian transit data currently loaded in the system
- No established pipeline for obtaining, validating, and importing transit data
- Missing geographic context (OSM data) for precise stop placement and walking routes
- No mechanism for keeping data updated as transit systems change

## 2. Data Sources Research

### Primary Transit Data Sources for Egypt

#### A. General Transit Feed Specification (GTFS)
**Official Sources:**
- Egyptian National Railways (ENR): Potential source for rail data
- Cairo Transit Authority (CTA): Potential source for Cairo metro and bus data
- Alexandria Transport Authority: Potential source for Alexandria tram/bus data
- Private operators: Various bus and minibus operators may have GTFS feeds

**Availability Assessment:**
- **Challenge**: Comprehensive, unified GTFS coverage for all of Egypt is currently limited
- **Opportunity**: Major urban areas (Cairo, Alexandria, Giza) may have partial feeds
- **Alternative**: Aggregation of multiple operator feeds may be necessary

#### B. OpenStreetMap (OSM) for Egypt
**Official Source:**
- https://www.openstreetmap.org
- Egyptian extract: https://download.geofabrik.de/africa/egypt.html

**Data Quality:**
- Generally good coverage in urban areas (Cairo, Alexandria, major cities)
- Variable quality in rural areas
- Includes roads, footways, crossings, public transport infrastructure
- Transit-specific features (platforms, stops, stations) quality varies

#### C. Mobility Database / Transitland
**Official Sources:**
- Mobility Database: https://mobilitydatabase.org/
- Transitland: https://transit.land/

**Egypt Coverage:**
- Need to verify actual availability of Egyptian feeds in these aggregators
- Mobility Database provides cleaned, unified datasets with consistent identifiers
- Could serve as validation/supplement to direct GTFS sources

#### D. Government Open Data Portals
**Potential Sources:**
- Egyptian government open data portals
- Ministry of Transport websites
- Local governorate/open data initiatives

**Assessment:**
- Need to investigate current availability and formats
- May require contacting relevant authorities for data access

#### E. Commercial Data Providers (for evaluation)
**Options to Evaluate:**
- Here Technologies
- TomTom
- Google Transit Partners
- Moovit data (if available through partnerships)

**Considerations:**
- Cost implications
- Licensing restrictions
- Data freshness and update frequency
- Attribute requirements

## 3. Data Collection & Validation Pipeline

### Phase 1: Data Acquisition
1. **Identify Sources**: Catalog all available GTFS feeds for Egyptian transit operators
2. **OSM Extracts**: Download weekly/monthly extracts from Geofabrik for Egypt
3. **Alternative Sources**: Investigate government portals, Mobility Database coverage
4. **Contact Operators**: Reach out to major transit operators for GTFS access

### Phase 2: Data Validation & Quality Checks
For each GTFS feed obtained:
1. **Format Validation**: Use `gtfs-validator` or similar to check spec compliance
2. **Required Files**: Ensure presence of agency.txt, stops.txt, routes.txt, trips.txt, stop_times.txt, calendar.txt
3. **Geographic Validation**: 
   - Check stop coordinates fall within Egypt boundaries
   - Validate against OSM for reasonableness (stops near roads, etc.)
4. **Temporal Validation**: 
   - Check service dates are current/relevant
   - Validate trip timings and headways
5. **Relationship Validation**:
   - Ensure referential integrity between files
   - Validate that trips reference valid routes and services
   - Check that stop_times reference existing stops

### Phase 3: Data Normalization & Enhancement
1. **Coordinate System**: Ensure all coordinates use WGS84 (EPSG:4326)
2. **Stop Enhancement**: 
   - Snap stops to nearest OSM footway/crossing where appropriate
   - Add wheelchair accessibility info from OSM where missing
   - Standardize stop naming conventions
3. **Route Enhancement**:
   - Add route geometry from OSM where available and appropriate
   - Standardize route type coding (matching Wasel's transit modes)
   - Add route colors from operator branding where available
4. **Schedule Enhancement**:
   - Validate headways and trip frequencies
   - Identify and flag potential data issues (overlapping trips, impossible timings)

### Phase 4: Deduplication & Consolidation
1. **Stop Deduplication**:
   - Geographic deduplication (stops within X meters)
   - Name-based deduplication with geographic confirmation
   - Create canonical stop records with metadata about source origins
2. **Route Deduplication**:
   - Geographic similarity + service pattern analysis
   - Preserve distinct routes that serve different patterns even if similar geographically
3. **Operator Normalization**:
   - Standardize operator names and IDs
   - Link to official operator registries where available

### Phase 5: Import & Publishing
1. **Incremental Import**: 
   - Design import process to handle updates without losing user-generated content (favorites, reports tied to stops/routes)
   - Use external IDs to maintain references across updates
2. **Validation Reporting**:
   - Generate data quality reports for each import
   - Track changes and anomalies over time
3. **Publish to Backend**:
   - Use existing GTFS import controllers
   - Ensure proper error handling and rollback capabilities
   - Schedule regular updates (weekly/monthly based on source volatility)

## 4. Recommended Update Frequency & Monitoring

### Update Schedule
- **GTFS Feeds**: Weekly checks for major operators; monthly for smaller/less volatile operators
- **OSM Extracts**: Weekly updates from Geofabrik
- **Mobility Database**: Monthly checks for new/updated consolidated feeds
- **Manual Verification**: Quarterly spot-checks of critical routes/stops

### Monitoring & Alerting
1. **Import Success/Failure**: Alert on failed imports
2. **Data Volume Changes**: Alert on significant (>X%) changes in stops/routes/trips
3. **Geographic Anomalies**: Alert on stops appearing outside Egypt or in impossible locations
4. **Schedule Integrity**: Alert on impossible headways (>24h between trips) or overlapping trips requiring negative layover
5. **Validation Failures**: Alert on increasing validation error rates

## 5. Data Coverage Targets for Egypt

### Geographic Coverage
- **Tier 1 (Priority 1)**: Greater Cairo (Cairo, Giza, parts of Qalyubia) - Target: 95%+ coverage of formal transit
- **Tier 2 (Priority 2)**: Alexandria and Nile Delta major cities - Target: 85%+ coverage
- **Tier 3 (Priority 3)**: Other governorate capitals and major urban centers - Target: 70%+ coverage
- **Tier 4 (Long-term)**: Rural and intercity connections - Target: 50%+ coverage of scheduled services

### Data Quality Targets
- **Completeness**: 
  - 95% of stops with valid coordinates
  - 90% of routes with complete trip patterns
  - 85% of stops with wheelchair accessibility info (where applicable/applicable)
- **Accuracy**:
  - <5% of stops requiring manual correction after OSM snapping
  - <3% of trips with timing violations (negative travel times, impossible speeds)
  - <2% of routes with geographic discontinuities
- **Freshness**:
  - 90% of data updated within last 30 days for Tier 1 areas
  - 70% of data updated within last 90 days for Tier 2-3 areas

## 6. Risk Assessment & Mitigation

### Risks
1. **Data Source Volatility**: GTFS feeds may disappear or become unavailable
2. **Inconsistent Quality**: Varying data quality between different operators
3. **Legal/Licensing Issues**: Unclear rights to use or redistribute certain data
4. **Technical Complexity**: Managing multiple feed formats and update schedules
5. **Resource Constraints**: Ongoing effort required for maintenance

### Mitigation Strategies
1. **Source Diversification**: Don't rely on single operator/source for critical areas
2. **Fallback Mechanisms**: Maintain last-known-good version when updates fail
3. **Legal Review**: Document data sources and licenses; consult legal if needed for redistribution
4. **Modular Pipeline**: Design import process to handle each source independently
5. **Automation**: Maximize automation to reduce manual effort; focus human effort on validation and exception handling

## 7. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Establish data acquisition process for OSM Egypt extracts
- [ ] Set up weekly OSM import into development/staging environment
- [ ] Research and document potential GTFS sources for Egypt
- [ ] Contact 3-5 major transit operators for GTFS access

### Phase 2: Pilot Implementation (Weeks 3-4)
- [ ] Obtain first GTFS feed (pilot operator)
- [ ] Implement and test validation pipeline
- [ ] Load pilot data into staging backend
- [ ] Verify basic functionality (journey planning works with real data)

### Phase 3: Expansion (Weeks 5-8)
- [ ] Acquire additional GTFS feeds for Cairo and Alexandria
- [ ] Implement deduplication and consolidation logic
- [ ] Establish regular update schedule for pilot feeds
- [ ] Begin data quality monitoring and reporting

### Phase 4: Production Readiness (Weeks 9-12)
- [ ] Achieve target coverage for Tier 1 areas
- [ ] Implement incremental update mechanism preserving user data
- [ ] Run load/performance testing with real data volumes
- [ ] Document procedures for ongoing maintenance
- [ ] Transition to production update schedule

## 8. Roles & Responsibilities

### Data Engineering Team
- Design and maintain data acquisition pipelines
- Implement validation, normalization, and deduplication logic
- Manage update schedules and monitoring
- Produce data quality reports

### Domain Experts (Transit/Egypt)
- Validate data accuracy against local knowledge
- Identify missing or incorrect data elements
- Provide context for operator-specific peculiarities
- Assist in contacting operators and validating licensing

### DevOps/Infrastructure
- Host and maintain data processing infrastructure
- Ensure security and reliability of data pipelines
- Manage storage for historical data extracts
- Support backup and recovery procedures

### Product/Quality Assurance
- Define data quality acceptance criteria
- Verify end-to-end functionality with real data
- Monitor user-reported data issues
- Coordinate releases of updated data to production

## 9. Budget & Resource Considerations

### Infrastructure Costs
- **Storage**: OSM Egypt extract (~15GB compressed), GTFS feeds (variable, expect 1-5GB total for comprehensive coverage)
- **Processing**: Moderate CPU/RAM requirements for validation and import (can be done on modest servers)
- **Bandwidth**: Weekly downloads of OSM extracts (~15GB/week), GTFS feeds (smaller, frequent)

### Human Resources
- **Initial Setup**: 2-3 weeks of focused effort for pipeline development
- **Ongoing Maintenance**: Estimated 5-10 hours per week for monitoring, troubleshooting, and source management
- **Expertise Needed**: Data engineering, transit domain knowledge, basic scripting/ETL skills

### Potential Cost Savings
- Using open-source data (OSM, GTFS where available) avoids licensing fees
- Community-supported tools reduce software costs
- Phased approach allows validation before major investment

## 10. Success Metrics

### Quantitative Metrics
- **Coverage Percentage**: % of known transit stops/routes captured in system
- **Update Latency**: Average time between source update and system availability
- **Data Error Rate**: Validation errors per 1000 stops/routes
- **User Impact**: Reduction in user-reported data issues
- **System Performance**: Journey search response times with real data

### Qualitative Metrics
- **Data Confidence**: Expert assessment of data reliability for journey planning
- **Operator Satisfaction**: Feedback from transit operators whose data is used
- **Local Knowledge Alignment**: Correspondence with known ground truth in Egypt
- **Completeness Perception**: User sense that "most options they'd expect are available"

---

## Conclusion

A robust Egypt transit data strategy is essential for transforming Wasel Egypt from a prototype with sample data into a professional, production-ready transit platform. By implementing the phased approach outlined above—starting with OSM foundation, piloting GTFS imports, establishing validation pipelines, and progressively expanding coverage—Wasel can achieve reliable, comprehensive transit data coverage.

The key to success lies in treating data not as a one-time import but as an ongoing operational process requiring monitoring, validation, and continuous improvement. With proper implementation, Wasel Egypt will have transit data that enables accurate journey planning, road-aware routing, and the trustworthy user experience essential for widespread adoption.

**Next Step**: Begin immediate acquisition of OSM Egypt extracts and outreach to potential GTFS data sources in Egypt while setting up the validation pipeline framework.
---

## CONCRETE PIPELINE DECISION (2026-09-06, verification complete)

The abstract strategy above now resolves to two concrete, provenance-separated sources:

### Source 1 — mdb-3355 (Transport for Cairo, CC-BY-NC-SA-2.0)
Buses + minibuses + paratransit for Greater Cairo (1,011 routes / 2,997 stops / 1,784 trips, frequency-based).
- Pipeline: DOWNLOAD (direct zip, no auth) → VALIDATE (existing validator + row-count sanity) → NORMALIZE (agency→mode/operator mapping keyed on agency_id; calendar dates normalized to a current demo window with an explicit `demo_date_shift` recorded in provenance — never silently labeled "live") → DEDUPLICATE (gtfs_stop_id / gtfs_route_id natural keys) → IMPORT (streaming, chunked inserts) → QUALITY CHECK (counts, geometry sanity, stop bounds vs Egypt bbox) → VERSION (import log with source URL + dataset timestamp).

### Source 2 — Cairo Metro from OSM (ODbL)
Metro Lines 1/2/3 (+ monorail if cleanly mapped) via Overpass route relations; stations as stops; geometry from relation ways; frequency schedules from published NAT operating patterns, recorded as derived (not official GTFS). Imported through the same pipeline with `source=osm-metro` provenance, clearly separated from the GTFS feed.

### Invariants
- Every import writes a provenance row (source, URL, dataset version, license, counts, normalization applied).
- Demo date normalization is recorded and surfaced in admin UI as "demo dataset" status; nothing is presented as real-time.
- Re-import is idempotent on GTFS external keys; user-generated content (reports, favorites, journeys) is never touched by re-imports.
