import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';
import {
  parseAdeSummary,
  parseAdeIcal,
  detectFreeSlots,
  toParisIsoString,
  getSampleAdeIcs,
  filterAdeEvents,
} from '../../src/server/services/ade.service.js';
import {
  extractDietaryLabels,
  calculateAffluence,
  getSampleCampusRestaurants,
  filterDiningMenus,
} from '../../src/server/services/dining.service.js';
import {
  getSampleVaEvents,
  getSampleStudentAssociations,
  filterVaEvents,
} from '../../src/server/services/va.service.js';
import {
  initCasMfaSession,
  verifyCasMfaChallenge,
  parseApogeeHtml,
  getSampleAcademicRecord,
} from '../../src/server/services/mdw.service.js';

describe('Data Connectors & Scrapers Suite (M2 Verification)', () => {
  const app = createApp();

  // ==========================================
  // 1. ADE PLANNING CONNECTOR
  // ==========================================
  describe('1. ADE Planning Service & Parser', () => {
    it('parses standard INSA Lyon ADE course summary regex correctly', () => {
      const parsed1 = parseAdeSummary('IF:3:S1::BDR:CM::3IF3 #001');
      expect(parsed1).toEqual({
        department: 'IF',
        year: 3,
        semester: 'S1',
        subjectCode: 'BDR',
        courseType: 'CM',
        group: '3IF3',
        eventNumber: '001',
      });

      const parsed2 = parseAdeSummary('FIMI:2:S1::MA-TF:TD::048 #011');
      expect(parsed2).toEqual({
        department: 'FIMI',
        year: 2,
        semester: 'S1',
        subjectCode: 'MA-TF',
        courseType: 'TD',
        group: '048',
        eventNumber: '011',
      });

      const parsed3 = parseAdeSummary('TC:4:S2::RES:TP::TD2 #005');
      expect(parsed3.department).toBe('TC');
      expect(parsed3.year).toBe(4);
      expect(parsed3.semester).toBe('S2');
      expect(parsed3.courseType).toBe('TP');

      const parsedEval = parseAdeSummary('IF:4:S1::COMP:EV::4IF #001');
      expect(parsedEval.courseType).toBe('EVAL');
    });

    it('handles non-standard raw summaries with graceful fallback', () => {
      const fallback = parseAdeSummary('Conférence Métiers Ingénieur');
      expect(fallback.department).toBeNull();
      expect(fallback.subjectCode).toBe('Conférence Métiers Ingénieur');
      expect(fallback.courseType).toBe('OTHER');
    });

    it('formats ISO timestamps with Europe/Paris timezone offset', () => {
      const sampleDate = new Date('2026-09-29T10:00:00Z');
      const parisIso = toParisIsoString(sampleDate);
      expect(parisIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+(01:00|02:00)$/);
    });

    it('parses realistic ICS calendar and orders events chronologically', () => {
      const ics = getSampleAdeIcs();
      const events = parseAdeIcal(ics);

      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events[0].id).toBeDefined();
      expect(events[0].subjectCode).toBeDefined();
      expect(events[0].courseType).toBeDefined();
      expect(events[0].start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(events[0].end).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Chronological order verification
      for (let i = 0; i < events.length - 1; i++) {
        const t1 = new Date(events[i].start).getTime();
        const t2 = new Date(events[i + 1].start).getTime();
        expect(t1).toBeLessThanOrEqual(t2);
      }
    });

    it('detects free study and lunch slots between classes', () => {
      const ics = getSampleAdeIcs();
      const events = parseAdeIcal(ics);
      const targetDate = '2026-09-29';

      const freeSlots = detectFreeSlots(events, targetDate, 8, 18);
      expect(Array.isArray(freeSlots)).toBe(true);

      for (const slot of freeSlots) {
        expect(slot.durationMinutes).toBeGreaterThanOrEqual(30);
        expect(slot.start).toBeDefined();
        expect(slot.end).toBeDefined();
        expect(slot.label).toBeDefined();
      }
    });

    it('filters ADE events by subjectCode, department, and courseType', () => {
      const events = parseAdeIcal(getSampleAdeIcs());

      const cmOnly = filterAdeEvents(events, { courseTypes: ['CM'] });
      expect(cmOnly.every((e) => e.courseType === 'CM')).toBe(true);

      const compOnly = filterAdeEvents(events, { subjectCode: 'COMP' });
      expect(compOnly.every((e) => e.subjectCode.includes('COMP'))).toBe(true);
    });

    it('responds to GET /api/ade/events with valid JSON payload', async () => {
      const res = await request(app).get('/api/ade/events');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBe(res.body.data.length);
    });

    it('responds to GET /api/ade/free-slots with detected slots', async () => {
      const res = await request(app).get('/api/ade/free-slots?date=2026-09-29');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.date).toBe('2026-09-29');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('responds to POST /api/ade/parse with parsed events', async () => {
      const res = await request(app)
        .post('/api/ade/parse')
        .send({ icsContent: getSampleAdeIcs() });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 2. DINING SERVICE & MENUS CONNECTOR
  // ==========================================
  describe('2. Dining Menus & Affluence Connector', () => {
    it('extracts dietary labels (<BIO>, <VEG>, <VF>, etc.) and cleans dish title', () => {
      const raw1 = 'Curry de Pois Chiches <BIO> <VEG>';
      const res1 = extractDietaryLabels(raw1);
      expect(res1.cleanName).toBe('Curry de Pois Chiches');
      expect(res1.labels).toContain('BIO');
      expect(res1.labels).toContain('VEG');

      const raw2 = 'Rôti de Dinde Forestier <VF>';
      const res2 = extractDietaryLabels(raw2);
      expect(res2.cleanName).toBe('Rôti de Dinde Forestier');
      expect(res2.labels).toContain('VF');

      const raw3 = 'Filet de Saumon <FM> <HVE>';
      const res3 = extractDietaryLabels(raw3);
      expect(res3.cleanName).toBe('Filet de Saumon');
      expect(res3.labels).toContain('FM');
      expect(res3.labels).toContain('HVE');
    });

    it('calculates dynamic campus affluence heuristic by time of day', () => {
      // Lunch peak: 12:15 on a Tuesday
      const tuesdayPeak = new Date('2026-09-29T10:15:00Z'); // 12:15 Europe/Paris (UTC+2)
      const affPeak = calculateAffluence('ri', tuesdayPeak);
      expect(affPeak.level).toBe('high');
      expect(affPeak.description).toContain('Pic');

      // Late afternoon closed: 15:00 on a Tuesday
      const tuesdayClosed = new Date('2026-09-29T13:00:00Z'); // 15:00 Europe/Paris
      const affClosed = calculateAffluence('ri', tuesdayClosed);
      expect(affClosed.level).toBe('closed');
    });

    it('provides comprehensive campus restaurants coverage (RI, Olivier, CROUS)', () => {
      const restaurants = getSampleCampusRestaurants('2026-09-29');
      const ids = restaurants.map((r) => r.id);

      expect(ids).toContain('ri');
      expect(ids).toContain('olivier');
      expect(ids).toContain('puvis');
      expect(ids).toContain('archimede');
      expect(ids).toContain('astree');

      const ri = restaurants.find((r) => r.id === 'ri')!;
      expect(ri.menus.length).toBeGreaterThanOrEqual(1);
      const lunch = ri.menus.find((m) => m.mealType === 'lunch')!;
      expect(lunch.lines?.length).toBeGreaterThanOrEqual(3); // Traditionnelle, Monde, Végétarienne
    });

    it('filters menus by dietary label (e.g. VEG)', () => {
      const restaurants = getSampleCampusRestaurants('2026-09-29');
      const filtered = filterDiningMenus(restaurants, { labels: ['VEG'] });

      for (const r of filtered) {
        for (const m of r.menus) {
          for (const item of m.items) {
            expect(item.labels).toContain('VEG');
          }
        }
      }
    });

    it('responds to GET /api/dining with all restaurants', async () => {
      const res = await request(app).get('/api/dining');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.service).toBe('dining');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(5);
    });

    it('responds to GET /api/dining/restaurants/ri with RI details', async () => {
      const res = await request(app).get('/api/dining/restaurants/ri');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('ri');
      expect(res.body.data.name).toContain('Restaurant INSA');
    });

    it('responds to GET /api/dining/affluence with real-time gauges', async () => {
      const res = await request(app).get('/api/dining/affluence');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(5);
    });
  });

  // ==========================================
  // 3. PORTAIL VA CONNECTOR
  // ==========================================
  describe('3. Portail VA (Vie Associative) Connector', () => {
    it('provides structured campus associations events', () => {
      const events = getSampleVaEvents();
      expect(events.length).toBeGreaterThan(0);

      for (const e of events) {
        expect(e.id).toBeDefined();
        expect(e.title).toBeDefined();
        expect(e.association).toBeDefined();
        expect(e.category).toBeDefined();
        expect(e.start).toBeDefined();
        expect(e.location).toBeDefined();
        expect(typeof e.isFree).toBe('boolean');
      }
    });

    it('provides rich associations directory', () => {
      const directory = getSampleStudentAssociations();
      expect(directory.length).toBeGreaterThanOrEqual(5);

      const bde = directory.find((a) => a.shortName === 'BdE INSA');
      expect(bde).toBeDefined();
      expect(bde?.name).toContain('Bureau des Élèves');

      const kfet = directory.find((a) => a.shortName === 'K-Fêt');
      expect(kfet).toBeDefined();
    });

    it('filters VA events by category and text search query', () => {
      const events = getSampleVaEvents();

      const soirees = filterVaEvents(events, { category: 'Soirée' });
      expect(soirees.every((e) => e.category === 'Soirée')).toBe(true);

      const kfetMatches = filterVaEvents(events, { searchQuery: 'K-Fêt' });
      expect(kfetMatches.length).toBeGreaterThan(0);
      expect(kfetMatches.some((e) => e.association.includes('K-Fêt'))).toBe(true);
    });

    it('responds to GET /api/va/events with typed event list', async () => {
      const res = await request(app).get('/api/va/events');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBe(res.body.data.length);
    });

    it('responds to GET /api/va/directory with associations catalogue', async () => {
      const res = await request(app).get('/api/va/directory');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('responds to GET /api/va/categories with unique categories list', async () => {
      const res = await request(app).get('/api/va/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toContain('Soirée');
      expect(res.body.data).toContain('Culture');
    });
  });

  // ==========================================
  // 4. MONDOSSIERWEB & CAS/MFA CONNECTOR
  // ==========================================
  describe('4. MonDossierWeb & CAS/MFA Authentication', () => {
    it('initializes CAS MFA session and enforces ephemeral flowId', () => {
      const session = initCasMfaSession('amartin');
      expect(session.flowId).toBeDefined();
      expect(session.requiresMfa).toBe(true);
      expect(session.step).toBe('AWAITING_TOTP');
      expect(session.sessionExpiresAt).toBeDefined();
    });

    it('rejects invalid TOTP codes (non-6-digits or letters)', () => {
      const session = initCasMfaSession('amartin');

      // Less than 6 digits
      const res1 = verifyCasMfaChallenge(session.flowId, '123');
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('6 chiffres');

      // Letters
      const res2 = verifyCasMfaChallenge(session.flowId, 'abcdef');
      expect(res2.success).toBe(false);

      // Too long
      const res3 = verifyCasMfaChallenge(session.flowId, '12345678');
      expect(res3.success).toBe(false);
    });

    it('verifies 6-digit TOTP challenge and returns student academic record', () => {
      const session = initCasMfaSession('amartin');
      const verification = verifyCasMfaChallenge(session.flowId, '482910');

      expect(verification.success).toBe(true);
      expect(verification.record).toBeDefined();
      expect(verification.record?.studentNumber).toBe('00054321');
      expect(verification.record?.semesters.length).toBeGreaterThanOrEqual(2);

      // One-time use verification: second attempt with same flowId must fail
      const replayAttempt = verifyCasMfaChallenge(session.flowId, '482910');
      expect(replayAttempt.success).toBe(false);
      expect(replayAttempt.error).toContain('expirée ou inexistante');
    });

    it('parses mock Apogée HTML markup with UE, modules, grades and ECTS', () => {
      const mockHtml = `
        <html>
          <body>
            <div class="identite">Numéro Étudiant : 00098765 - Nom : DUPONT Pierre - Filière : 3IF</div>
            <table class="notesTable">
              <tr>
                <td>UE-IF-301</td>
                <td>Algorithmique & Programmation</td>
                <td>15.5</td>
                <td>VAL</td>
                <td>6</td>
              </tr>
              <tr>
                <td>IF-C</td>
                <td>Programmation C Avancée</td>
                <td>16.0</td>
                <td>VAL</td>
                <td></td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const record = parseApogeeHtml(mockHtml);
      expect(record.studentNumber).toBe('00098765');
      expect(record.name).toBe('DUPONT Pierre');
      expect(record.semesters.length).toBeGreaterThan(0);
      expect(record.semesters[0].teachingUnits[0].code).toBe('UE-IF-301');
      expect(record.semesters[0].teachingUnits[0].modules[0].code).toBe('IF-C');
    });

    it('flow test via HTTP endpoints: POST /api/mdw/auth/init and /auth/verify', async () => {
      // 1. Init
      const initRes = await request(app)
        .post('/api/mdw/auth/init')
        .send({ username: 'alexandre.martin' });

      expect(initRes.status).toBe(200);
      expect(initRes.body.success).toBe(true);
      expect(initRes.body.flowId).toBeDefined();
      expect(initRes.body.step).toBe('AWAITING_TOTP');

      const { flowId } = initRes.body;

      // 2. Verify with valid 6-digit TOTP
      const verifyRes = await request(app)
        .post('/api/mdw/auth/verify')
        .send({ flowId, totpCode: '654321' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.step).toBe('COMPLETED');
      expect(verifyRes.body.data).toBeDefined();
      expect(verifyRes.body.data.studentNumber).toBe('00054321');
    });

    it('rejects POST /api/mdw/auth/init with missing username', async () => {
      const res = await request(app).post('/api/mdw/auth/init').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });

    it('responds to GET /api/mdw/grades with academic transcript', async () => {
      const res = await request(app).get('/api/mdw/grades');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.semesters.length).toBeGreaterThanOrEqual(2);
    });
  });
});
