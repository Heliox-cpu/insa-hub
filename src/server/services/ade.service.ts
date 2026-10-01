import nodeIcal, { type VEvent } from 'node-ical';
import type { AdeCourseEvent, AdeSummaryParsed, CourseType, FreeTimeSlot } from '../../shared/types/ade.types.js';

/**
 * Regex officielle INSA Lyon pour découper le champ SUMMARY des cours ADE :
 * Format standard : <Dept>:<Année>:<Sem>::<CodeMatière>:<Type>::<Groupe> #<NuméroSéance>
 * Exemples :
 * - IF:3:S1::BDR:CM::3IF3 #001
 * - FIMI:2:S1::MA-TF:TD::048 #011
 * - TC:4:S2::RES:TP::TD2 #005
 */
const SUMMARY_REGEX = /^([A-Z0-9]+):([0-9]+):([A-Z0-9]+)::([A-Z0-9_-]+):([A-Z]+)::([A-Z0-9_-]+)(?:\s+#([0-9]+))?/i;

export function parseAdeSummary(rawSummary: string): AdeSummaryParsed {
  const match = rawSummary.trim().match(SUMMARY_REGEX);
  if (!match) {
    // Fallback gracieux si format non standard
    return {
      department: null,
      year: null,
      semester: null,
      subjectCode: rawSummary.trim() || 'INCONNU',
      courseType: inferCourseType(rawSummary),
      group: null,
      eventNumber: null,
    };
  }

  const [, dept, yearStr, semester, subjectCode, typeStr, group, eventNumber] = match;

  return {
    department: dept.toUpperCase(),
    year: parseInt(yearStr, 10),
    semester: semester.toUpperCase(),
    subjectCode: subjectCode.toUpperCase(),
    courseType: normalizeCourseType(typeStr),
    group: group || null,
    eventNumber: eventNumber || null,
  };
}

function normalizeCourseType(typeStr: string): CourseType {
  const upper = typeStr.toUpperCase();
  if (upper === 'CM') return 'CM';
  if (upper === 'TD') return 'TD';
  if (upper === 'TP') return 'TP';
  if (upper === 'EV' || upper === 'EVAL' || upper === 'EXAM' || upper === 'DS') return 'EVAL';
  return 'OTHER';
}

function inferCourseType(text: string): CourseType {
  const upper = text.toUpperCase();
  if (upper.includes('CM') || upper.includes('COURS')) return 'CM';
  if (upper.includes('TD') || upper.includes('DIRIGE')) return 'TD';
  if (upper.includes('TP') || upper.includes('PRATIQUE')) return 'TP';
  if (upper.includes('EV') || upper.includes('EXAM') || upper.includes('EVAL') || upper.includes('DS')) return 'EVAL';
  return 'OTHER';
}

/**
 * Nettoyage et formatage du nom de salle INSA (ex: "503.001 - Amphithéâtre Gaston Berger" -> "Amphi Gaston Berger")
 */
export function formatLocation(rawLocation: string): string {
  if (!rawLocation) return 'Salle non précisée';
  let loc = rawLocation.trim();
  loc = loc.replace(/^([0-9.]+)\s*-\s*/, ''); // Supprime code numérique de bâtiment
  loc = loc.replace(/Amphithéâtre/i, 'Amphi');
  loc = loc.replace(/Bâtiment/i, 'Bât.');
  return loc;
}

/**
 * Formate une date en chaîne ISO avec offset Europe/Paris (+01:00 ou +02:00)
 */
export function toParisIsoString(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return '1970-01-01T00:00:00+01:00';
  }

  // Obtenir les composants en fuseau Europe/Paris
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  // Calcul du décalage horaire UTC pour Europe/Paris à cette date
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const diffMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  const offsetHours = Math.floor(Math.abs(diffMinutes) / 60);
  const offsetMins = Math.abs(diffMinutes) % 60;
  const sign = diffMinutes >= 0 ? '+' : '-';
  const offsetStr = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}${offsetStr}`;
}

/**
 * Calcule dynamiquement le décalage horaire (+01:00 ou +02:00) pour une date donnée en Europe/Paris
 */
export function getParisOffsetForDate(dateStr: string): string {
  try {
    const noon = new Date(`${dateStr}T12:00:00Z`);
    if (isNaN(noon.getTime())) return '+01:00';
    const utcDate = new Date(noon.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(noon.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const diffMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
    const offsetHours = Math.floor(Math.abs(diffMinutes) / 60);
    const offsetMins = Math.abs(diffMinutes) % 60;
    const sign = diffMinutes >= 0 ? '+' : '-';
    return `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
  } catch {
    return '+01:00';
  }
}

