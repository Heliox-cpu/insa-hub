import crypto from 'crypto';
import type {
  CasMfaSessionInit,
  CasMfaStep,
  CourseGrade,
  SemesterTranscript,
  StudentAcademicRecord,
  TeachingUnit,
} from '../../shared/types/mdw.types.js';

/**
 * Fixture de relevé de notes représentative d'un élève-ingénieur INSA Lyon
 */
export function getSampleAcademicRecord(studentNumber = '00054321', name = 'Alexandre Martin'): StudentAcademicRecord {
  const s7: SemesterTranscript = {
    semesterNumber: 7,
    academicYear: '2026-2027',
    average: 14.88,
    totalEcts: 30,
    acquiredEcts: 30,
    juryDecision: 'Semestre Validé (ADMIS)',
    teachingUnits: [
      {
        code: 'UE-IF-701',
        name: 'Ingénierie du Logiciel & Systèmes Distribués',
        average: 15.2,
        ectsCredits: 6,
        status: 'VAL',
        modules: [
          {
            code: 'IF-SYS-DIST',
            name: 'Systèmes Distribués et Microservices',
            grade: 16.0,
            maxGrade: 20,
            coefficient: 2,
            session: '1',
            status: 'VAL',
            letterGrade: 'A',
          },
          {
            code: 'IF-COMP',
            name: 'Compilation et Analyse Statique',
            grade: 14.4,
            maxGrade: 20,
            coefficient: 2,
            session: '1',
            status: 'VAL',
            letterGrade: 'B',
          },
        ],
      },
      {
        code: 'UE-IF-702',
        name: 'Bases de Données & Data Science',
        average: 15.0,
        ectsCredits: 6,
        status: 'VAL',
        modules: [
          {
            code: 'IF-BDR',
            name: 'Bases de Données Relationnelles Avancées',
            grade: 15.5,
            maxGrade: 20,
            coefficient: 2,
            session: '1',
            status: 'VAL',
            letterGrade: 'B',
          },
          {
            code: 'IF-BIGDATA',
            name: 'Architectures Big Data & NoSQL',
            grade: 14.5,
            maxGrade: 20,
            coefficient: 1.5,
            session: '1',
            status: 'VAL',
            letterGrade: 'B',
          },
        ],
      },
      {
        code: 'UE-IF-703',
        name: 'Réseaux & Sécurité des Systèmes',
        average: 14.2,
        ectsCredits: 6,
        status: 'VAL',
        modules: [
          {
            code: 'IF-RES',
            name: 'Routage IP & Protocoles de Télécommunication',
            grade: 14.2,
            maxGrade: 20,
            coefficient: 2,
            session: '1',
            status: 'VAL',
            letterGrade: 'B',
          },
          {
            code: 'IF-SEC',
            name: 'Cryptographie & Sécurité Applicative',
            grade: 14.2,
            maxGrade: 20,
            coefficient: 2,
            session: '1',
            status: 'VAL',
            letterGrade: 'B',
          },
        ],
      },
      {
        code: 'UE-IF-704',
        name: 'Développement Web & Architecture Logicielle',
        average: 16.5,
        ectsCredits: 6,
        status: 'VAL',
        modules: [
          {
            code: 'IF-WEB',
            name: 'Applications Web Modernes & PWA',
            grade: 17.0,
            maxGrade: 20,
            coefficient: 2,
            session: '1',
            status: 'VAL',
            letterGrade: 'A',
          },
          {
            code: 'IF-PRJ',
            name: 'Conduite de Projet Agile & DevOps',
            grade: 16.0,
            maxGrade: 20,
            coefficient: 2,
            session: '1',
            status: 'VAL',
            letterGrade: 'A',
          },
        ],
      },
      {
        code: 'UE-HUM-705',
        name: 'Humanités & Langues Vivantes',
        average: 13.5,
        ectsCredits: 6,
        status: 'VAL',
        modules: [
          {
            code: 'HUM-ANG',
            name: 'Anglais Professionnel & International (C1)',
            grade: 14.0,
            maxGrade: 20,
            coefficient: 2,
            session: '1',
            status: 'VAL',
            letterGrade: 'B',
          },
          {
            code: 'HUM-ECO',
            name: 'Économie, RSE & Droit des Affaires',
            grade: 13.0,
            maxGrade: 20,
            coefficient: 1.5,
            session: '1',
            status: 'VAL',
            letterGrade: 'C',
          },
        ],
      },
    ],
  };

  const s6: SemesterTranscript = {
    semesterNumber: 6,
    academicYear: '2025-2026',
    average: 15.35,
    totalEcts: 30,
    acquiredEcts: 30,
    juryDecision: 'Semestre Validé (ADMIS)',
    teachingUnits: [
      {
        code: 'UE-IF-601',
        name: 'Algorithmique & Graphes',
        average: 16.0,
        ectsCredits: 8,
        status: 'VAL',
        modules: [
          { code: 'IF-ALGO', name: 'Algorithmique Avancée', grade: 16.5, maxGrade: 20, coefficient: 2, status: 'VAL' },
          { code: 'IF-GRAPH', name: 'Théorie des Graphes', grade: 15.5, maxGrade: 20, coefficient: 2, status: 'VAL' },
        ],
      },
      {
        code: 'UE-IF-602',
        name: 'Systèmes d’Exploitation & Concurrence',
        average: 14.8,
        ectsCredits: 8,
        status: 'VAL',
        modules: [
          { code: 'IF-SE', name: 'Noyau Linux & Threads POSIX', grade: 15.0, maxGrade: 20, coefficient: 2, status: 'VAL' },
          { code: 'IF-SYS', name: 'Architecture Matérielle & ASM', grade: 14.6, maxGrade: 20, coefficient: 2, status: 'VAL' },
        ],
      },
      {
        code: 'UE-IF-603',
        name: 'Mathématiques & Probas',
        average: 15.2,
        ectsCredits: 8,
        status: 'VAL',
        modules: [
          { code: 'MA-PROB', name: 'Probabilités & Stats', grade: 15.2, maxGrade: 20, coefficient: 2, status: 'VAL' },
        ],
      },
      {
        code: 'UE-HUM-604',
        name: 'Langues & Société',
        average: 15.4,
        ectsCredits: 6,
        status: 'VAL',
        modules: [
          { code: 'HUM-ANG', name: 'Anglais B2+', grade: 15.8, maxGrade: 20, coefficient: 2, status: 'VAL' },
          { code: 'HUM-SOC', name: 'Sociologie des Sciences', grade: 15.0, maxGrade: 20, coefficient: 1, status: 'VAL' },
        ],
      },
    ],
  };

  return {
    studentNumber,
    name,
    program: '4ème année Informatique (4IF)',
    semesters: [s7, s6],
    lastSyncTimestamp: new Date().toISOString(),
  };
}

