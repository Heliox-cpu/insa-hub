import http from 'node:http';
import { createApp } from '../src/server/app.js';
import {
  parseAdeSummary,
  parseAdeIcal,
  detectFreeSlots,
  toParisIsoString,
  getSampleAdeIcs,
  filterAdeEvents,
  fetchAdeFeed,
} from '../src/server/services/ade.service.js';
import {
  extractDietaryLabels,
  calculateAffluence,
  getSampleCampusRestaurants,
  fetchCampusRestaurants,
  filterDiningMenus,
} from '../src/server/services/dining.service.js';
import {
  fetchVaEvents,
  fetchVaDirectory,
  getSampleVaEvents,
  getSampleStudentAssociations,
  filterVaEvents,
} from '../src/server/services/va.service.js';
import type { AdeCourseEvent } from '../src/shared/types/ade.types.js';

export interface StressTestResult {
  id: string;
  name: string;
  category: 'ADE_PARSING' | 'FREE_SLOTS' | 'DINING_CLOSURES' | 'CROUS_POINTS' | 'PORTAIL_VA_FALLBACK';
  passed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  observation: string;
  details: string;
}

const results: StressTestResult[] = [];

function record(
  id: string,
  name: string,
  category: StressTestResult['category'],
  passed: boolean,
  severity: StressTestResult['severity'],
  observation: string,
  details: string
) {
  results.push({ id, name, category, passed, severity, observation, details });
  const status = passed ? '✅ PASS' : `❌ FAIL [${severity}]`;
  console.log(`${status} [${category}] ${id}: ${name}\n  Obs: ${observation}\n  Details: ${details}\n`);
}