/**
 * Parse un contenu iCal (string) et renvoie la liste des cours typés et triés par heure de début.
 */
export function parseAdeIcal(icsContent: string): AdeCourseEvent[] {
  const parsedData = nodeIcal.sync.parseICS(icsContent);
  const events: AdeCourseEvent[] = [];

  for (const [key, item] of Object.entries(parsedData)) {
    if (!item || item.type !== 'VEVENT') continue;

    const event = item as VEvent;
    if (!event.start || !event.end) continue;

    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue;
    if (startDate.getTime() >= endDate.getTime()) continue;

    const rawSummary = event.summary ? String(event.summary).trim() : '';
    const parsedSummary = parseAdeSummary(rawSummary);
    const location = formatLocation(event.location ? String(event.location) : '');
    const description = event.description ? String(event.description) : '';

    // Extraction de l'enseignant si présent dans la description
    let instructor: string | undefined;
    const instructorMatch = description.match(/\((?:[^,]+,\s*)?([A-ZÀ-Ÿ\s.-]+)\)/);
    if (instructorMatch) {
      instructor = instructorMatch[1].trim();
    }

    const title = parsedSummary.subjectCode && parsedSummary.subjectCode !== 'INCONNU'
      ? parsedSummary.subjectCode
      : (rawSummary || 'Cours INSA');

    events.push({
      id: event.uid || key,
      uid: event.uid,
      department: parsedSummary.department || undefined,
      year: parsedSummary.year || undefined,
      semester: parsedSummary.semester || undefined,
      subjectCode: parsedSummary.subjectCode,
      courseType: parsedSummary.courseType,
      group: parsedSummary.group || undefined,
      eventNumber: parsedSummary.eventNumber || undefined,
      title,
      location,
      instructor,
      start: toParisIsoString(startDate),
      end: toParisIsoString(endDate),
      rawSummary,
      description: description || undefined,
      status: 'confirmed',
    });
  }

  // Tri chronologique
  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return events;
}

/**
 * Détecte les créneaux libres (free time slots) d'au moins 30 minutes entre 8h00 et 18h00.
 */
export function detectFreeSlots(
  events: AdeCourseEvent[],
  targetDateStr: string, // YYYY-MM-DD
  dayStartHour = 8,
  dayEndHour = 18
): FreeTimeSlot[] {
  const dayEvents = events.filter((e) => e.start.startsWith(targetDateStr));
  dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const freeSlots: FreeTimeSlot[] = [];
  const offset = getParisOffsetForDate(targetDateStr);
  const startOfDay = new Date(`${targetDateStr}T${String(dayStartHour).padStart(2, '0')}:00:00${offset}`);
  const endOfDay = new Date(`${targetDateStr}T${String(dayEndHour).padStart(2, '0')}:00:00${offset}`);

  let currentCursor = startOfDay.getTime();

  for (const event of dayEvents) {
    const eventStart = new Date(event.start).getTime();
    const eventEnd = new Date(event.end).getTime();

    if (eventStart > currentCursor) {
      const diffMinutes = Math.round((eventStart - currentCursor) / 60000);
      if (diffMinutes >= 30) {
        const slotStart = new Date(currentCursor);
        const slotEnd = new Date(eventStart);
        const lunchStart = new Date(`${targetDateStr}T11:30:00${offset}`).getTime();
        const lunchEnd = new Date(`${targetDateStr}T14:00:00${offset}`).getTime();

        freeSlots.push({
          start: toParisIsoString(slotStart),
          end: toParisIsoString(slotEnd),
          durationMinutes: diffMinutes,
          label: diffMinutes >= 60 && currentCursor >= lunchStart && currentCursor < lunchEnd
            ? 'Pause Déjeuner'
            : 'Créneau Libre',
        });
      }
    }
    if (eventEnd > currentCursor) {
      currentCursor = eventEnd;
    }
  }

  if (endOfDay.getTime() > currentCursor) {
    const diffMinutes = Math.round((endOfDay.getTime() - currentCursor) / 60000);
    if (diffMinutes >= 30) {
      freeSlots.push({
        start: toParisIsoString(new Date(currentCursor)),
        end: toParisIsoString(new Date(endOfDay.getTime())),
        durationMinutes: diffMinutes,
        label: 'Fin de journée',
      });
    }
  }

  return freeSlots;
}