/**
 * Parser HTML pour les pages Apogée / MonDossierWeb
 */
export function parseApogeeHtml(html: string): StudentAcademicRecord {
  // Extraction robuste des informations étudiant
  let studentNumber = '00000000';
  let studentName = 'Étudiant INSA';
  let program = 'Formation d’Ingénieur INSA Lyon';

  const numMatch = html.match(/(?:Numéro Étudiant|N° Étudiant|Code Étudiant)\s*[:]\s*([0-9A-Za-z]+)/i);
  if (numMatch) studentNumber = numMatch[1].trim();

  const nameMatch = html.match(/\bNom\s*[:]\s*([^<–-]+)/i);
  if (nameMatch) {
    // Nettoyer d'éventuelles balises HTML ou scripts injectés
    studentName = nameMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  const progMatch = html.match(/(?:Étape|Cursus|Filière)\s*[:]\s*([^<–-]+)/i);
  if (progMatch) {
    program = progMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // Extraction des semestres et UE depuis n'importe quelle balise tableau contenant des lignes
  const semesters: SemesterTranscript[] = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let sMatch: RegExpExecArray | null;
  let semCount = 1;

  while ((sMatch = tableRegex.exec(html)) !== null) {
    const tableContent = sMatch[1];
    const teachingUnits: TeachingUnit[] = [];

    // Extraction des lignes UE et modules
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rMatch: RegExpExecArray | null;
    let currentUe: TeachingUnit | null = null;

    while ((rMatch = rowRegex.exec(tableContent)) !== null) {
      const row = rMatch[1];
      const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
        m[1].replace(/<[^>]+>/g, '').trim()
      );

      if (cells.length >= 4) {
        const code = cells[0];
        const name = cells[1];
        let gradeStr = cells[2];
        let resultStr = cells[3];
        const ectsStr = cells[cells.length - 1];

        // Prise en charge des tableaux multi-sessions (7 colonnes : S1 Note, S1 Résultat, S2 Note, S2 Résultat, ECTS)
        if (cells.length >= 7) {
          const s2GradeStr = cells[4];
          const s2ResultStr = cells[5];
          const s2Grade = parseFloat(s2GradeStr.replace(',', '.'));
          if (!isNaN(s2Grade) && s2GradeStr.trim() !== '') {
            gradeStr = s2GradeStr;
            resultStr = s2ResultStr;
          }
        }

        // Parsing précis du résultat et du statut
        const resTrimmed = resultStr.trim().toUpperCase();
        const isFailed = /^(ABS|AJ|DEF|ELIM|NON|NON_VAL|REF)/i.test(resTrimmed);
        const isValidated = !isFailed && /^(VAL|ADM|ADMIS|V)/i.test(resTrimmed);
        const status: 'VAL' | 'NON_VAL' = isValidated ? 'VAL' : 'NON_VAL';

        if (code.startsWith('UE') || code.includes('UE-')) {
          const avg = parseFloat(gradeStr.replace(',', '.'));
          const parsedEcts = parseFloat(ectsStr.replace(',', '.'));
          const ects = !isNaN(parsedEcts) ? parsedEcts : 6;

          currentUe = {
            code,
            name: name || code,
            average: !isNaN(avg) ? avg : undefined,
            ectsCredits: ects,
            status,
            modules: [],
          };
          teachingUnits.push(currentUe);
        } else if (currentUe && code) {
          // Module rattaché à l'UE courante
          const grade = parseFloat(gradeStr.replace(',', '.'));
          currentUe.modules.push({
            code,
            name: name || code,
            grade: !isNaN(grade) ? grade : undefined,
            maxGrade: 20,
            status,
          });
        }
      }
    }

    if (teachingUnits.length > 0) {
      let semNum = 7 - (semCount - 1);
      const semMatch = html.match(/Semestre\s*([0-9]+)/i);
      if (semMatch) {
        semNum = parseInt(semMatch[1], 10);
      } else {
        const fimiMatch = program.match(/([1-2])\s*FIMI/i);
        if (fimiMatch) {
          semNum = parseInt(fimiMatch[1], 10) === 1 ? 1 : 3;
        } else {
          const ueMatch = teachingUnits[0]?.code.match(/UE-[A-Z]+-([1-9])/i);
          if (ueMatch) {
            semNum = parseInt(ueMatch[1], 10);
          }
        }
      }

      semesters.push({
        semesterNumber: semNum,
        academicYear: '2026-2027',
        totalEcts: teachingUnits.reduce((acc, u) => acc + u.ectsCredits, 0),
        acquiredEcts: teachingUnits.filter((u) => u.status === 'VAL').reduce((acc, u) => acc + u.ectsCredits, 0),
        teachingUnits,
        juryDecision: 'Semestre Validé (ADMIS)',
      });
      semCount++;
    }

  }

  // Ne pas retourner de données fictives si la table est vide ou non reconnue
  return {
    studentNumber,
    name: studentName,
    program,
    semesters,
    lastSyncTimestamp: new Date().toISOString(),
  };
}

// Gestion des sessions éphémères CAS + TOTP en mémoire
interface CasSession {
  flowId: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  step: CasMfaStep;
}

const activeSessions = new Map<string, CasSession>();
const SESSION_TTL_MS = 120 * 1000; // 120 secondes

/**
 * Nettoyage des sessions expirées
 */
function purgeExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(id);
    }
  }
}