async function runAdversarialM23() {
  console.log('================================================================');
  console.log('CHALLENGER 1: CONNECTORS & SCRAPERS EMPIRICAL ADVERSARIAL SUITE');
  console.log('================================================================\n');

  // Start temporary test server for HTTP proxy tests
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // ============================================================================
  // SECTION 1: ADE SUMMARY & ICS PARSING ADVERSARIAL STRESS
  // ============================================================================
  console.log('>>> SECTION 1: ADE SUMMARY & ICS PARSING STRESS');

  // 1.1: Unusual SUMMARY format: PROMO:EDT
  try {
    const parsedPromo = parseAdeSummary('PROMO:EDT');
    const ok = parsedPromo.subjectCode === 'PROMO:EDT' && parsedPromo.courseType === 'OTHER';
    record(
      'ADE-01',
      'Unusual SUMMARY format: PROMO:EDT',
      'ADE_PARSING',
      ok,
      'HIGH',
      `subjectCode="${parsedPromo.subjectCode}", courseType="${parsedPromo.courseType}"`,
      'Regex fallback handled gracefully without crash'
    );
  } catch (e: any) {
    record('ADE-01', 'Unusual SUMMARY: PROMO:EDT', 'ADE_PARSING', false, 'HIGH', e.message, 'Exception thrown');
  }

  // 1.2: Unusual SUMMARY format: Créneau Groupe
  try {
    const parsedGroup = parseAdeSummary('Créneau Groupe');
    const ok = parsedGroup.subjectCode === 'Créneau Groupe' && parsedGroup.courseType === 'OTHER';
    record(
      'ADE-02',
      'Unusual SUMMARY format: Créneau Groupe',
      'ADE_PARSING',
      ok,
      'HIGH',
      `subjectCode="${parsedGroup.subjectCode}", courseType="${parsedGroup.courseType}"`,
      'Fallback handles accents and spaces gracefully'
    );
  } catch (e: any) {
    record('ADE-02', 'Unusual SUMMARY: Créneau Groupe', 'ADE_PARSING', false, 'HIGH', e.message, 'Exception thrown');
  }

  // 1.3: SUMMARY with empty string or whitespace
  try {
    const parsedEmpty = parseAdeSummary('   ');
    const ok = parsedEmpty.subjectCode === 'INCONNU' && parsedEmpty.courseType === 'OTHER';
    record(
      'ADE-03',
      'Whitespace SUMMARY string fallback',
      'ADE_PARSING',
      ok,
      'MEDIUM',
      `subjectCode="${parsedEmpty.subjectCode}", courseType="${parsedEmpty.courseType}"`,
      'Whitespace fallback correctly returns INCONNU'
    );
  } catch (e: any) {
    record('ADE-03', 'Whitespace SUMMARY string', 'ADE_PARSING', false, 'MEDIUM', e.message, 'Exception thrown');
  }

  // 1.4: Malformed ICS Content - Non-ICS raw string
  try {
    const malformedRaw = 'THIS IS NOT AN ICS FILE AT ALL !';
    const events = parseAdeIcal(malformedRaw);
    record(
      'ADE-04',
      'Completely malformed non-ICS text string',
      'ADE_PARSING',
      Array.isArray(events) && events.length === 0,
      'HIGH',
      `Returned ${events.length} events`,
      'Handled non-ICS string without unhandled crash'
    );
  } catch (e: any) {
    record('ADE-04', 'Completely malformed non-ICS text', 'ADE_PARSING', false, 'HIGH', e.message, 'Crashed parseAdeIcal');
  }

  // 1.5: Missing SUMMARY field in VEVENT
  try {
    const icsMissingSummary = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ADE Campus//INSA Lyon//FR
BEGIN:VEVENT
UID:test-missing-summary-001
DTSTART:20260929T080000Z
DTEND:20260929T100000Z
LOCATION:Amphi Gaston Berger
DESCRIPTION:Cours sans titre explicite
END:VEVENT
END:VCALENDAR`;
    const events = parseAdeIcal(icsMissingSummary);
    const hasEvent = events.length === 1;
    const title = events[0]?.title;
    const subj = events[0]?.subjectCode;
    // Check if title is defined and non-empty
    const titleValid = typeof title === 'string' && title.length > 0;
    record(
      'ADE-05',
      'Missing SUMMARY attribute in VEVENT',
      'ADE_PARSING',
      hasEvent && titleValid,
      'MEDIUM',
      `eventsCount=${events.length}, title="${title}", subjectCode="${subj}"`,
      titleValid ? 'Handled with fallback title' : 'CRITICAL BUG: Title is empty string when SUMMARY is missing'
    );
  } catch (e: any) {
    record('ADE-05', 'Missing SUMMARY attribute in VEVENT', 'ADE_PARSING', false, 'HIGH', e.message, 'Crash on missing summary');
  }

  // 1.6: VEVENT with missing DTSTART or DTEND
  try {
    const icsMissingDates = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ADE Campus//INSA Lyon//FR
BEGIN:VEVENT
UID:test-no-start
DTEND:20260929T100000Z
SUMMARY:IF:3:S1::BDR:CM::3IF3 #001
END:VEVENT
BEGIN:VEVENT
UID:test-no-end
DTSTART:20260929T080000Z
SUMMARY:IF:3:S1::BDR:CM::3IF3 #002
END:VEVENT
END:VCALENDAR`;
    const events = parseAdeIcal(icsMissingDates);
    record(
      'ADE-06',
      'VEVENT with missing DTSTART or DTEND',
      'ADE_PARSING',
      events.length === 0,
      'MEDIUM',
      `eventsCount=${events.length}`,
      'Correctly skipped events with missing start or end dates'
    );
  } catch (e: any) {
    record('ADE-06', 'VEVENT with missing DTSTART or DTEND', 'ADE_PARSING', false, 'MEDIUM', e.message, 'Crash');
  }

  // 1.7: VEVENT with invalid date format
  try {
    const icsInvalidDate = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ADE Campus//INSA Lyon//FR
BEGIN:VEVENT
UID:test-invalid-date
DTSTART:INVALID_DATE_VALUE
DTEND:INVALID_DATE_VALUE
SUMMARY:IF:3:S1::BDR:CM::3IF3 #001
END:VEVENT
END:VCALENDAR`;
    let threw = false;
    let errMessage = '';
    try {
      parseAdeIcal(icsInvalidDate);
    } catch (e: any) {
      threw = true;
      errMessage = e.message;
    }
    record(
      'ADE-07',
      'VEVENT with invalid date format robustness',
      'ADE_PARSING',
      !threw,
      'HIGH',
      threw ? `CRASH: ${errMessage}` : 'Safely handled or filtered invalid date',
      threw ? 'CRASH BUG: Invalid date throws RangeError in toParisIsoString' : 'Graceful handling'
    );
  } catch (e: any) {
    record('ADE-07', 'VEVENT with invalid date', 'ADE_PARSING', false, 'HIGH', e.message, 'Exception');
  }

  // 1.8: POST /api/ade/parse endpoint with malformed payload
  try {
    const res = await fetch(`${baseUrl}/api/ade/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icsContent: 'MALFORMED_CALENDAR_TEXT_HERE' }),
    });
    const body = await res.json() as any;
    record(
      'ADE-08',
      'POST /api/ade/parse with malformed ICS payload',
      'ADE_PARSING',
      res.status === 200 && body.success === true && Array.isArray(body.data) && body.count === 0,
      'MEDIUM',
      `Status: ${res.status}, success: ${body.success}, count: ${body.count}`,
      'Endpoint gracefully returned 200 with empty array instead of 500'
    );
  } catch (e: any) {
    record('ADE-08', 'POST /api/ade/parse malformed', 'ADE_PARSING', false, 'MEDIUM', e.message, 'Error');
  }


  // ============================================================================
  // SECTION 2: FREE SLOTS DETECTION ADVERSARIAL STRESS
  // ============================================================================
  console.log('\n>>> SECTION 2: FREE SLOTS DETECTION STRESS');

  // 2.1: Empty calendar day (no courses)
  try {
    const emptyDaySlots = detectFreeSlots([], '2026-09-29', 8, 18);
    const hasFullSlot = emptyDaySlots.length === 1 && emptyDaySlots[0].durationMinutes === 600;
    record(
      'SLOT-01',
      'Empty calendar day full span detection (8h-18h = 600m)',
      'FREE_SLOTS',
      hasFullSlot,
      'MEDIUM',
      `slotsCount=${emptyDaySlots.length}, duration=${emptyDaySlots[0]?.durationMinutes}m, label="${emptyDaySlots[0]?.label}"`,
      hasFullSlot ? 'Entire 10-hour day returned as free slot' : 'Did not return full day span'
    );
  } catch (e: any) {
    record('SLOT-01', 'Empty calendar day', 'FREE_SLOTS', false, 'MEDIUM', e.message, 'Error');
  }

  // 2.2: Full day of courses without gaps (08:00 - 18:00)
  try {
    const fullDayEvents: AdeCourseEvent[] = [
      {
        id: 'c1',
        title: 'Cours Matin',
        subjectCode: 'MATIN',
        courseType: 'CM',
        location: 'Amphi',
        start: '2026-09-29T08:00:00+02:00',
        end: '2026-09-29T12:00:00+02:00',
        rawSummary: 'MATIN',
      },
      {
        id: 'c2',
        title: 'Cours Aprem',
        subjectCode: 'APREM',
        courseType: 'TD',
        location: 'Salle',
        start: '2026-09-29T12:00:00+02:00',
        end: '2026-09-29T18:00:00+02:00',
        rawSummary: 'APREM',
      },
    ];
    const fullSlots = detectFreeSlots(fullDayEvents, '2026-09-29', 8, 18);
    record(
      'SLOT-02',
      'Full day of courses without gaps (8h-18h)',
      'FREE_SLOTS',
      fullSlots.length === 0,
      'HIGH',
      `slotsCount=${fullSlots.length}`,
      fullSlots.length === 0 ? 'Correctly detected 0 free slots' : 'Bogus free slots detected during full day'
    );
  } catch (e: any) {
    record('SLOT-02', 'Full day without gaps', 'FREE_SLOTS', false, 'HIGH', e.message, 'Error');
  }

  // 2.3: Back-to-back courses without gaps (08:00-10:00, 10:00-12:00, 12:00-14:00)
  try {
    const backToBackEvents: AdeCourseEvent[] = [
      {
        id: 'b1',
        title: 'C1',
        subjectCode: 'C1',
        courseType: 'CM',
        location: 'Salle 1',
        start: '2026-09-29T08:00:00+02:00',
        end: '2026-09-29T10:00:00+02:00',
        rawSummary: 'C1',
      },
      {
        id: 'b2',
        title: 'C2',
        subjectCode: 'C2',
        courseType: 'TD',
        location: 'Salle 2',
        start: '2026-09-29T10:00:00+02:00',
        end: '2026-09-29T12:00:00+02:00',
        rawSummary: 'C2',
      },
      {
        id: 'b3',
        title: 'C3',
        subjectCode: 'C3',
        courseType: 'TP',
        location: 'Salle 3',
        start: '2026-09-29T12:00:00+02:00',
        end: '2026-09-29T14:00:00+02:00',
        rawSummary: 'C3',
      },
    ];
    const b2bSlots = detectFreeSlots(backToBackEvents, '2026-09-29', 8, 18);
    // There should ONLY be one free slot: 14:00 to 18:00 (240 min)
    const onlyAfternoon = b2bSlots.length === 1 && b2bSlots[0].durationMinutes === 240;
    record(
      'SLOT-03',
      'Back-to-back courses without gaps',
      'FREE_SLOTS',
      onlyAfternoon,
      'HIGH',
      `slotsCount=${b2bSlots.length}, duration=${b2bSlots[0]?.durationMinutes}m`,
      onlyAfternoon ? 'No spurious gap between contiguous courses' : 'Spurious gaps detected between consecutive courses'
    );
  } catch (e: any) {
    record('SLOT-03', 'Back-to-back courses', 'FREE_SLOTS', false, 'HIGH', e.message, 'Error');
  }

  // 2.4: Overlapping courses (partial and fully nested)
  try {
    const overlappingEvents: AdeCourseEvent[] = [
      // 08:00 - 11:00
      {
        id: 'o1',
        title: 'O1',
        subjectCode: 'O1',
        courseType: 'CM',
        location: 'A',
        start: '2026-09-29T08:00:00+02:00',
        end: '2026-09-29T11:00:00+02:00',
        rawSummary: 'O1',
      },
      // 10:00 - 12:00 (overlaps with O1 from 10h to 11h, extends cursor to 12h)
      {
        id: 'o2',
        title: 'O2',
        subjectCode: 'O2',
        courseType: 'TD',
        location: 'B',
        start: '2026-09-29T10:00:00+02:00',
        end: '2026-09-29T12:00:00+02:00',
        rawSummary: 'O2',
      },
      // 10:30 - 11:30 (fully nested within O1 and O2)
      {
        id: 'o3',
        title: 'O3',
        subjectCode: 'O3',
        courseType: 'TP',
        location: 'C',
        start: '2026-09-29T10:30:00+02:00',
        end: '2026-09-29T11:30:00+02:00',
        rawSummary: 'O3',
      },
      // 14:00 - 16:00
      {
        id: 'o4',
        title: 'O4',
        subjectCode: 'O4',
        courseType: 'CM',
        location: 'D',
        start: '2026-09-29T14:00:00+02:00',
        end: '2026-09-29T16:00:00+02:00',
        rawSummary: 'O4',
      },
    ];
    const overlapSlots = detectFreeSlots(overlappingEvents, '2026-09-29', 8, 18);
    // Expected:
    // Slot 1: 12:00 to 14:00 (120 min, lunch break)
    // Slot 2: 16:00 to 18:00 (120 min, end of day)
    const hasTwoSlots = overlapSlots.length === 2;
    const slot1Duration = overlapSlots[0]?.durationMinutes;
    const slot2Duration = overlapSlots[1]?.durationMinutes;
    const correctDurations = slot1Duration === 120 && slot2Duration === 120;
    record(
      'SLOT-04',
      'Overlapping and nested courses handling',
      'FREE_SLOTS',
      hasTwoSlots && correctDurations,
      'HIGH',
      `slotsCount=${overlapSlots.length}, slot1=${slot1Duration}m, slot2=${slot2Duration}m`,
      hasTwoSlots && correctDurations
        ? 'Cursor correctly tracks furthest end timestamp without negative slots'
        : 'Overlapping courses caused incorrect free slot calculation'
    );
  } catch (e: any) {
    record('SLOT-04', 'Overlapping courses', 'FREE_SLOTS', false, 'HIGH', e.message, 'Error');
  }

  // 2.5: TIMEZONE DST HARDCODING: Winter Date (CET = UTC+1) vs Summer Date (CEST = UTC+2)
  try {
    // In Winter (e.g. 2026-01-15), Paris is UTC+1.
    // Course on Jan 15 from 08:00 to 10:00 Paris time (+01:00)
    const winterEvents: AdeCourseEvent[] = [
      {
        id: 'w1',
        title: 'Maths Hiver',
        subjectCode: 'MATH',
        courseType: 'CM',
        location: 'Amphi',
        start: '2026-01-15T08:00:00+01:00',
        end: '2026-01-15T10:00:00+01:00',
        rawSummary: 'MATH',
      },
    ];

    const winterSlots = detectFreeSlots(winterEvents, '2026-01-15', 8, 18);
    // In a correct implementation, the day starts at 08:00 Paris time.
    // Since course starts at 08:00 Paris time, there should be NO free slot before 08:00!
    // But because startOfDay is hardcoded to +02:00 (2026-01-15T08:00:00+02:00 = 06:00Z = 07:00 Paris time),
    // it detects a bogus slot from 07:00 to 08:00 Paris time!
    const bogusMorningSlot = winterSlots.find((s) => s.start.includes('07:00:00'));
    const dstBugPresent = !!bogusMorningSlot;

    record(
      'SLOT-05',
      'Winter Date (UTC+1 CET) DST Offset Handling in detectFreeSlots',
      'FREE_SLOTS',
      !dstBugPresent,
      'CRITICAL',
      dstBugPresent
        ? `VULNERABILITY DETECTED: Hardcoded +02:00 caused bogus morning free slot from ${bogusMorningSlot?.start} to ${bogusMorningSlot?.end} (${bogusMorningSlot?.durationMinutes}m)!`
        : 'Winter dates correctly align to 08:00 Paris time without offset shift',
      dstBugPresent
        ? 'CRITICAL DEFECT: startOfDay hardcodes "+02:00" in detectFreeSlots (line 170 in ade.service.ts), causing 1-hour time shift in winter dates!'
        : 'Pass'
    );
  } catch (e: any) {
    record('SLOT-05', 'Winter Date DST Offset', 'FREE_SLOTS', false, 'CRITICAL', e.message, 'Error');
  }


  // ============================================================================
  // SECTION 3: DINING CLOSURE DETECTION (SUNDAYS & BANK HOLIDAYS)
  // ============================================================================
  console.log('\n>>> SECTION 3: DINING CLOSURE DETECTION STRESS');

  // 3.1: Weekend (Saturday & Sunday Lunch) Affluence Closure Detection
  try {
    // Saturday 12:15
    const satLunch = new Date('2026-10-03T10:15:00Z'); // 12:15 Paris
    const satAff = calculateAffluence('ri', satLunch);
    // Sunday 12:15
    const sunLunch = new Date('2026-10-04T10:15:00Z'); // 12:15 Paris
    const sunAff = calculateAffluence('ri', sunLunch);
    // Sunday 19:30 (RI open for Sunday dinner)
    const sunDinner = new Date('2026-10-04T17:30:00Z'); // 19:30 Paris
    const sunDinnerAff = calculateAffluence('ri', sunDinner);

    const satClosed = satAff.level === 'closed';
    const sunLunchClosed = sunAff.level === 'closed';
    const sunDinnerOpen = sunDinnerAff.level === 'low';

    record(
      'DINE-01',
      'Weekend affluence closure detection (Saturday & Sunday lunch vs dinner)',
      'DINING_CLOSURES',
      satClosed && sunLunchClosed && sunDinnerOpen,
      'HIGH',
      `SatLunch=${satAff.level}, SunLunch=${sunAff.level}, SunDinner=${sunDinnerAff.level}`,
      satClosed && sunLunchClosed && sunDinnerOpen
        ? 'Correctly identified weekend closures and Sunday evening service'
        : 'Weekend affluence calculation failed'
    );
  } catch (e: any) {
    record('DINE-01', 'Weekend affluence closure', 'DINING_CLOSURES', false, 'HIGH', e.message, 'Error');
  }

  // 3.2: Bank Holidays Closure Detection in calculateAffluence
  try {
    // Christmas Day: 2026-12-25 (Friday) at 12:15 Paris time
    const christmasDate = new Date('2026-12-25T11:15:00Z'); // 12:15 CET (+01:00)
    const christmasAff = calculateAffluence('ri', christmasDate);

    // Labour Day: 2026-05-01 (Friday) at 12:15 Paris time
    const labourDayDate = new Date('2026-05-01T10:15:00Z'); // 12:15 CEST (+02:00)
    const labourDayAff = calculateAffluence('ri', labourDayDate);

    // Armistice Day: 2026-11-11 (Wednesday) at 12:15 Paris time
    const armisticeDate = new Date('2026-11-11T11:15:00Z'); // 12:15 CET (+01:00)
    const armisticeAff = calculateAffluence('ri', armisticeDate);

    const recognisesHolidays =
      christmasAff.level === 'closed' &&
      labourDayAff.level === 'closed' &&
      armisticeAff.level === 'closed';

    record(
      'DINE-02',
      'Bank holidays (Jours fériés) closure detection in calculateAffluence',
      'DINING_CLOSURES',
      recognisesHolidays,
      'CRITICAL',
      `Christmas=${christmasAff.level} (${christmasAff.description}), LabourDay=${labourDayAff.level}, Armistice=${armisticeAff.level}`,
      recognisesHolidays
        ? 'Campus restaurants properly reported closed on French bank holidays'
        : 'DEFECT: calculateAffluence lacks French bank holidays calendar — reports "high" affluence / peak crowd on Christmas, Labour Day, and Armistice Day!'
    );
  } catch (e: any) {
    record('DINE-02', 'Bank holidays closure in calculateAffluence', 'DINING_CLOSURES', false, 'CRITICAL', e.message, 'Error');
  }

  // 3.3: MealMenu.isOpen and closureReason flags on Sunday or Holiday dates
  try {
    // Calling getSampleCampusRestaurants for a Sunday date:
    const sundayRestaurants = getSampleCampusRestaurants('2026-10-04'); // Sunday
    const ri = sundayRestaurants.find((r) => r.id === 'ri');
    const lunchMenu = ri?.menus.find((m) => m.mealType === 'lunch');
    const dinnerMenu = ri?.menus.find((m) => m.mealType === 'dinner');
    const olivier = sundayRestaurants.find((r) => r.id === 'olivier');
    const olivierLunch = olivier?.menus.find((m) => m.mealType === 'lunch');

    // On Sunday:
    // RI lunch should have isOpen === false, closureReason: 'Dimanche' (or similar)
    // Olivier lunch should have isOpen === false
    const lunchMarkedClosed = lunchMenu?.isOpen === false;
    const olivierMarkedClosed = olivierLunch?.isOpen === false;
    const hasClosureReason = !!lunchMenu?.closureReason;

    record(
      'DINE-03',
      'MealMenu.isOpen and closureReason on Sunday date in sample/live menus',
      'DINING_CLOSURES',
      lunchMarkedClosed && olivierMarkedClosed && hasClosureReason,
      'HIGH',
      `RI Lunch isOpen=${lunchMenu?.isOpen}, closureReason="${lunchMenu?.closureReason}"; Olivier Lunch isOpen=${olivierLunch?.isOpen}`,
      lunchMarkedClosed && olivierMarkedClosed
        ? 'Menus properly set isOpen=false on Sunday lunch'
        : 'DEFECT: MealMenu hardcodes isOpen: true for all meals and leaves closureReason undefined, even on Sunday dates!'
    );
  } catch (e: any) {
    record('DINE-03', 'MealMenu.isOpen on Sunday', 'DINING_CLOSURES', false, 'HIGH', e.message, 'Error');
  }


  // ============================================================================
  // SECTION 4: CROUS POINTS PARSING & MALFORMED TEXT ADVERSARIAL STRESS
  // ============================================================================
  console.log('\n>>> SECTION 4: CROUS POINTS PARSING & MALFORMED TEXT STRESS');

  // 4.1: Inspect dietary label and points extraction from raw CROUS dish strings
  try {
    const rawDishStandard = 'Cuisse de Poulet Rôtie (3 pts) <VF>';
    const rawDishUnclosedParen = 'Filet de Colin d’Alaska (2 pts <FM>';
    const rawDishWordParen = 'Steak de Soja (2 points) <VEG>';
    const rawDishNoNumber = 'Penne Rigate (pts) <VEG>';
    const rawDishNegative = 'Entrée Mystère (-1 pt)';
    const rawDishOutOfRange = 'Super Menu Gourmand (8 pts)';

    const resStandard = extractDietaryLabels(rawDishStandard);
    const resUnclosed = extractDietaryLabels(rawDishUnclosedParen);

    // Check if points are extracted or cleaned from cleanName
    const standardCleanHasPts = resStandard.cleanName.includes('(3 pts)');
    const unclosedCleanHasPts = resUnclosed.cleanName.includes('(2 pts');

    record(
      'CROUS-01',
      'CROUS Points Extraction & Name Cleaning from raw string',
      'CROUS_POINTS',
      !standardCleanHasPts && !unclosedCleanHasPts,
      'HIGH',
      `Standard cleanName="${resStandard.cleanName}", Unclosed cleanName="${resUnclosed.cleanName}"`,
      !standardCleanHasPts
        ? 'Points are cleanly stripped from name and extracted'
        : 'DEFECT: extractDietaryLabels only handles <TAG> tags; CROUS points "(3 pts)" are NOT parsed or stripped from dish titles!'
    );
  } catch (e: any) {
    record('CROUS-01', 'CROUS points extraction', 'CROUS_POINTS', false, 'HIGH', e.message, 'Error');
  }

  // 4.2: CROUS API Integration in fetchCampusRestaurants
  try {
    // Verify whether fetchCampusRestaurants actually connects to CROUStillant API
    // or whether CROUS dishes are purely static sample fixtures
    const restaurantsRes = await fetchCampusRestaurants(true);
    const puvis = restaurantsRes.restaurants.find((r) => r.id === 'puvis');
    const puvisLunch = puvis?.menus.find((m) => m.mealType === 'lunch');
    const hasPointsOnItems = puvisLunch?.items.some((item) => typeof item.points === 'number');

    record(
      'CROUS-02',
      'CROUS Menu Items Points Field Population in Sample/Live Data',
      'CROUS_POINTS',
      hasPointsOnItems === true,
      'MEDIUM',
      `Puvis items count=${puvisLunch?.items.length}, hasPointsOnItems=${hasPointsOnItems}`,
      hasPointsOnItems
        ? 'CROUS menu items properly include Izly points attribute (1 to 4 pts)'
        : 'CROUS items missing points attribute'
    );
  } catch (e: any) {
    record('CROUS-02', 'CROUS Menu Items Points', 'CROUS_POINTS', false, 'MEDIUM', e.message, 'Error');
  }


  // ============================================================================
  // SECTION 5: PORTAIL VA PROXY ERROR & TIMEOUT FALLBACK
  // ============================================================================
  console.log('\n>>> SECTION 5: PORTAIL VA PROXY ERROR & TIMEOUT FALLBACK');

  // 5.1: Test fetchVaEvents with remote API failure (graceful fallback)
  try {
    // When remote server fails or times out, fetchVaEvents must return source: 'sample'
    // without throwing unhandled exceptions
    const vaEventsRes = await fetchVaEvents(true);
    const ok =
      Array.isArray(vaEventsRes.events) &&
      vaEventsRes.events.length > 0 &&
      (vaEventsRes.source === 'remote' || vaEventsRes.source === 'sample');

    record(
      'VA-01',
      'fetchVaEvents returns structured events with valid fallback',
      'PORTAIL_VA_FALLBACK',
      ok,
      'HIGH',
      `eventsCount=${vaEventsRes.events.length}, source=${vaEventsRes.source}`,
      'Fallback gracefully provides events when upstream is inaccessible or offline'
    );
  } catch (e: any) {
    record('VA-01', 'fetchVaEvents fallback', 'PORTAIL_VA_FALLBACK', false, 'HIGH', e.message, 'Exception thrown');
  }

  // 5.2: Test fetchVaDirectory with remote API failure (graceful fallback)
  try {
    const vaDirRes = await fetchVaDirectory(true);
    const ok =
      Array.isArray(vaDirRes.directory) &&
      vaDirRes.directory.length >= 5 &&
      (vaDirRes.source === 'remote' || vaDirRes.source === 'sample');

    record(
      'VA-02',
      'fetchVaDirectory returns student associations directory with fallback',
      'PORTAIL_VA_FALLBACK',
      ok,
      'HIGH',
      `associationsCount=${vaDirRes.directory.length}, source=${vaDirRes.source}`,
      'Directory fallback operational'
    );
  } catch (e: any) {
    record('VA-02', 'fetchVaDirectory fallback', 'PORTAIL_VA_FALLBACK', false, 'HIGH', e.message, 'Exception thrown');
  }

  // 5.3: GET /api/va/events HTTP proxy endpoint response under upstream failure
  try {
    const res = await fetch(`${baseUrl}/api/va/events?refresh=true`);
    const body = await res.json() as any;
    const ok = res.status === 200 && body.success === true && Array.isArray(body.data) && body.count > 0;
    record(
      'VA-03',
      'GET /api/va/events HTTP endpoint survives upstream offline/error',
      'PORTAIL_VA_FALLBACK',
      ok,
      'CRITICAL',
      `HTTP status=${res.status}, success=${body.success}, count=${body.count}, source=${body.source}`,
      ok ? 'HTTP endpoint gracefully falls back to fixture without 502/504' : 'Failed with HTTP error'
    );
  } catch (e: any) {
    record('VA-03', 'GET /api/va/events HTTP endpoint', 'PORTAIL_VA_FALLBACK', false, 'CRITICAL', e.message, 'Error');
  }

  // 5.4: GET /api/va/directory HTTP endpoint response under upstream failure
  try {
    const res = await fetch(`${baseUrl}/api/va/directory?refresh=true`);
    const body = await res.json() as any;
    const ok = res.status === 200 && body.success === true && Array.isArray(body.data) && body.count >= 5;
    record(
      'VA-04',
      'GET /api/va/directory HTTP endpoint survives upstream offline/error',
      'PORTAIL_VA_FALLBACK',
      ok,
      'HIGH',
      `HTTP status=${res.status}, success=${body.success}, count=${body.count}, source=${body.source}`,
      ok ? 'HTTP directory endpoint gracefully falls back to fixture' : 'Failed'
    );
  } catch (e: any) {
    record('VA-04', 'GET /api/va/directory HTTP endpoint', 'PORTAIL_VA_FALLBACK', false, 'HIGH', e.message, 'Error');
  }

  // 5.5: GET /api/ade/events with unreachable / invalid feed URL
  try {
    const unreachableUrl = 'http://127.0.0.1:19999/nonexistent.ics';
    const adeRes = await fetchAdeFeed(unreachableUrl);
    const ok = adeRes.source === 'sample' && adeRes.events.length > 0;
    record(
      'ADE-09',
      'fetchAdeFeed with unreachable URL gracefully falls back to sample fixture',
      'ADE_PARSING',
      ok,
      'HIGH',
      `source=${adeRes.source}, eventsCount=${adeRes.events.length}`,
      ok ? 'ADE feed gracefully falls back to sample' : 'ADE feed did not fall back'
    );
  } catch (e: any) {
    record('ADE-09', 'fetchAdeFeed unreachable URL fallback', 'ADE_PARSING', false, 'HIGH', e.message, 'Error');
  }

  // Clean up
  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log('Test server shut down cleanly.\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('================================================================');
  console.log('CHALLENGER 1 ADVERSARIAL STRESS TEST SUMMARY');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const criticalFails = results.filter((r) => !r.passed && r.severity === 'CRITICAL').length;
  const highFails = results.filter((r) => !r.passed && r.severity === 'HIGH').length;

  console.log(`Total Adversarial Checks : ${total}`);
  console.log(`Passed                   : ${passed}`);
  console.log(`Failed                   : ${failed}`);
  console.log(`Critical Failures        : ${criticalFails}`);
  console.log(`High Failures            : ${highFails}`);
  console.log(`Pass Rate                : ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('FAILED CHECKS DETAILS:');
    for (const f of results.filter((r) => !r.passed)) {
      console.log(`- [${f.category}] ${f.id} (${f.severity}): ${f.name}`);
      console.log(`  Obs: ${f.observation}`);
      console.log(`  Details: ${f.details}\n`);
    }
  }

  return { total, passed, failed, criticalFails, highFails, results };
}

// Execute runner if directly run
runAdversarialM23().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
