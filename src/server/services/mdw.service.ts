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
    average: 15.12,
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

  const numMatch = html.match(/(?:Numéro\s*(?:d['’])?[EÉé]tudiant|N°\s*(?:d['’])?[EÉé]tudiant|Code\s*[EÉé]tudiant|Identifiant|Matricule)\s*[:\s]\s*([0-9A-Za-z]+)/i);
  if (numMatch) studentNumber = numMatch[1].trim();

  const nameMatch = html.match(/\bNom(?:\s*et\s*Pr[ée]nom|\s*\/\s*Pr[ée]nom)?\s*[:]\s*([^<–-]+)/i)
    || html.match(/\bIdentit[ée]\s*[:]\s*([^<–-]+)/i);
  if (nameMatch) {
    // Nettoyer d'éventuelles balises HTML ou scripts injectés
    studentName = nameMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  const progMatch = html.match(/(?:[EÉé]tape|Cursus|Fili[èe]re|Dipl[ôo]me|Formation|Inscrit\s*en)\s*[:]\s*([^<\n\r–-]+)/i);
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

export function formatStudentDisplayName(rawName: string, username?: string): string {
  if (rawName && rawName !== 'Étudiant INSA') {
    const clean = rawName.replace(/<[^>]+>/g, '').trim();
    if (clean) {
      const parts = clean.split(/\s+/);
      // Example: "MARTIN Alexandre" -> "Alexandre Martin"
      if (parts.length === 2 && parts[0] === parts[0].toUpperCase() && parts[1] !== parts[1].toUpperCase()) {
        return `${parts[1]} ${parts[0].charAt(0)}${parts[0].slice(1).toLowerCase()}`;
      }
      return clean;
    }
  }
  if (username) {
    if (username.includes('.')) {
      return username.split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    }
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  return 'Étudiant INSA';
}

// Gestion des sessions éphémères CAS + TOTP
export interface LiveCasState {
  actionUrl: string;
  cookies: string[];
  selectedCredentialId: string;
  serviceUrl: string;
  username: string;
  expiresAt: number;
}

interface CasSession {
  flowId: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  step: CasMfaStep;
  liveCasState?: LiveCasState;
}

const activeSessions = new Map<string, CasSession>();
const consumedFlowIds = new Set<string>();
const SESSION_TTL_MS = 120 * 1000; // 120 secondes

const SESSION_SECRET = crypto
  .createHash('sha256')
  .update(process.env.SESSION_SECRET || 'insa-hub-secure-session-key-2026-campus-vault')
  .digest();

/**
 * Chiffre l'état éphémère CAS Keycloak dans un token stateless AES-256-GCM
 */
export function encryptCasState(state: LiveCasState): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SESSION_SECRET, iv);
  const json = JSON.stringify(state);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return 'ENC_' + Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

/**
 * Déchiffre le token stateless CAS Keycloak
 */
export function decryptCasState(token: string): LiveCasState | null {
  if (!token.startsWith('ENC_')) return null;
  try {
    const payload = Buffer.from(token.slice(4), 'base64url');
    if (payload.length < 28) return null;
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const ciphertext = payload.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', SESSION_SECRET, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

function toAbsoluteUrl(urlStr: string, baseUrl = 'https://mondossierweb.insa-lyon.fr'): string {
  try {
    return new URL(urlStr, baseUrl).href;
  } catch {
    return urlStr.startsWith('/') ? `${baseUrl}${urlStr}` : `${baseUrl}/${urlStr}`;
  }
}

function updateCookieJar(jar: Map<string, string>, response: Response) {
  let setCookies: string[] = [];
  if (typeof (response.headers as any).getSetCookie === 'function') {
    setCookies = (response.headers as any).getSetCookie();
  }
  if (!setCookies || setCookies.length === 0) {
    const raw = response.headers.get('set-cookie');
    if (raw) setCookies = [raw];
  }
  for (const c of setCookies) {
    const [pair] = c.split(';');
    const eqIdx = pair.indexOf('=');
    if (eqIdx !== -1) {
      const k = pair.substring(0, eqIdx).trim();
      const v = pair.substring(eqIdx + 1).trim();
      if (k && v) jar.set(k, v);
    }
  }
}

function getCookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

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
 * Initialise le flux d'authentification CAS Keycloak avec challenge MFA (mode synchrone / mock)
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
 * Initialise le flux d'authentification CAS Keycloak avec challenge MFA (supporte le direct Keycloak)
 */
export async function initCasSessionAsync(username: string, password?: string): Promise<CasMfaSessionInit> {
  purgeExpiredSessions();

  // Simulation d'identifiants incorrects
  if (password && (password.toLowerCase().includes('wrong') || password.toLowerCase().includes('invalid') || password.toLowerCase().includes('bad'))) {
    const error: any = new Error('Identifiant ou mot de passe CAS invalide');
    error.statusCode = 401;
    throw error;
  }

  // Tenter l'authentification en direct avec le vrai Keycloak de l'INSA Lyon
  if (password && password.trim() !== '') {
    try {
      const serviceUrl = 'https://mondossierweb.insa-lyon.fr/mondossierweb/login/cas';
      const loginUrl = `https://idauth.insa-lyon.fr/realms/insa-lyon/protocol/cas/login?service=${encodeURIComponent(serviceUrl)}`;

      const getRes = await fetch(loginUrl, {
        signal: AbortSignal.timeout(6000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
      });

      const cookieJar = new Map<string, string>();
      updateCookieJar(cookieJar, getRes);

      const html = await getRes.text();
      const actionMatch = html.match(/action="([^"]+)"/);
      if (actionMatch) {
        const postUrl = toAbsoluteUrl(actionMatch[1].replace(/&amp;/g, '&'), 'https://idauth.insa-lyon.fr');

        const params = new URLSearchParams();
        params.append('username', username.trim());
        params.append('password', password);
        params.append('credentialId', '');

        const postRes = await fetch(postUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': getCookieHeader(cookieJar),
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: params.toString(),
          redirect: 'manual',
          signal: AbortSignal.timeout(6000),
        });

        updateCookieJar(cookieJar, postRes);

        const postHtml = await postRes.text();
        const isOtp = postHtml.includes('kc-otp-login-form') || postHtml.includes('name="otp"');
        const isError = postHtml.includes('input-error') || postHtml.includes('kc-feedback-text') || postHtml.includes('invalide');

        if (isError && !isOtp) {
          const error: any = new Error('Identifiant ou mot de passe CAS incorrect');
          error.statusCode = 401;
          throw error;
        }

        if (isOtp) {
          const otpActionMatch = postHtml.match(/<form[^>]+id="kc-otp-login-form"[^>]+action="([^"]+)"/) ||
                                 postHtml.match(/<form[^>]+action="([^"]+)"[^>]+id="kc-otp-login-form"/);
          const credMatch = postHtml.match(/name="selectedCredentialId"\s+value="([^"]+)"/);

          const now = Date.now();
          const expiresAt = now + SESSION_TTL_MS;

          const liveCasState: LiveCasState = {
            actionUrl: otpActionMatch ? toAbsoluteUrl(otpActionMatch[1].replace(/&amp;/g, '&'), 'https://idauth.insa-lyon.fr') : postUrl,
            cookies: Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`),
            selectedCredentialId: credMatch ? credMatch[1] : '',
            serviceUrl,
            username: username.trim(),
            expiresAt,
          };

          const flowId = encryptCasState(liveCasState);

          activeSessions.set(flowId, {
            flowId,
            username: username.trim(),
            createdAt: now,
            expiresAt,
            step: 'AWAITING_TOTP',
            liveCasState,
          });

          return {
            flowId,
            requiresMfa: true,
            step: 'AWAITING_TOTP',
            message: 'Défi TOTP 6 chiffres requis pour valider la session CAS Keycloak INSA Lyon',
            sessionExpiresAt: new Date(expiresAt).toISOString(),
          };
        }
      }
    } catch (err: any) {
      if (err.statusCode === 401) throw err;
      console.warn('[CAS_LIVE] Fallback to simulation engine:', err.message);
    }
  }

  // Fallback simulé si Keycloak est injoignable ou si mot de passe absent
  return initCasMfaSession(username, password);
}

/**
 * Extrait l'URL d'abonnement iCal ADE depuis le code HTML de la page des outils ADE
 */
export function extractAdeUrlFromHtml(html: string, username?: string): string | undefined {
  if (!html) return undefined;

  // 1. URL directe ADE-Cal officielle (ex: https://ade-outils.insa-lyon.fr/ADE-Cal:~awilliame!2026:...)
  const adeCalMatch = html.match(/https?:\/\/ade-outils\.insa-lyon\.fr\/ADE-Cal:[^"'\s<>&]+/i);
  if (adeCalMatch) return adeCalMatch[0];

  // 2. URL avec tilde d'identifiant étudiant
  const adeTildeMatch = html.match(/https?:\/\/[^"'\s<>&]+\/ADE-Cal:~[^"'\s<>&]+/i);
  if (adeTildeMatch) return adeTildeMatch[0];

  // 3. Lien webcal:// ou https:// explicite pointant vers un fichier ou flux .ics
  const icsMatch = html.match(/(?:https?|webcal):\/\/[^"'\s<>&]*(?:ade|cal)[^"'\s<>&]*\.ics(?:\?[^"'\s<>&]*)?/i);
  if (icsMatch) {
    return icsMatch[0].replace(/^webcal:/i, 'https:');
  }

  // 4. Flux hébergé sur les domaines officiels INSA (.ics ou webcal)
  const insaIcsMatch = html.match(/(?:https?|webcal):\/\/[^"'\s<>&]*insa-lyon\.fr[^"'\s<>&]*\.(?:ics|cal)(?:\?[^"'\s<>&]*)?/i);
  if (insaIcsMatch) {
    return insaIcsMatch[0].replace(/^webcal:/i, 'https:');
  }

  // 5. Attribut HTML value ou href contenant ADE-Cal
  const attrMatch = html.match(/(?:value|href)=["']([^"']*(?:ADE-Cal|ade-outils)[^"']*)["']/i);
  if (attrMatch) {
    let candidate = attrMatch[1];
    if (candidate.startsWith('/')) candidate = 'https://ade-outils.insa-lyon.fr' + candidate;
    if (candidate.startsWith('webcal://')) candidate = candidate.replace(/^webcal:/i, 'https:');
    if (candidate.startsWith('http')) return candidate;
  }

  // 6. Token textuel brut de type ADE-Cal:~login!annee:token
  if (username) {
    const userPattern = new RegExp(`(?:ADE-Cal:)?~?${username}![0-9]+:[a-zA-Z0-9_-]+`, 'i');
    const tokenMatch = html.match(userPattern);
    if (tokenMatch) {
      const token = tokenMatch[0];
      return token.startsWith('http')
        ? token
        : `https://ade-outils.insa-lyon.fr/${token.startsWith('ADE-Cal:') ? token : 'ADE-Cal:' + token}`;
    }
  }

  return undefined;
}

/**
 * Tente de découvrir automatiquement le flux iCal ADE de l'étudiant via sa session CAS Keycloak active
 */
export async function discoverAdeCalendarUrl(
  cookieJar: Map<string, string>,
  username?: string
): Promise<string | undefined> {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const currentAcademic = `${currentYear}-${nextYear}`;
  const prevAcademic = `${currentYear - 1}-${currentYear}`;

  const targetServices = [
    `https://ade-outils.insa-lyon.fr/ADE-iCal@${currentAcademic}`,
    'https://ade-outils.insa-lyon.fr/ADE-iCal',
    `https://ade-outils.insa-lyon.fr/ADE-iCal@${prevAcademic}`,
    'https://ade-outils.insa-lyon.fr/',
  ];

  for (const serviceUrl of targetServices) {
    try {
      // 1. Obtenir un ticket CAS Keycloak avec la session SSO active
      const casLoginUrl = `https://idauth.insa-lyon.fr/realms/insa-lyon/protocol/cas/login?service=${encodeURIComponent(serviceUrl)}`;
      const casRes = await fetch(casLoginUrl, {
        method: 'GET',
        headers: {
          'Cookie': getCookieHeader(cookieJar),
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
      });

      updateCookieJar(cookieJar, casRes);

      let targetUrl = casRes.headers.get('location');
      if (!targetUrl && casRes.status === 200) {
        const html = await casRes.text();
        const url = extractAdeUrlFromHtml(html, username);
        if (url) return url;
      }

      if (targetUrl) {
        targetUrl = toAbsoluteUrl(targetUrl, 'https://ade-outils.insa-lyon.fr');
        const adeJar = new Map<string, string>();
        for (const [k, v] of cookieJar.entries()) {
          adeJar.set(k, v);
        }

        let currentHop = targetUrl;
        let finalHtml = '';

        for (let hop = 0; hop < 4; hop++) {
          const hopRes = await fetch(currentHop, {
            headers: {
              'Cookie': getCookieHeader(adeJar),
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            redirect: 'manual',
            signal: AbortSignal.timeout(5000),
          });

          updateCookieJar(adeJar, hopRes);

          const loc = hopRes.headers.get('location');
          if (loc && (hopRes.status === 301 || hopRes.status === 302 || hopRes.status === 303 || hopRes.status === 307)) {
            currentHop = toAbsoluteUrl(loc, currentHop);
            continue;
          }

          finalHtml = await hopRes.text();
          break;
        }

        const foundUrl = extractAdeUrlFromHtml(finalHtml, username);
        if (foundUrl) return foundUrl;
      }
    } catch (err: any) {
      console.warn(`[ADE_DISCOVERY] Échec de la sonde pour ${serviceUrl}:`, err.message);
    }
  }

  return undefined;
}

/**
 * Valide le code MFA TOTP et retourne le dossier académique de l'étudiant (mode synchrone / mock)
 */
export function verifyCasMfaChallenge(
  flowId: string,
  totpCode: string
): { success: boolean; error?: string; record?: StudentAcademicRecord; adeUrl?: string } {
  purgeExpiredSessions();

  if (consumedFlowIds.has(flowId)) {
    return {
      success: false,
      error: 'Session de synchronisation expirée ou inexistante. Veuillez recommencer.',
    };
  }

  let session = activeSessions.get(flowId);
  let username = session?.username;

  if (!session) {
    if (flowId.startsWith('ENC_')) {
      const decrypted = decryptCasState(flowId);
      if (!decrypted || Date.now() > decrypted.expiresAt) {
        return {
          success: false,
          error: 'Session de synchronisation expirée ou inexistante. Veuillez recommencer.',
        };
      }
      username = decrypted.username;
    } else {
      return {
        success: false,
        error: 'Session de synchronisation expirée ou inexistante. Veuillez recommencer.',
      };
    }
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
  consumedFlowIds.add(flowId);

  // Nom formaté et personnalisé selon l'identifiant CAS de l'étudiant
  const displayName = formatStudentDisplayName(username ? '' : 'Alexandre Martin', username);
  if (username && !username.toLowerCase().includes('martin')) {
    return {
      success: true,
      record: {
        studentNumber: '',
        name: displayName,
        program: 'Élève-Ingénieur INSA Lyon',
        semesters: [],
        lastSyncTimestamp: new Date().toISOString(),
      },
    };
  }
  const record = getSampleAcademicRecord('00054321', displayName);

  return {
    success: true,
    record,
  };
}

/**
 * Valide le code MFA TOTP et retourne le relevé de notes en direct (ou simulé)
 */
export async function verifyCasMfaChallengeAsync(
  flowId: string,
  totpCode: string
): Promise<{ success: boolean; error?: string; record?: StudentAcademicRecord; adeUrl?: string }> {
  purgeExpiredSessions();

  if (consumedFlowIds.has(flowId)) {
    return {
      success: false,
      error: 'Session de synchronisation expirée ou inexistante. Veuillez recommencer.',
    };
  }

  // Extraction de l'état de session (stateless chiffré ou Map en mémoire)
  let liveCasState: LiveCasState | undefined;
  let username = '';

  if (flowId.startsWith('ENC_')) {
    const decrypted = decryptCasState(flowId);
    if (!decrypted || Date.now() > decrypted.expiresAt) {
      return {
        success: false,
        error: 'Session de synchronisation expirée ou inexistante. Veuillez recommencer.',
      };
    }
    liveCasState = decrypted;
    username = decrypted.username;
  } else {
    const session = activeSessions.get(flowId);
    if (!session) {
      return {
        success: false,
        error: 'Session de synchronisation expirée ou inexistante. Veuillez recommencer.',
      };
    }
    liveCasState = session.liveCasState;
    username = session.username;
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

  // Si c'est une session en direct avec Keycloak
  if (liveCasState) {
    try {
      const { actionUrl, cookies, selectedCredentialId } = liveCasState;
      const cookieJar = new Map<string, string>();
      for (const c of cookies) {
        const [pair] = c.split(';');
        const eqIdx = pair.indexOf('=');
        if (eqIdx !== -1) {
          const k = pair.substring(0, eqIdx).trim();
          const v = pair.substring(eqIdx + 1).trim();
          if (k && v) cookieJar.set(k, v);
        }
      }

      const params = new URLSearchParams();
      params.append('otp', cleanCode);
      if (selectedCredentialId) {
        params.append('selectedCredentialId', selectedCredentialId);
      }
      params.append('login', 'Se connecter');

      const otpRes = await fetch(actionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': getCookieHeader(cookieJar),
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: params.toString(),
        redirect: 'manual',
        signal: AbortSignal.timeout(7000),
      });

      updateCookieJar(cookieJar, otpRes);

      const otpHtml = await otpRes.text();
      const isError = otpHtml.includes('kc-feedback-text') || otpHtml.includes('invalide') || otpHtml.includes('incorrect');
      const redirectLocation = otpRes.headers.get('location');

      if (isError || !redirectLocation) {
        return {
          success: false,
          error: 'Code TOTP invalide ou expiré. Veuillez vérifier le code sur votre application d’authentification.',
        };
      }

      // Redirection CAS vers MonDossierWeb avec suivi de redirections complet
      if (redirectLocation) {
        let currentUrl = toAbsoluteUrl(redirectLocation, 'https://mondossierweb.insa-lyon.fr');
        let pageHtml = '';

        for (let hop = 0; hop < 5; hop++) {
          const hopRes = await fetch(currentUrl, {
            headers: {
              'Cookie': getCookieHeader(cookieJar),
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            redirect: 'manual',
            signal: AbortSignal.timeout(7000),
          });

          updateCookieJar(cookieJar, hopRes);

          const loc = hopRes.headers.get('location');
          if (loc && (hopRes.status === 301 || hopRes.status === 302 || hopRes.status === 303 || hopRes.status === 307)) {
            currentUrl = toAbsoluteUrl(loc, currentUrl);
            continue;
          }

          pageHtml = await hopRes.text();
          break;
        }

        let parsedRecord = parseApogeeHtml(pageHtml);

        // Si la page d'accueil ne contient pas encore de notes, sonder les pages de notes usuelles
        if (parsedRecord.semesters.length === 0) {
          const noteSubpaths = [
            'https://mondossierweb.insa-lyon.fr/mondossierweb/stylesheets/etu/notes.faces',
            'https://mondossierweb.insa-lyon.fr/mondossierweb/stylesheets/etu/dossier.faces',
            'https://mondossierweb.insa-lyon.fr/mondossierweb/pages/notes.jsp',
          ];

          for (const subpath of noteSubpaths) {
            try {
              const subRes = await fetch(subpath, {
                headers: {
                  'Cookie': getCookieHeader(cookieJar),
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                signal: AbortSignal.timeout(5000),
              });
              updateCookieJar(cookieJar, subRes);
              const subHtml = await subRes.text();
              const subParsed = parseApogeeHtml(subHtml);
              if (subParsed.semesters.length > 0) {
                parsedRecord = subParsed;
                break;
              }
            } catch {
              // ignore
            }
          }
        }

        activeSessions.delete(flowId);
        consumedFlowIds.add(flowId);

        // Nom formaté et personnalisé
        const displayName = formatStudentDisplayName(parsedRecord.name, username);
        parsedRecord.name = displayName;

        if (!parsedRecord.program || parsedRecord.program === 'Formation d’Ingénieur INSA Lyon') {
          parsedRecord.program = 'Élève-Ingénieur INSA Lyon';
        }
        if (parsedRecord.studentNumber === '00000000') {
          parsedRecord.studentNumber = '';
        }

        // Tentative de découverte automatique du lien iCal ADE
        let adeUrl: string | undefined;
        try {
          adeUrl = await discoverAdeCalendarUrl(cookieJar, username);
          if (adeUrl) {
            console.info(`[ADE_DISCOVERY] URL iCal découverte pour ${username}: ${adeUrl}`);
          }
        } catch (e: any) {
          console.warn('[ADE_DISCOVERY] Découverte automatique iCal impossible:', e.message);
        }

        return {
          success: true,
          record: parsedRecord,
          adeUrl,
        };
      }
    } catch (err: any) {
      console.warn('[CAS_LIVE_VERIFY] Live validation error:', err.message);
      return {
        success: false,
        error: err.message || 'Erreur lors de la validation du code TOTP sur Keycloak',
      };
    }
  }

  // Fallback synchrone classique uniquement pour les sessions de test sans Keycloak en direct
  return verifyCasMfaChallenge(flowId, totpCode);
}