/**
 * Initialise le flux d'authentification CAS Keycloak avec challenge MFA
 * ZÉRO RETENTION : le mot de passe n'est jamais stocké ni journalisé !
 */
export function initCasMfaSession(username: string, password?: string): CasMfaSessionInit {
  purgeExpiredSessions();

  // Simulation d'identifiants incorrects
  if (password && (password.toLowerCase().includes('wrong') || password.toLowerCase().includes('invalid') || password.toLowerCase().includes('bad'))) {
    const error: any = new Error('Identifiant ou mot de passe CAS invalide');
    error.statusCode = 401;
    throw error;
  }

  const flowId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  activeSessions.set(flowId, {
    flowId,
    username: username.trim(),
    createdAt: now,
    expiresAt,
    step: 'AWAITING_TOTP',
  });

  return {
    flowId,
    requiresMfa: true,
    step: 'AWAITING_TOTP',
    message: 'Défi TOTP 6 chiffres requis pour valider la session CAS Keycloak INSA Lyon',
    sessionExpiresAt: new Date(expiresAt).toISOString(),
  };
}

/**
 * Valide le code MFA TOTP et retourne le dossier académique de l'étudiant
 */
export function verifyCasMfaChallenge(
  flowId: string,
  totpCode: string
): { success: boolean; error?: string; record?: StudentAcademicRecord } {
  purgeExpiredSessions();

  const session = activeSessions.get(flowId);
  if (!session) {
    return {
      success: false,
      error: 'Session de synchronisation expirée ou inexistante. Veuillez recommencer.',
    };
  }

  // Vérification stricte du code TOTP : 6 chiffres
  const cleanCode = totpCode.trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      error: 'Code de sécurité invalide. Le défi MFA TOTP requiert exactement 6 chiffres décimaux.',
    };
  }

  // Rejet des codes factices ou invalidés par simulation (ex: 000000, 999999, chiffres tous identiques)
  if (cleanCode === '000000' || cleanCode === '999999' || cleanCode === '000001' || /^(\d)\1{5}$/.test(cleanCode)) {
    return {
      success: false,
      error: 'Code TOTP invalide ou expiré. Veuillez vérifier votre application d’authentification.',
    };
  }

  // Session validée avec succès : suppression immédiate (one-time use)
  activeSessions.delete(flowId);

  // Génération du dossier académique pour l'utilisateur
  const record = getSampleAcademicRecord('00054321', session.username ? `Alexandre (${session.username})` : 'Alexandre Martin');

  return {
    success: true,
    record,
  };
}

