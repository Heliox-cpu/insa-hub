import http from 'node:http';
import { createApp } from '../src/server/app.js';
import { sanitizeData, sanitizeUrl } from '../src/server/utils/sanitize.utils.js';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, category: string, passed: boolean, details: string) {
  results.push({ name, category, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${category}] ${name} - ${details}`);
}

async function runAdversarialHarness() {
  console.log('================================================================');
  console.log('EMPIRICAL ADVERSARIAL STRESS TEST HARNESS (CHALLENGER 1 - M1)');
  console.log('================================================================\n');

  // Intercept logs for analysis
  const stdoutLogs: string[] = [];
  const stderrLogs: string[] = [];
  const origLog = console.log;
  const origErr = console.error;

  console.log = (...args: unknown[]) => {
    stdoutLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    origLog.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    stderrLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
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
  console.log(`Server listening on ${baseUrl} for stress testing.\n`);

  // SECTION 1: Health & Skeleton Routes
  console.log('--- SECTION 1: Health & Skeleton Route Verification ---');
  const skeletonEndpoints = [
    { path: '/api/health', expectedService: 'insa-campus-api' },
    { path: '/api/ade', expectedService: 'ade' },
    { path: '/api/menus', expectedService: 'dining' },
    { path: '/api/dining', expectedService: 'dining' },
    { path: '/api/va', expectedService: 'va' },
    { path: '/api/mdw', expectedService: 'mdw' },
  ];

  for (const ep of skeletonEndpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep.path}`);
      const is200 = res.status === 200;
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      const body = await res.json() as Record<string, unknown>;
      const hasService = body.service === ep.expectedService;
      const hasOk = body.status === 'ok';

      record(
        `GET ${ep.path}`,
        'SKELETON_ROUTES',
        is200 && isJson && hasService && hasOk,
        `Status: ${res.status}, Type: ${res.headers.get('content-type')}, Service: ${body.service}, StatusField: ${body.status}`
      );
    } catch (e: any) {
      record(`GET ${ep.path}`, 'SKELETON_ROUTES', false, `Network error: ${e.message}`);
    }
  }

  // SECTION 2: 404 Route Isolation (JSON vs HTML SPA fallthrough)
  console.log('\n--- SECTION 2: 404 Route Isolation (JSON vs HTML SPA Fallthrough) ---');
  const invalidApiPaths = [
    '/api/nonexistent',
    '/api/nonexistent/nested/route/deep',
    '/api/health/invalid-sub-path',
    '/api/ade/undefined-endpoint-xyz',
    '/api/menus/bad_id_123',
    '/api/va/fake-event-9999',
    '/api/mdw/forbidden-admin-action',
    '/api',
    '/api/',
    '/api/..%2fpackage.json',
  ];

  for (const invalidPath of invalidApiPaths) {
    try {
      const res = await fetch(`${baseUrl}${invalidPath}`);
      const is404 = res.status === 404;
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const text = await res.text();
      const hasHtmlDoctype = /<!doctype html>/i.test(text);
      const hasHtmlTag = /<html/i.test(text);

      record(
        `GET ${invalidPath}`,
        '404_ISOLATION',
        is404 && isJson && !hasHtmlDoctype && !hasHtmlTag,
        `Status: ${res.status}, isJson: ${isJson}, hasHtml: ${hasHtmlDoctype || hasHtmlTag}`
      );
    } catch (e: any) {
      record(`GET ${invalidPath}`, '404_ISOLATION', false, `Error: ${e.message}`);
    }
  }

  // Check SPA fallback for non-API routes
  try {
    const spaRes = await fetch(`${baseUrl}/dashboard`);
    const spaText = await spaRes.text();
    const spaIs200 = spaRes.status === 200;
    const spaIsHtml = (spaRes.headers.get('content-type') || '').includes('text/html');
    record(
      'GET /dashboard (SPA Fallback)',
      'SPA_FALLTHROUGH',
      spaIs200 && spaIsHtml && spaText.includes('<html'),
      `Status: ${spaRes.status}, isHtml: ${spaIsHtml}`
    );
  } catch (e: any) {
    record('GET /dashboard (SPA Fallback)', 'SPA_FALLTHROUGH', false, `Error: ${e.message}`);
  }

  // SECTION 3: CORS Headers Under Adversarial Origins
  console.log('\n--- SECTION 3: CORS Headers Verification ---');
  const originsToTest = [
    { origin: 'http://localhost:5173', name: 'Vite Dev Server' },
    { origin: 'https://insa-lyon.fr', name: 'Official INSA domain' },
    { origin: 'http://127.0.0.1:3000', name: 'Localhost IP' },
    { origin: 'https://external-attacker.com', name: 'Untrusted External Origin' },
  ];

  for (const { origin, name } of originsToTest) {
    try {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: origin },
      });
      const acao = res.headers.get('access-control-allow-origin');
      const acac = res.headers.get('access-control-allow-credentials');

      record(
        `CORS GET with Origin: ${origin} (${name})`,
        'CORS_HEADERS',
        acao === origin && acac === 'true',
        `Allow-Origin: ${acao}, Allow-Credentials: ${acac}`
      );
    } catch (e: any) {
      record(`CORS GET ${origin}`, 'CORS_HEADERS', false, `Error: ${e.message}`);
    }
  }

  // Preflight OPTIONS test
  try {
    const preflightRes = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });
    const acao = preflightRes.headers.get('access-control-allow-origin');
    const acam = preflightRes.headers.get('access-control-allow-methods');
    const isPreflightOk = (preflightRes.status === 204 || preflightRes.status === 200) &&
      acao === 'http://localhost:5173' &&
      !!acam;

    record(
      'OPTIONS Preflight /api/health',
      'CORS_PREFLIGHT',
      isPreflightOk,
      `Status: ${preflightRes.status}, Methods: ${acam}, Origin: ${acao}`
    );
  } catch (e: any) {
    record('OPTIONS Preflight /api/health', 'CORS_PREFLIGHT', false, `Error: ${e.message}`);
  }

  // Request WITHOUT Origin header
  try {
    const noOriginRes = await fetch(`${baseUrl}/api/health`);
    const acao = noOriginRes.headers.get('access-control-allow-origin');
    record(
      'GET /api/health without Origin header',
      'CORS_NO_ORIGIN',
      acao === null,
      `Access-Control-Allow-Origin is absent: ${acao === null}`
    );
  } catch (e: any) {
    record('GET /api/health without Origin', 'CORS_NO_ORIGIN', false, `Error: ${e.message}`);
  }

  // SECTION 4: Sensitive Data Sanitization & Leakage Checks
  console.log('\n--- SECTION 4: Sensitive Data Sanitization & Leakage Checks ---');
  const sensitiveFields = [
    { field: 'password', value: 'SUPER_SECRET_PASSWORD_123' },
    { field: 'pwd', value: 'SECRET_PWD_456' },
    { field: 'secret', value: 'ULTRA_SECRET_TOKEN_KEY' },
    { field: 'token', value: 'JWT_ACCESS_TOKEN_ABCXYZ' },
    { field: 'totp', value: '876543' },
    { field: 'otp', value: '654321' },
    { field: 'mfa', value: 'MFA_CHALLENGE_CODE' },
    { field: 'cookie', value: 'SESSION_COOKIE_VALUE' },
    { field: 'castgc', value: 'TGT-12345678-CAS-INSA' },
    { field: 'jsessionid', value: 'JSESS-NODE-7890' },
  ];

  // Test 4.1: Query parameter leakage in 404 response payload
  const queryString = sensitiveFields.map(s => `${s.field}=${encodeURIComponent(s.value)}`).join('&');
  try {
    const leak404Res = await fetch(`${baseUrl}/api/nonexistent?${queryString}`);
    const leak404Body = await leak404Res.text();

    for (const { field, value } of sensitiveFields) {
      const leaked = leak404Body.includes(value);
      record(
        `404 payload sanitization for ${field}`,
        'DATA_SANITIZATION_404',
        !leaked,
        leaked ? `LEAK DETECTED: found raw ${value} in 404 response!` : `Sanitized cleanly to [REDACTED]`
      );
    }
  } catch (e: any) {
    record('404 payload query string test', 'DATA_SANITIZATION_404', false, `Error: ${e.message}`);
  }

  // Test 4.2: Query parameter leakage in stdout logger
  const preLogCount = stdoutLogs.length;
  try {
    await fetch(`${baseUrl}/api/health?${queryString}&safeParam=safeValue123`);
    await new Promise(r => setTimeout(r, 100)); // wait for res.on('finish')

    const newLogs = stdoutLogs.slice(preLogCount).join('\n');
    for (const { field, value } of sensitiveFields) {
      const leaked = newLogs.includes(value);
      record(
        `Server stdout logger sanitization for ${field}`,
        'DATA_SANITIZATION_LOGS',
        !leaked,
        leaked ? `LEAK DETECTED: found raw ${value} in stdout logs!` : `Redacted in log output`
      );
    }
    const safePreserved = newLogs.includes('safeParam=safeValue123');
    record(
      'Server stdout logger preserves harmless query params',
      'DATA_SANITIZATION_LOGS',
      safePreserved,
      `Safe param preserved: ${safePreserved}`
    );
  } catch (e: any) {
    record('Logger query string test', 'DATA_SANITIZATION_LOGS', false, `Error: ${e.message}`);
  }

  // Test 4.3: ADE URL Token Secret Redaction
  const adeSecretToken = 'SECRET_ADE_TOKEN_XYZ987';
  const adeUrlParam = encodeURIComponent(`https://ade-outils.insa-lyon.fr/ADE-Cal:~student01!2025:${adeSecretToken}`);
  const adeLogStart = stdoutLogs.length;
  try {
    const adeRes = await fetch(`${baseUrl}/api/ade?url=${adeUrlParam}`);
    await new Promise(r => setTimeout(r, 100));
    const adeLogs = stdoutLogs.slice(adeLogStart).join('\n');
    const adeLeakedInLogs = adeLogs.includes(adeSecretToken);

    record(
      'ADE Calendar Secret Token in Query Param Log Sanitization',
      'ADE_TOKEN_SANITIZATION',
      !adeLeakedInLogs,
      adeLeakedInLogs ? 'LEAK DETECTED in stdout logs!' : 'ADE token successfully redacted to [REDACTED]'
    );
  } catch (e: any) {
    record('ADE calendar secret test', 'ADE_TOKEN_SANITIZATION', false, `Error: ${e.message}`);
  }

  // Test 4.4: POST Body with sensitive fields on error
  try {
    const errorRes = await fetch(`${baseUrl}/api/health?password=ERROR_LEAK_TEST`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"broken_json":',
    });
    const errorBody = await errorRes.text();
    const leakedInBody = errorBody.includes('ERROR_LEAK_TEST');
    record(
      'Malformed JSON error response does not leak query password',
      'ERROR_HANDLER_SANITIZATION',
      errorRes.status === 400 && !leakedInBody,
      `Status: ${errorRes.status}, Leaked: ${leakedInBody}`
    );
  } catch (e: any) {
    record('Malformed JSON test', 'ERROR_HANDLER_SANITIZATION', false, `Error: ${e.message}`);
  }

  // SECTION 5: Adversarial Boundary & Stress Cases
  console.log('\n--- SECTION 5: Adversarial Boundary & Stress Cases ---');

  // Test 5.1: Payload size limit (>1MB)
  try {
    const largeString = 'X'.repeat(1024 * 1024 + 500);
    const largeRes = await fetch(`${baseUrl}/api/mdw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ large: largeString }),
    });
    record(
      'Oversized JSON payload rejection (>1MB)',
      'PAYLOAD_LIMITS',
      largeRes.status === 413,
      `Status: ${largeRes.status} (expected 413)`
    );
  } catch (e: any) {
    record('Oversized payload test', 'PAYLOAD_LIMITS', false, `Error: ${e.message}`);
  }

  // Test 5.2: HTTP Verb Tampering
  const tamperVerbs = ['POST', 'PUT', 'DELETE', 'PATCH'];
  for (const verb of tamperVerbs) {
    try {
      const res = await fetch(`${baseUrl}/api/health`, { method: verb });
      const is404 = res.status === 404;
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      record(
        `Verb Tampering ${verb} /api/health`,
        'VERB_TAMPERING',
        is404 && isJson,
        `Status: ${res.status}, isJson: ${isJson}`
      );
    } catch (e: any) {
      record(`Verb Tampering ${verb}`, 'VERB_TAMPERING', false, `Error: ${e.message}`);
    }
  }

  // Test 5.3: Prototype Pollution attempt in body
  try {
    const protoPayload = '{"__proto__": {"pollutedKey": "PWNED"}, "constructor": {"prototype": {"adminFlag": true}}}';
    await fetch(`${baseUrl}/api/mdw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: protoPayload,
    });
    const isPolluted = ({} as any).pollutedKey !== undefined || ({} as any).adminFlag !== undefined;
    record(
      'Prototype Pollution protection',
      'PROTOTYPE_POLLUTION',
      !isPolluted,
      `Global object polluted: ${isPolluted}`
    );
  } catch (e: any) {
    record('Prototype pollution test', 'PROTOTYPE_POLLUTION', false, `Error: ${e.message}`);
  }

  // SECTION 6: Deep Adversarial Edge Cases & Boundaries
  console.log('\n--- SECTION 6: Deep Adversarial Edge Cases & Security Boundaries ---');

  // Test 6.1: Malformed URI catch-block leak behavior
  const rawPath = 'http://[invalid]/api/nonexistent?password=LEAKED_VIA_MALFORMED_URL';
  await new Promise<void>((resolve) => {
    const rawReq = http.request(
      {
        host: '127.0.0.1',
        port,
        path: rawPath,
        method: 'GET',
      },
      (rawRes) => {
        let rawData = '';
        rawRes.on('data', chunk => rawData += chunk);
        rawRes.on('end', () => {
          const leakedIn404 = rawData.includes('LEAKED_VIA_MALFORMED_URL');
          // We document whether it leaked or was sanitized
          record(
            'Malformed URL fallback sanitization (catch block in sanitizeUrl)',
            'DEEP_ADVERSARIAL_EDGE_CASE',
            !leakedIn404,
            leakedIn404
              ? 'WARNING: Catch block in sanitizeUrl returned unredacted URL upon WHATWG parser throw!'
              : 'Safely sanitized'
          );
          resolve();
        });
      }
    );
    rawReq.on('error', () => resolve());
    rawReq.end();
  });

  // Test 6.2: CAS service ticket in query string
  const casTicketUrl = '/api/mdw/auth?ticket=ST-12345678-CAS-SERVICE-TICKET';
  const cleanCas = sanitizeUrl(casTicketUrl);
  const casTicketRedacted = !cleanCas.includes('ST-12345678');
  record(
    'CAS service ticket query parameter masking',
    'CAS_TICKET_SANITIZATION',
    casTicketRedacted,
    casTicketRedacted
      ? 'CAS ticket masked'
      : 'NOTE: CAS ticket ST-12345678 not masked (pattern /ticket/ not in SENSITIVE_KEY_PATTERNS yet)'
  );

  // Test 6.3: Permissive CORS Origin Reflection Check
  const evilOrigin = 'https://malicious-attacker-site.com';
  const evilRes = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: evilOrigin },
  });
  const evilAcao = evilRes.headers.get('access-control-allow-origin');
  const evilAcac = evilRes.headers.get('access-control-allow-credentials');
  const allowsUntrustedOriginWithCredentials = evilAcao === evilOrigin && evilAcac === 'true';
  record(
    'Permissive CORS with credentials reflection policy',
    'CORS_SECURITY_POLICY',
    !allowsUntrustedOriginWithCredentials,
    allowsUntrustedOriginWithCredentials
      ? 'SECURITY NOTE: Reflects arbitrary Origin with Allow-Credentials: true (Dev mode default)'
      : 'CORS origin properly restricted'
  );

  // Clean up
  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log('\nTest server shut down cleanly.\n');

  // Summary
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS TEST SUMMARY');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Checks: ${total}`);
  console.log(`Passed:       ${passed}`);
  console.log(`Failed:       ${failed}`);
  console.log(`Pass Rate:    ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFAILED CHECKS:');
    for (const f of results.filter(r => !r.passed)) {
      console.log(`- [${f.category}] ${f.name}: ${f.details}`);
    }
    process.exit(1);
  } else {
    console.log('\nALL EMPIRICAL ADVERSARIAL CHECKS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

runAdversarialHarness().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
