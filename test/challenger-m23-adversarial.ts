import http from 'node:http';
import { createApp } from '../src/server/app.js';
import {
  parseApogeeHtml,
  initCasMfaSession,
  verifyCasMfaChallenge,
  getSampleAcademicRecord,
} from '../src/server/services/mdw.service.js';
import { sanitizeData, sanitizeUrl } from '../src/server/utils/sanitize.utils.js';

interface AdversarialCheck {
  id: string;
  name: string;
  category: 'SCRAPER' | 'CAS_MFA' | 'CREDENTIAL_LEAKAGE' | 'API_SECURITY';
  passed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  observation: string;
  expected: string;
  actual: string;
}

const checks: AdversarialCheck[] = [];

function recordCheck(check: AdversarialCheck) {
  checks.push(check);
  const icon = check.passed ? '✅ [PASS]' : `❌ [FAIL - ${check.severity}]`;
  console.log(`${icon} (${check.category}) ${check.id}: ${check.name}`);
  console.log(`   Expected:    ${check.expected}`);
  console.log(`   Actual:      ${check.actual}`);
  console.log(`   Observation: ${check.observation}\n`);
}

async function runM23AdversarialStressSuite() {
  console.log('================================================================');
  console.log('CHALLENGER 2: EMPIRICAL ADVERSARIAL STRESS TEST FOR M2/M3');
  console.log('MonDossierWeb Apogée Scraper & Interactive CAS/MFA Session Engine');
  console.log('================================================================\n');

  // Intercept logs to verify credential leaks
  const capturedStdout: string[] = [];
  const capturedStderr: string[] = [];
  const origLog = console.log;
  const origErr = console.error;

  console.log = (...args: unknown[]) => {
    capturedStdout.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    origLog.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    capturedStderr.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    origErr.apply(console, args);
  };

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as { port: number };
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral test server running at ${baseUrl}\n`);

  // =================================================================
  // CATEGORY 1: APOGÉE HTML SCRAPER STRESS TESTING
  // =================================================================
  console.log('>>> CATEGORY 1: APOGÉE HTML SCRAPER STRESS TESTING <<<\n');

  // Test 1.1: Missing Grades (empty cells, whitespace, '-')
  {
    const htmlMissingGrades = `
      <html>
        <body>
          <div class="identite">Numéro Étudiant : 00012345 - Nom : DUPONT Jean - Filière : 3IF</div>
          <table class="notesTable">
            <tr>
              <td>UE-IF-301</td>
              <td>Algorithmique & Programmation</td>
              <td> </td>
              <td>EN_COURS</td>
              <td>6</td>
            </tr>
            <tr>
              <td>IF-ALGO</td>
              <td>Algorithmes Fondamentaux</td>
              <td>-</td>
              <td>EN_COURS</td>
              <td></td>
            </tr>
            <tr>
              <td>IF-PROG</td>
              <td>Langage C</td>
              <td>&nbsp;</td>
              <td>EN_COURS</td>
              <td></td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const record = parseApogeeHtml(htmlMissingGrades);
    const ue = record.semesters[0]?.teachingUnits[0];
    const mod1 = ue?.modules[0];
    const mod2 = ue?.modules[1];

    const ueGradeIsUndefined = ue?.average === undefined;
    const mod1GradeIsUndefined = mod1?.grade === undefined;
    const mod2GradeIsUndefined = mod2?.grade === undefined;
    const noNaN = !Number.isNaN(ue?.average) && !Number.isNaN(mod1?.grade) && !Number.isNaN(mod2?.grade);

    recordCheck({
      id: 'SCRAPER-01',
      name: 'Missing grades (empty, dash, &nbsp;) parsed without NaN',
      category: 'SCRAPER',
      passed: ueGradeIsUndefined && mod1GradeIsUndefined && mod2GradeIsUndefined && noNaN,
      severity: 'HIGH',
      expected: 'Average and module grades should be undefined, never NaN',
      actual: `UE avg: ${ue?.average}, Mod1: ${mod1?.grade}, Mod2: ${mod2?.grade}`,
      observation: `Missing grades are safely represented as undefined without NaN crashing numerical displays.`,
    });
  }

  // Test 1.2: Non-numeric grades ('ABS', 'DEF', 'AJ') and Status Validation Bug
  {
    const htmlAbsentStudent = `
      <html>
        <body>
          <div class="identite">Numéro Étudiant : 00099999 - Nom : DURAND Paul - Filière : 3IF</div>
          <table class="notesTable">
            <tr>
              <td>UE-IF-302</td>
              <td>Architecture & Noyau</td>
              <td>ABS</td>
              <td>ABS</td>
              <td>6</td>
            </tr>
            <tr>
              <td>IF-ARCHI</td>
              <td>Processeurs et ASM</td>
              <td>ABS</td>
              <td>ABS</td>
              <td></td>
            </tr>
            <tr>
              <td>UE-IF-303</td>
              <td>Mathématiques Appliquées</td>
              <td>07.5</td>
              <td>AJ</td>
              <td>6</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const record = parseApogeeHtml(htmlAbsentStudent);
    const ueAbs = record.semesters[0]?.teachingUnits.find(u => u.code === 'UE-IF-302');
    const ueAj = record.semesters[0]?.teachingUnits.find(u => u.code === 'UE-IF-303');
    const acquiredEcts = record.semesters[0]?.acquiredEcts;

    // In parseApogeeHtml: status: resultStr.includes('NON') ? 'NON_VAL' : 'VAL'
    // For 'ABS': 'ABS'.includes('NON') === false -> status becomes 'VAL'!
    // For 'AJ':  'AJ'.includes('NON') === false  -> status becomes 'VAL'!
    const isAbsIncorrectlyValidated = ueAbs?.status === 'VAL';
    const isAjIncorrectlyValidated = ueAj?.status === 'VAL';
    const areEctsFalselyAwarded = acquiredEcts === 12; // Both 6 + 6 ECTS falsely awarded to absent/ajourné student!

    recordCheck({
      id: 'SCRAPER-02',
      name: "Non-numeric grades ('ABS', 'AJ') must NOT be validated as 'VAL' and awarded ECTS",
      category: 'SCRAPER',
      passed: !isAbsIncorrectlyValidated && !isAjIncorrectlyValidated && !areEctsFalselyAwarded,
      severity: 'CRITICAL',
      expected: "UE status should be 'NON_VAL' or 'DEF'/'ABS' and acquired ECTS should be 0",
      actual: `UE-302 status: '${ueAbs?.status}', UE-303 status: '${ueAj?.status}', acquiredEcts: ${acquiredEcts} / 12`,
      observation: `CRITICAL BUG IN APOGÉE PARSER: line 286 checks resultStr.includes('NON') ? 'NON_VAL' : 'VAL'. Since 'ABS' and 'AJ' do not contain 'NON', failed and absent students are marked as VAL and falsely awarded full 12 ECTS credits!`,
    });
  }

  // Test 1.3: UEs with 0 credits (e.g. optional modules or 0 ECTS courses)
  {
    const htmlZeroEcts = `
      <html>
        <body>
          <div class="identite">Numéro Étudiant : 00088888 - Nom : TEST Zero - Filière : 3IF</div>
          <table class="notesTable">
            <tr>
              <td>UE-OPT-000</td>
              <td>Atelier Insertion Professionnelle (Non Crédité)</td>
              <td>16.0</td>
              <td>VAL</td>
              <td>0</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const record = parseApogeeHtml(htmlZeroEcts);
    const ueZero = record.semesters[0]?.teachingUnits[0];

    // In parseApogeeHtml: const ects = parseFloat(ectsStr || '0') || 6;
    // parseFloat('0') is 0. 0 || 6 evaluates to 6!
    const ectsWasInflatedTo6 = ueZero?.ectsCredits === 6;

    recordCheck({
      id: 'SCRAPER-03',
      name: 'UE with 0 ECTS credits must NOT be coerced to 6 ECTS',
      category: 'SCRAPER',
      passed: ueZero?.ectsCredits === 0,
      severity: 'HIGH',
      expected: 'ectsCredits should remain 0',
      actual: `ectsCredits was set to ${ueZero?.ectsCredits}`,
      observation: `BUG IN ECTS EXTRACTION: line 280 uses parseFloat(ectsStr || '0') || 6. Because 0 is falsy in JS, '0 || 6' evaluates to 6, falsely inflating 0-credit non-academic units to 6 credits!`,
    });
  }

  // Test 1.4: Multiple Exam Sessions (Session 1 & Session 2 / Rattrapages)
  {
    // Typical multi-session Apogée layout:
    // Code | Libellé | Note S1 | Rés S1 | Note S2 | Rés S2 | ECTS
    const htmlMultiSession = `
      <html>
        <body>
          <div class="identite">Numéro Étudiant : 00077777 - Nom : MULTI Session - Filière : 4IF</div>
          <table class="notesTable">
            <tr>
              <td>UE-IF-401</td>
              <td>Compilation Avancée</td>
              <td>08.0</td>
              <td>AJ</td>
              <td>14.0</td>
              <td>VAL</td>
              <td>6</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const record = parseApogeeHtml(htmlMultiSession);
    const ueMulti = record.semesters[0]?.teachingUnits[0];

    // The parser assumes [code, name, gradeStr, resultStr, ectsStr] = cells
    // For 7 cells:
    // cells[2] = 08.0 (Session 1 note)
    // cells[3] = AJ (Session 1 result)
    // cells[4] = 14.0 (Session 2 note -> parsed as ectsStr!)
    // cells[5] = VAL
    // cells[6] = 6 (Actual ECTS)
    const ectsMisparsedAsSession2Note = ueMulti?.ectsCredits === 14;

    recordCheck({
      id: 'SCRAPER-04',
      name: 'Apogée multi-session 7-column table layout correctly parses ECTS and Session 2 grades',
      category: 'SCRAPER',
      passed: ueMulti?.ectsCredits === 6 && ueMulti?.average === 14.0,
      severity: 'HIGH',
      expected: 'average: 14.0, ectsCredits: 6',
      actual: `average: ${ueMulti?.average}, ectsCredits: ${ueMulti?.ectsCredits}`,
      observation: `COLUMN OFFSET BUG: With standard 7-column multi-session tables, cells[4] (Session 2 grade: 14.0) is treated as ectsCredits instead of cells[6] (6 ECTS). Result: ECTS is set to 14!`,
    });
  }

  // Test 1.5: Silent fallback to Alexandre Martin dummy data on unparseable table
  {
    const htmlUnparseable = `
      <html>
        <body>
          <div class="identite">Numéro Étudiant : 00011111 - Nom : REEL Pierre - Filière : 1FIMI</div>
          <table class="tableauNotesStandard">
            <tr>
              <td>UE-FIMI-101</td>
              <td>Mathématiques Analyse 1</td>
              <td>11.0</td>
              <td>VAL</td>
              <td>8</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const record = parseApogeeHtml(htmlUnparseable);
    const returnedFakeStudentNumber = record.studentNumber === '00011111';
    const returned4IfProgram = record.program.includes('4IF');
    const returnedFakeSemester = record.semesters.some(s => s.semesterNumber === 7);

    recordCheck({
      id: 'SCRAPER-05',
      name: 'Unparseable table or non-standard class must NOT silently return hardcoded 4IF Alexandre Martin grades',
      category: 'SCRAPER',
      passed: !returned4IfProgram && !returnedFakeSemester,
      severity: 'HIGH',
      expected: 'Should return parsed FIMI data or empty transcript, NOT 4IF Alexandre Martin data',
      actual: `Returned Program: '${record.program}', Semesters: ${record.semesters.map(s => `S${s.semesterNumber}`).join(', ')}`,
      observation: `DATA INTEGRITY FLAW: Line 318 silently returns sample dummy data (getSampleAcademicRecord) for 4IF student Alexandre Martin whenever the table class does not strictly match 'notesTable'! A 1st year FIMI student would see 4th year IF grades!`,
    });
  }

  // Test 1.6: XSS Sanitization in HTML Scraper
  {
    const htmlXss = `
      <html>
        <body>
          <div class="identite">Numéro Étudiant : 00099999 - Nom : <script>alert("PWNED_NAME")</script> - Filière : 3IF</div>
          <table class="notesTable">
            <tr>
              <td>UE-XSS</td>
              <td><b onmouseover="alert('xss')">Module Vulnerable</b></td>
              <td>15.0</td>
              <td>VAL</td>
              <td>6</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const record = parseApogeeHtml(htmlXss);
    const ue = record.semesters[0]?.teachingUnits[0];
    const containsScriptTag = record.name.includes('<script>') || (ue?.name.includes('<b') ?? false);

    recordCheck({
      id: 'SCRAPER-06',
      name: 'HTML Scraper sanitizes embedded script and markup tags in element names',
      category: 'SCRAPER',
      passed: !containsScriptTag,
      severity: 'MEDIUM',
      expected: 'Tags should be stripped from scraped text',
      actual: `Student name: '${record.name}', UE name: '${ue?.name}'`,
      observation: `Tags inside table cells are stripped via regex replace; student name is extracted via regex without executing HTML.`,
    });
  }

  // Test 1.7: Performance under large tables (100 rows stress test)
  {
    let bigTableRows = '';
    for (let i = 1; i <= 100; i++) {
      bigTableRows += `
        <tr>
          <td>UE-TEST-${i}</td>
          <td>Matière d'évaluation ${i}</td>
          <td>${(10 + (i % 10)).toFixed(1)}</td>
          <td>VAL</td>
          <td>3</td>
        </tr>
      `;
    }
    const bigHtml = `<html><body><table class="notesTable">${bigTableRows}</table></body></html>`;

    const startPerf = Date.now();
    const record = parseApogeeHtml(bigHtml);
    const durationMs = Date.now() - startPerf;

    recordCheck({
      id: 'SCRAPER-07',
      name: 'Apogée Scraper handles 100-row table within < 50ms without catastrophic regex backtracking',
      category: 'SCRAPER',
      passed: durationMs < 50 && record.semesters[0]?.teachingUnits.length === 100,
      severity: 'LOW',
      expected: '< 50ms execution time, 100 UEs extracted',
      actual: `${durationMs}ms, ${record.semesters[0]?.teachingUnits.length} UEs`,
      observation: `Regex execution across 100 rows completes fast (${durationMs}ms) without ReDoS.`,
    });
  }

  // =================================================================
  // CATEGORY 2: CAS / MFA FLOW & SESSION ENGINE ADVERSARIAL STRESS
  // =================================================================
  console.log('>>> CATEGORY 2: CAS / MFA FLOW & SESSION ENGINE ADVERSARIAL STRESS <<<\n');

  // Test 2.1: Session init missing username
  {
    const res = await fetch(`${baseUrl}/api/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '   ' }),
    });
    const body = await res.json() as any;

    recordCheck({
      id: 'CAS-01',
      name: 'POST /api/mdw/auth/init rejects blank username with HTTP 400',
      category: 'CAS_MFA',
      passed: res.status === 400 && body.error === 'Bad Request',
      severity: 'MEDIUM',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${res.status}: ${JSON.stringify(body)}`,
      observation: 'Blank or missing username is correctly rejected.',
    });
  }

  // Test 2.2: Simulation of Invalid Password in /api/mdw/auth/init
  {
    const resInvalidPwd = await fetch(`${baseUrl}/api/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'amartin', password: 'wrong_password_123' }),
    });
    const bodyInvalidPwd = await resInvalidPwd.json() as any;

    const resSimFail = await fetch(`${baseUrl}/api/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'amartin', password: 'invalid_password' }),
    });
    const bodySimFail = await resSimFail.json() as any;

    const rejectsBadPassword = resInvalidPwd.status === 401 || resSimFail.status === 401 || resSimFail.status === 400;

    recordCheck({
      id: 'CAS-02',
      name: 'CAS Login simulation supports invalid password simulation/rejection',
      category: 'CAS_MFA',
      passed: rejectsBadPassword,
      severity: 'HIGH',
      expected: 'Should support invalid password rejection or simulation (e.g. 401 Unauthorized)',
      actual: `resInvalidPwd status: ${resInvalidPwd.status}, resSimFail status: ${resSimFail.status}`,
      observation: `MISSING FEATURE: /api/mdw/auth/init completely ignores req.body.password! Any password (even empty or wrong) generates a successful flowId. There is no simulation engine for failed CAS credentials.`,
    });
  }

  // Test 2.3: Verification of Invalid 6-digit TOTP challenge
  {
    const initRes = await fetch(`${baseUrl}/api/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'amartin' }),
    });
    const initData = await initRes.json() as any;
    const flowId = initData.flowId;

    const verifyRes = await fetch(`${baseUrl}/api/mdw/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowId, totpCode: '000000' }),
    });
    const verifyBody = await verifyRes.json() as any;

    const rejectedInvalid6Digit = verifyRes.status === 400 && verifyBody.success === false;

    recordCheck({
      id: 'CAS-03',
      name: 'POST /api/mdw/auth/verify rejects invalid 6-digit TOTP code (e.g. 000000)',
      category: 'CAS_MFA',
      passed: rejectedInvalid6Digit,
      severity: 'CRITICAL',
      expected: 'HTTP 400 Authentication Failed for invalid TOTP codes',
      actual: `HTTP ${verifyRes.status}: success=${verifyBody.success}, step=${verifyBody.step}`,
      observation: `CRITICAL MFA BYPASS: verifyCasMfaChallenge only tests /^d{6}$/.test(totpCode). It treats ANY 6-digit string ('000000', '123456', '999999') as valid and issues the student academic transcript without any TOTP verification or simulation!`,
    });
  }

  // Test 2.4: Non-digit or wrong length TOTP rejection
  {
    const initRes = await fetch(`${baseUrl}/api/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'amartin' }),
    });
    const { flowId } = await initRes.json() as any;

    const invalidCodes = ['123', 'abcdef', '1234567', '12 345'];
    let allRejected = true;

    for (const code of invalidCodes) {
      const res = await fetch(`${baseUrl}/api/mdw/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId, totpCode: code }),
      });
      if (res.status !== 400) allRejected = false;
    }

    recordCheck({
      id: 'CAS-04',
      name: 'POST /api/mdw/auth/verify rejects malformed TOTP (letters, too short, too long)',
      category: 'CAS_MFA',
      passed: allRejected,
      severity: 'MEDIUM',
      expected: 'All malformed TOTP attempts return HTTP 400',
      actual: `All rejected: ${allRejected}`,
      observation: 'Malformed non-6-digit strings are correctly rejected by regex guard.',
    });
  }

  // Test 2.5: Replay attack prevention (One-time use flowId)
  {
    const initRes = await fetch(`${baseUrl}/api/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'amartin' }),
    });
    const { flowId } = await initRes.json() as any;

    const firstRes = await fetch(`${baseUrl}/api/mdw/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowId, totpCode: '123456' }),
    });

    const secondRes = await fetch(`${baseUrl}/api/mdw/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowId, totpCode: '123456' }),
    });

    const isReplayBlocked = firstRes.status === 200 && secondRes.status === 400;

    recordCheck({
      id: 'CAS-05',
      name: 'flowId cannot be replayed (Strict one-time session consumption)',
      category: 'CAS_MFA',
      passed: isReplayBlocked,
      severity: 'HIGH',
      expected: 'Second attempt returns HTTP 400 expired or non-existent session',
      actual: `Attempt 1: ${firstRes.status}, Attempt 2: ${secondRes.status}`,
      observation: 'Session is immediately deleted from memory upon successful completion.',
    });
  }

  // Test 2.6: Expired session tokens (>120s TTL)
  {
    const session = initCasMfaSession('amartin');
    
    const expiresAt = new Date(session.sessionExpiresAt!).getTime();
    const now = Date.now();
    const ttlSeconds = Math.round((expiresAt - now) / 1000);
    const ttlIs120s = ttlSeconds >= 119 && ttlSeconds <= 121;

    const origDateNow = Date.now;
    try {
      Date.now = () => origDateNow() + 121 * 1000;
      const verifyExpired = verifyCasMfaChallenge(session.flowId, '123456');

      recordCheck({
        id: 'CAS-06',
        name: 'Session token expires and is rejected after TTL (>120s)',
        category: 'CAS_MFA',
        passed: ttlIs120s && !verifyExpired.success && (verifyExpired.error?.includes('expirée') ?? false),
        severity: 'CRITICAL',
        expected: 'TTL configured to 120s and session rejected when age > 120s',
        actual: `Configured TTL: ${ttlSeconds}s, Expired verification success: ${verifyExpired.success}`,
        observation: 'Session tokens have a 120s TTL and are purged on expiry.',
      });
    } finally {
      Date.now = origDateNow;
    }
  }

  // Test 2.7: Race Condition / Concurrent TOTP verification
  {
    const initRes = await fetch(`${baseUrl}/api/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'concurrent_user' }),
    });
    const { flowId } = await initRes.json() as any;

    // Fire 5 simultaneous requests with the exact same flowId
    const promises = Array.from({ length: 5 }, () =>
      fetch(`${baseUrl}/api/mdw/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId, totpCode: '123456' }),
      })
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map(r => r.status);
    const successes = statuses.filter(s => s === 200).length;
    const failures = statuses.filter(s => s === 400).length;

    recordCheck({
      id: 'CAS-07',
      name: 'Concurrent verification race condition: exactly 1 succeeds, others 400',
      category: 'CAS_MFA',
      passed: successes === 1 && failures === 4,
      severity: 'HIGH',
      expected: 'Exactly 1 request returns 200, 4 return 400',
      actual: `200 count: ${successes}, 400 count: ${failures}`,
      observation: `Session deletion is atomic in Node event loop, successfully preventing race condition replays.`,
    });
  }

  // =================================================================
  // CATEGORY 3: ZERO CREDENTIAL LEAKAGE ADVERSARIAL AUDIT
  // =================================================================
  console.log('>>> CATEGORY 3: ZERO CREDENTIAL LEAKAGE ADVERSARIAL AUDIT <<<\n');

  // Test 3.1: Password not echoed in POST /api/mdw/auth/init response body
  {
    const secretPassword = 'SUPER_SECRET_STUDENT_PASSWORD_!#99';
    const res = await fetch(`${baseUrl}/api/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'amartin', password: secretPassword }),
    });
    const bodyText = await res.text();
    const leakedInBody = bodyText.includes(secretPassword);

    recordCheck({
      id: 'LEAK-01',
      name: 'Password submitted in POST /api/mdw/auth/init is NOT leaked in HTTP response body',
      category: 'CREDENTIAL_LEAKAGE',
      passed: !leakedInBody,
      severity: 'CRITICAL',
      expected: 'HTTP response body must not contain submitted password',
      actual: `Leaked in response body: ${leakedInBody}`,
      observation: 'Response body contains only flowId and metadata without echoing password.',
    });
  }

  // Test 3.2: Password and TOTP not leaked in Server Logs (stdout / stderr)
  {
    const logStartIdx = capturedStdout.length;
    const errStartIdx = capturedStderr.length;
    const uniquePassword = 'UNLEAKABLE_INSA_PASSWORD_2026';
    const uniqueTotp = '789123';

    const initRes = await fetch(`${baseUrl}/api/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'amartin', password: uniquePassword }),
    });
    const { flowId } = await initRes.json() as any;

    await fetch(`${baseUrl}/api/mdw/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowId, totpCode: uniqueTotp }),
    });

    await new Promise(r => setTimeout(r, 100)); // wait for res.on('finish')

    const logsSince = capturedStdout.slice(logStartIdx).concat(capturedStderr.slice(errStartIdx)).join('\n');
    const pwdLeakedInLogs = logsSince.includes(uniquePassword);
    const totpLeakedInLogs = logsSince.includes(uniqueTotp);

    recordCheck({
      id: 'LEAK-02',
      name: 'Password and TOTP codes are NEVER printed in server stdout/stderr logs',
      category: 'CREDENTIAL_LEAKAGE',
      passed: !pwdLeakedInLogs && !totpLeakedInLogs,
      severity: 'CRITICAL',
      expected: 'Neither password nor TOTP code present in any server log stream',
      actual: `Password in logs: ${pwdLeakedInLogs}, TOTP in logs: ${totpLeakedInLogs}`,
      observation: 'Request bodies are not logged by requestLogger, preventing plaintext credential leaks.',
    });
  }

  // Test 3.3: Sensitive query parameters in MDW routes are sanitized in 404 & error payloads
  {
    const secretQueryPwd = 'LEAK_VIA_MDW_QUERY_PARAM_PWD';
    const secretQueryTotp = '654321';
    const res = await fetch(`${baseUrl}/api/mdw/nonexistent?password=${secretQueryPwd}&totp=${secretQueryTotp}`);
    const bodyText = await res.text();

    const leakedPwd = bodyText.includes(secretQueryPwd);
    const leakedTotp = bodyText.includes(secretQueryTotp);

    recordCheck({
      id: 'LEAK-03',
      name: 'Sensitive credentials in query parameters are redacted in error/404 payloads',
      category: 'CREDENTIAL_LEAKAGE',
      passed: !leakedPwd && !leakedTotp,
      severity: 'CRITICAL',
      expected: 'Path in 404 response payload replaces sensitive values with [REDACTED]',
      actual: `Leaked password: ${leakedPwd}, Leaked TOTP: ${leakedTotp}`,
      observation: 'sanitizeUrl redacts sensitive query parameters in 404 response payloads.',
    });
  }

  // Test 3.4: POST /api/mdw/parse-html with missing or malformed body
  {
    const res = await fetch(`${baseUrl}/api/mdw/parse-html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await res.json() as any;

    recordCheck({
      id: 'API-01',
      name: 'POST /api/mdw/parse-html rejects missing html field with HTTP 400',
      category: 'API_SECURITY',
      passed: res.status === 400 && body.error === 'Bad Request',
      severity: 'MEDIUM',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${res.status}: ${JSON.stringify(body)}`,
      observation: 'Missing HTML parameter in body is rejected with structured 400 error.',
    });
  }

  // Clean up server
  await new Promise<void>((resolve) => server.close(() => resolve()));

  // =================================================================
  // FINAL EVALUATION & SCORING
  // =================================================================
  console.log('================================================================');
  console.log('EMPIRICAL ADVERSARIAL STRESS TEST SUMMARY');
  console.log('================================================================');
  const total = checks.length;
  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed).length;
  const criticalFails = checks.filter(c => !c.passed && c.severity === 'CRITICAL').length;
  const highFails = checks.filter(c => !c.passed && c.severity === 'HIGH').length;

  console.log(`Total Checks Executed:    ${total}`);
  console.log(`Passed:                   ${passed}`);
  console.log(`Failed:                   ${failed}`);
  console.log(`Critical Vulnerabilities: ${criticalFails}`);
  console.log(`High Severity Issues:     ${highFails}`);
  console.log(`Pass Rate:                ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('FAILURES IDENTIFIED:');
    for (const f of checks.filter(c => !c.passed)) {
      console.log(`- [${f.category}] ${f.id} (${f.severity}): ${f.name}`);
      console.log(`  Expected:    ${f.expected}`);
      console.log(`  Actual:      ${f.actual}`);
      console.log(`  Observation: ${f.observation}`);
    }
    console.log('\nVERDICT: REJECT');
    return { verdict: 'REJECT', checks };
  } else {
    console.log('\nVERDICT: APPROVE');
    return { verdict: 'APPROVE', checks };
  }
}

runM23AdversarialStressSuite()
  .then(({ verdict }) => {
    process.exit(verdict === 'APPROVE' ? 0 : 1);
  })
  .catch((err) => {
    console.error('Test harness crashed:', err);
    process.exit(2);
  });