/**
 * Fixture de secours (cours représentatifs INSA Lyon) utilisée en mode démo / test ou en cas d'indisponibilité réseau
 */
export function getSampleAdeIcs(): string {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ADE Campus//INSA Lyon//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:ade-sample-000a@insa-lyon.fr
DTSTAMP:20260928T100000Z
DTSTART:20260928T060000Z
DTEND:20260928T080000Z
SUMMARY:IF:4:S1::SYS-DIST:CM::4IF1 #001
LOCATION:503.001 - Amphithéâtre Gaston Berger
DESCRIPTION:Systèmes Distribués et Microservices (Mme. Viala)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-000b@insa-lyon.fr
DTSTAMP:20260928T100000Z
DTSTART:20260928T081500Z
DTEND:20260928T101500Z
SUMMARY:IF:4:S1::BDR:TD::4IF2 #002
LOCATION:Bâtiment Blaise Pascal - Salle 104
DESCRIPTION:Bases de Données Relationnelles Avancées (Pr. Scuturici)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-000c@insa-lyon.fr
DTSTAMP:20260928T100000Z
DTSTART:20260928T120000Z
DTEND:20260928T150000Z
SUMMARY:IF:4:S1::WEB:TP::4IF2 #001
LOCATION:Bâtiment Blaise Pascal - Lab 206
DESCRIPTION:Développement Web Moderne & PWA (M. Brunie)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-001@insa-lyon.fr
DTSTAMP:20260929T100000Z
DTSTART:20260929T060000Z
DTEND:20260929T080000Z
SUMMARY:IF:4:S1::COMP:CM::4IF1 #003
LOCATION:503.001 - Amphithéâtre Émilie du Châtelet
DESCRIPTION:Compilation et Théorie des Langages (Pr. Durand)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-002@insa-lyon.fr
DTSTAMP:20260929T100000Z
DTSTART:20260929T081500Z
DTEND:20260929T101500Z
SUMMARY:IF:4:S1::RES:TD::4IF2 #005
LOCATION:Claude Chappe - Salle 212
DESCRIPTION:Réseaux IP et Routage Avancé (M. Belkacem)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-003@insa-lyon.fr
DTSTAMP:20260929T100000Z
DTSTART:20260929T120000Z
DTEND:20260929T150000Z
SUMMARY:IF:4:S1::SYS-DIST:TP::4IF2 #002
LOCATION:Bâtiment Lespinasse - Lab 304
DESCRIPTION:Systèmes Distribués et Microservices (Mme. Viala)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-004@insa-lyon.fr
DTSTAMP:20260930T100000Z
DTSTART:20260930T060000Z
DTEND:20260930T080000Z
SUMMARY:IF:4:S1::BDR:CM::4IF1 #007
LOCATION:503.001 - Amphithéâtre Gaston Berger
DESCRIPTION:Bases de Données et Big Data (Pr. Scuturici)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-005@insa-lyon.fr
DTSTAMP:20260930T100000Z
DTSTART:20260930T081500Z
DTEND:20260930T101500Z
SUMMARY:IF:4:S1::WEB:TD::4IF2 #003
LOCATION:Bâtiment Lespinasse - Salle 202
DESCRIPTION:Architectures Web & PWA (M. Brunie)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-005b@insa-lyon.fr
DTSTAMP:20260930T100000Z
DTSTART:20260930T120000Z
DTEND:20260930T140000Z
SUMMARY:IF:4:S1::PRJ:TD::4IF2 #004
LOCATION:Bâtiment Blaise Pascal - Salle 110
DESCRIPTION:Conduite de Projet Agile & DevOps (M. Brunie)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-006@insa-lyon.fr
DTSTAMP:20261001T100000Z
DTSTART:20261001T060000Z
DTEND:20261001T080000Z
SUMMARY:IF:4:S1::ANG:TD::G4 #004
LOCATION:Bâtiment Louis Neel - Salle 105
DESCRIPTION:Anglais Technique C1 (Mme. Smith)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-006b@insa-lyon.fr
DTSTAMP:20261001T100000Z
DTSTART:20261001T081500Z
DTEND:20261001T101500Z
SUMMARY:IF:4:S1::SEC:CM::4IF1 #002
LOCATION:Amphi Gaston Berger
DESCRIPTION:Cryptographie & Sécurité Applicative (M. Belkacem)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-007@insa-lyon.fr
DTSTAMP:20261001T100000Z
DTSTART:20261001T120000Z
DTEND:20261001T140000Z
SUMMARY:IF:4:S1::MATH:CM::4IF1 #008
LOCATION:Amphi Gaston Berger
DESCRIPTION:Probabilités et Statistiques Appliquées (Pr. Pothier)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-008@insa-lyon.fr
DTSTAMP:20261002T100000Z
DTSTART:20261002T060000Z
DTEND:20261002T090000Z
SUMMARY:IF:4:S1::COMP:TP::4IF2 #004
LOCATION:Bâtiment Lespinasse - Lab 302
DESCRIPTION:Projet Compilateur C-- (Pr. Durand)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-008b@insa-lyon.fr
DTSTAMP:20261002T100000Z
DTSTART:20261002T091500Z
DTEND:20261002T101500Z
SUMMARY:IF:4:S1::ECO:CM::4IF1 #003
LOCATION:Amphi Émilie du Châtelet
DESCRIPTION:Économie, RSE & Droit des Affaires (M. Garnier)
END:VEVENT
BEGIN:VEVENT
UID:ade-sample-009@insa-lyon.fr
DTSTAMP:20261002T100000Z
DTSTART:20261002T120000Z
DTEND:20261002T140000Z
SUMMARY:IF:4:S1::RES:EV::4IF #001
LOCATION:Amphi Émilie du Châtelet
DESCRIPTION:Évaluation semestrielle Réseaux (DS)
END:VEVENT
END:VCALENDAR`;
}

/**
 * Filtre les événements ADE selon les critères donnés
 */
export function filterAdeEvents(
  events: AdeCourseEvent[],
  options: {
    startDate?: string;
    endDate?: string;
    courseTypes?: string[];
    subjectCode?: string;
    department?: string;
  }
): AdeCourseEvent[] {
  return events.filter((event) => {
    if (options.startDate && event.start < options.startDate) return false;
    if (options.endDate && event.end > options.endDate) return false;
    if (options.courseTypes && options.courseTypes.length > 0 && !options.courseTypes.includes(event.courseType)) {
      return false;
    }
    if (options.subjectCode && !event.subjectCode.toLowerCase().includes(options.subjectCode.toLowerCase())) {
      return false;
    }
    if (options.department && event.department && !event.department.toLowerCase().includes(options.department.toLowerCase())) {
      return false;
    }
    return true;
  });
}

// Cache mémoire pour les flux ADE avec TTL de 15 minutes
interface AdeCacheEntry {
  events: AdeCourseEvent[];
  fetchedAt: number;
}
const adeFeedCache = new Map<string, AdeCacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Récupère le flux ADE à partir d'une URL ou utilise les fixtures de secours
 */
export async function fetchAdeFeed(
  feedUrl?: string
): Promise<{ events: AdeCourseEvent[]; source: 'remote' | 'cache' | 'sample'; fetchedAt: string }> {
  const now = Date.now();

  // Si pas d'URL fournie, utiliser la fixture
  if (!feedUrl || feedUrl.trim() === '') {
    const events = parseAdeIcal(getSampleAdeIcs());
    return { events, source: 'sample', fetchedAt: new Date(now).toISOString() };
  }

  const normalizedUrl = feedUrl.trim();

  // Vérifier le cache mémoire
  const cached = adeFeedCache.get(normalizedUrl);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      events: cached.events,
      source: 'cache',
      fetchedAt: new Date(cached.fetchedAt).toISOString(),
    };
  }

  // Tenter le fetch distant
  try {
    const response = await fetch(normalizedUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'INSA-Hub-Webapp/1.0.0 (+https://insa-lyon.fr)',
      },
    });

    if (!response.ok) {
      throw new Error(`ADE server responded with HTTP ${response.status}`);
    }

    const icsText = await response.text();
    const events = parseAdeIcal(icsText);

    // Mettre à jour le cache
    adeFeedCache.set(normalizedUrl, { events, fetchedAt: now });

    return {
      events,
      source: 'remote',
      fetchedAt: new Date(now).toISOString(),
    };
  } catch (error) {
    // Si le cache existe même expiré, le renvoyer
    if (cached) {
      return {
        events: cached.events,
        source: 'cache',
        fetchedAt: new Date(cached.fetchedAt).toISOString(),
      };
    }

    // Sinon repli sur l'échantillon de secours
    const events = parseAdeIcal(getSampleAdeIcs());
    return {
      events,
      source: 'sample',
      fetchedAt: new Date(now).toISOString(),
    };
  }
}

