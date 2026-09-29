import { describe, it, expect } from 'vitest';
import type {
  AdeCourseEvent,
  FreeTimeSlot,
  AdeFeedConfig,
  RestaurantId,
  CampusRestaurant,
  MealMenu,
  MenuItem,
  VaEvent,
  StudentAssociation,
  StudentAcademicRecord,
  SemesterTranscript,
  TeachingUnit,
  CourseGrade,
  CasMfaSessionInit,
  EncryptedPayload
} from '../../src/shared/types/index.js';
import {
  INSA_COLORS,
  CAMPUS_URLS,
  CAMPUS_TIMEZONE,
  CRYPTO_CONFIG,
  RESTAURANT_IDS,
  RESTAURANTS_METADATA
} from '../../src/shared/constants/insa.constants.js';

describe('Milestone 1 — Shared Domain Models & Constants Verification', () => {

  describe('Shared Constants', () => {
    it('should expose official INSA Lyon colors', () => {
      expect(INSA_COLORS.primary).toBe('#E42313');
      expect(INSA_COLORS.primaryDark).toBe('#C4121A');
      expect(INSA_COLORS.courseTypes.CM.bg).toBeDefined();
      expect(INSA_COLORS.courseTypes.TD.bg).toBeDefined();
      expect(INSA_COLORS.courseTypes.TP.bg).toBeDefined();
    });

    it('should expose campus URLs with correct domains', () => {
      expect(CAMPUS_URLS.ADE_BASE_CAL).toContain('ade-outils.insa-lyon.fr');
      expect(CAMPUS_URLS.CAS_KEYCLOAK_LOGIN).toContain('idauth.insa-lyon.fr');
      expect(CAMPUS_URLS.MDW_PORTAL).toContain('mondossierweb.insa-lyon.fr');
      expect(CAMPUS_URLS.BDE_MENU_API).toContain('utils.bde-insa-lyon.fr');
      expect(CAMPUS_URLS.CROUS_API_BASE).toContain('api.croustillant.menu');
      expect(CAMPUS_URLS.PORTAIL_VA_API_BASE).toContain('portail.asso-insa-lyon.fr');
    });

    it('should declare Europe/Paris timezone', () => {
      expect(CAMPUS_TIMEZONE).toBe('Europe/Paris');
    });

    it('should configure 5 campus restaurants with correct metadata', () => {
      expect(RESTAURANT_IDS).toEqual(['ri', 'olivier', 'puvis', 'astree', 'archimede']);
      expect(RESTAURANTS_METADATA.ri.type).toBe('INSA');
      expect(RESTAURANTS_METADATA.puvis.type).toBe('CROUS');
      expect(RESTAURANTS_METADATA.puvis.crousId).toBe(2265);
    });

    it('should define safe crypto constants', () => {
      expect(CRYPTO_CONFIG.PBKDF2_ITERATIONS).toBe(100_000);
      expect(CRYPTO_CONFIG.AES_KEY_BITS).toBe(256);
      expect(CRYPTO_CONFIG.IV_LENGTH_BYTES).toBe(12);
      expect(CRYPTO_CONFIG.SALT_LENGTH_BYTES).toBe(16);
      expect(CRYPTO_CONFIG.TAG_LENGTH_BITS).toBe(128);
    });
  });

  describe('ADE Models instantiation', () => {
    it('should construct valid AdeCourseEvent', () => {
      const event: AdeCourseEvent = {
        id: 'evt-001',
        department: 'IF',
        year: 3,
        semester: 'S1',
        subjectCode: 'BDR',
        courseType: 'CM',
        group: '3IF3',
        eventNumber: '001',
        title: 'Bases de Données Relationnelles',
        location: 'Amphi Émilie du Châtelet',
        instructor: 'Pr. Durand',
        start: '2026-09-29T08:00:00+02:00',
        end: '2026-09-29T10:00:00+02:00',
        rawSummary: 'IF:3:S1::BDR:CM::3IF3 #001'
      };
      expect(event.courseType).toBe('CM');
      expect(event.department).toBe('IF');
    });

    it('should construct valid FreeTimeSlot and AdeFeedConfig', () => {
      const slot: FreeTimeSlot = {
        start: '2026-09-29T12:15:00+02:00',
        end: '2026-09-29T14:00:00+02:00',
        durationMinutes: 105,
        label: 'Pause Déjeuner'
      };
      const config: AdeFeedConfig = {
        url: 'https://ade-outils.insa-lyon.fr/ADE-Cal:~adupont!2026:abcdef123456',
        login: 'adupont',
        year: 2026,
        tokenSecret: 'abcdef123456'
      };
      expect(slot.durationMinutes).toBe(105);
      expect(config.login).toBe('adupont');
    });
  });

  describe('Dining Models instantiation', () => {
    it('should construct valid CampusRestaurant with MenuItems', () => {
      const item: MenuItem = {
        name: 'Dahl de lentilles corail',
        category: 'dish',
        labels: ['VEG', 'BIO'],
        line: 'Ligne Végétarienne'
      };
      const menu: MealMenu = {
        date: '2026-09-29',
        mealType: 'lunch',
        isOpen: true,
        items: [item]
      };
      const resto: CampusRestaurant = {
        id: 'ri',
        name: 'Restaurant INSA (RI)',
        type: 'INSA',
        affluenceLevel: 'low',
        menus: [menu]
      };
      expect(resto.menus[0].items[0].labels).toContain('VEG');
    });
  });

  describe('Portail VA Models instantiation', () => {
    it('should construct valid VaEvent and StudentAssociation', () => {
      const event: VaEvent = {
        id: 42,
        title: 'Soirée Blind Test',
        association: 'BdE INSA Lyon',
        category: 'Soirée',
        start: '2026-09-29T20:30:00+02:00',
        location: 'K-Fêt',
        description: 'Blind test inter-départements',
        isFree: true
      };
      const asso: StudentAssociation = {
        id: 1,
        name: 'Bureau des Élèves',
        shortName: 'BdE',
        category: 'Animation',
        description: 'Association fédératrice des étudiants de l’INSA Lyon'
      };
      expect(event.association).toBe('BdE INSA Lyon');
      expect(asso.shortName).toBe('BdE');
    });
  });

  describe('MonDossierWeb & Cryptographic Vault Models instantiation', () => {
    it('should construct full StudentAcademicRecord', () => {
      const grade: CourseGrade = {
        code: 'IF-BDR',
        name: 'Bases de Données',
        grade: 16.5,
        maxGrade: 20,
        coefficient: 2,
        session: '1',
        status: 'VAL'
      };
      const ue: TeachingUnit = {
        code: 'UE-IF-301',
        name: 'Ingénierie des Données',
        average: 15.2,
        ectsCredits: 6,
        status: 'VAL',
        modules: [grade]
      };
      const sem: SemesterTranscript = {
        semesterNumber: 5,
        academicYear: '2025-2026',
        average: 14.8,
        totalEcts: 30,
        acquiredEcts: 30,
        teachingUnits: [ue]
      };
      const record: StudentAcademicRecord = {
        studentNumber: '00012345',
        name: 'Alexandre Dupont',
        program: '3ème année Informatique',
        semesters: [sem],
        lastSyncTimestamp: '2026-09-29T10:00:00Z'
      };
      expect(record.semesters[0].teachingUnits[0].modules[0].grade).toBe(16.5);
    });

    it('should construct valid EncryptedPayload', () => {
      const payload: EncryptedPayload = {
        saltHex: '0123456789abcdef0123456789abcdef',
        ivHex: '0123456789abcdef01234567',
        ciphertextHex: 'deadbeefcafe1234',
        tagLength: 128,
        algorithm: 'AES-GCM',
        iterations: 100_000,
        version: 1
      };
      expect(payload.tagLength).toBe(128);
      expect(payload.algorithm).toBe('AES-GCM');
    });

    it('should construct valid CasMfaSessionInit', () => {
      const session: CasMfaSessionInit = {
        flowId: '123e4567-e89b-12d3-a456-426614174000',
        requiresMfa: true,
        step: 'AWAITING_TOTP',
        message: 'Enter 6-digit TOTP challenge'
      };
      expect(session.step).toBe('AWAITING_TOTP');
    });
  });
});
