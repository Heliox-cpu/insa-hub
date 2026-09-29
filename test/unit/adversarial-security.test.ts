import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';
import { sanitizeData, sanitizeUrl } from '../../src/server/utils/sanitize.utils.js';

describe('Adversarial Security & Health Stress Suite', () => {
  const app = createApp();

  describe('1. Health & Skeleton Route Verification', () => {
    const endpoints = [
      { path: '/api/health', service: 'insa-campus-api' },
      { path: '/api/ade', service: 'ade' },
      { path: '/api/menus', service: 'dining' },
      { path: '/api/dining', service: 'dining' },
      { path: '/api/va', service: 'va' },
      { path: '/api/mdw', service: 'mdw' },
    ];

    for (const ep of endpoints) {
      it(`GET ${ep.path} returns 200, application/json, and expected service identifier`, async () => {
        const res = await request(app).get(ep.path);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('service', ep.service);
      });
    }
  });

  describe('2. Route Isolation & 404 Guard Verification', () => {
    const invalidApiRoutes = [
      '/api/nonexistent',
      '/api/nonexistent/deep/sub/path',
      '/api/ade/nonexistent',
      '/api/menus/unknown',
      '/api/va/fake-event-1234',
      '/api/mdw/secret-admin',
      '/api',
      '/api/',
    ];

    for (const route of invalidApiRoutes) {
      it(`GET ${route} returns structured JSON 404 and NOT HTML SPA fallthrough`, async () => {
        const res = await request(app).get(route);
        expect(res.status).toBe(404);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.body).toHaveProperty('error', 'Endpoint not found');
        expect(res.text).not.toMatch(/<!DOCTYPE html>/i);
        expect(res.text).not.toMatch(/<html/i);
      });
    }

    it('Non-API route fallthrough does not return 404 JSON (serves SPA)', async () => {
      const res = await request(app).get('/dashboard');
      // In dev mode without clientDist, app returns 200 HTML fallback
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('3. CORS Headers Under Adversarial Origins', () => {
    it('sets CORS headers when Origin is supplied on GET', async () => {
      const origins = ['http://localhost:5173', 'https://insa-lyon.fr', 'http://127.0.0.1:3000'];
      for (const origin of origins) {
        const res = await request(app).get('/api/health').set('Origin', origin);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
        expect(res.headers['access-control-allow-credentials']).toBe('true');
      }
    });

    it('handles CORS preflight OPTIONS requests gracefully', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-methods']).toMatch(/GET|POST|HEAD|PUT|PATCH|DELETE/);
    });

    it('omits CORS headers when no Origin header is supplied', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('4. Data Sanitization Functionality', () => {
    it('sanitizes all targeted sensitive keys regardless of casing', () => {
      const sensitiveKeys = [
        'password',
        'PASSWORD',
        'Password',
        'pwd',
        'secret',
        'SECRET_KEY',
        'token',
        'accessToken',
        'otp',
        'totp',
        'TOTP_CODE',
        'mfa',
        'mfaToken',
        'credential',
        'authorization',
        'cookie',
        'castgc',
        'CASTGC',
        'jsessionid',
        'auth_session_id',
      ];

      for (const key of sensitiveKeys) {
        const input = { [key]: 'super-secret-value-12345' };
        const result = sanitizeData(input) as Record<string, unknown>;
        expect(result[key]).toBe('[REDACTED]');
      }
    });

    it('sanitizes nested structures, arrays, and preserves harmless fields', () => {
      const complexInput = {
        user: 'insa_student',
        email: 'student@insa-lyon.fr',
        auth: {
          password: 'plain_password',
          totp: '123456',
          nested: {
            token: 'jwt_token_xyz',
            safeValue: 42,
          },
        },
        sessions: [
          { sessionId: 'sess_1', castgc: 'tgt_val' },
          { sessionId: 'sess_2', safeLabel: 'desktop' },
        ],
      };

      const result = sanitizeData(complexInput) as any;
      expect(result.user).toBe('insa_student');
      expect(result.email).toBe('student@insa-lyon.fr');
      expect(result.auth.password).toBe('[REDACTED]');
      expect(result.auth.totp).toBe('[REDACTED]');
      expect(result.auth.nested.token).toBe('[REDACTED]');
      expect(result.auth.nested.safeValue).toBe(42);
      expect(result.sessions[0].castgc).toBe('[REDACTED]');
      expect(result.sessions[1].safeLabel).toBe('desktop');
    });

    it('sanitizeUrl masks sensitive query parameters', () => {
      const url = '/api/test?token=SECRET123&password=my_pwd&totp=654321&normalParam=ok';
      const cleanUrl = sanitizeUrl(url);
      expect(cleanUrl).not.toContain('SECRET123');
      expect(cleanUrl).not.toContain('my_pwd');
      expect(cleanUrl).not.toContain('654321');
      expect(cleanUrl).toContain('normalParam=ok');
      expect(decodeURIComponent(cleanUrl)).toContain('[REDACTED]');
    });

    it('sanitizeUrl masks ADE subscription URL secret tokens in pathname', () => {
      const adePath = '/ADE-Cal:~testuser!2025:A1B2C3D4E5F6G7H8';
      const cleanUrl = sanitizeUrl(adePath);
      expect(cleanUrl).not.toContain('A1B2C3D4E5F6G7H8');
      expect(cleanUrl).toBe('/ADE-Cal:~testuser!2025:[REDACTED]');
    });
  });

  describe('5. Data Sanitization Under Adversarial Requests & Leakage Checks', () => {
    it('request logger does NOT print sensitive query parameters', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const previousEnv = process.env.NODE_ENV;
      const previousDebug = process.env.DEBUG;
      process.env.NODE_ENV = 'development';
      process.env.DEBUG = 'true';

      try {
        await request(app).get(
          '/api/health?password=SuperSecretPassword&token=SuperSecretToken&totp=123456&secret=VaultSecret'
        );

        expect(consoleSpy).toHaveBeenCalled();
        const loggedOutput = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(loggedOutput).not.toContain('SuperSecretPassword');
        expect(loggedOutput).not.toContain('SuperSecretToken');
        expect(loggedOutput).not.toContain('123456');
        expect(loggedOutput).not.toContain('VaultSecret');
      } finally {
        consoleSpy.mockRestore();
        process.env.NODE_ENV = previousEnv;
        process.env.DEBUG = previousDebug;
      }
    });

    it('verifies 404 response payload when request contains sensitive query parameters', async () => {
      const res = await request(app).get(
        '/api/nonexistent?password=SuperSecretPassword&token=SecretToken123&totp=654321'
      );

      expect(res.status).toBe(404);
      const responseText = JSON.stringify(res.body);

      // CRITICAL CHECK: Does 404 path leak sensitive parameters back to client?
      // In app.ts line 57: path: req.originalUrl
      // Let's test if req.originalUrl in 404 handler leaks sensitive params!
      const leakedPassword = responseText.includes('SuperSecretPassword');
      const leakedToken = responseText.includes('SecretToken123');
      const leakedTotp = responseText.includes('654321');

      // We document empirical observation
      if (leakedPassword || leakedToken || leakedTotp) {
        console.warn('LEAK DETECTED in 404 response path:', res.body);
      }

      // Assert whether it is leaked or sanitized
      expect(leakedPassword).toBe(false);
      expect(leakedToken).toBe(false);
      expect(leakedTotp).toBe(false);
    });

    it('verifies error handling when malformed JSON is posted', async () => {
      const res = await request(app)
        .post('/api/health')
        .set('Content-Type', 'application/json')
        .send('{ "password": "secret", "broken": ');

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toHaveProperty('error');
      expect(JSON.stringify(res.body)).not.toContain('secret');
    });

    it('verifies errorHandler does NOT log raw query parameters containing sensitive fields', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const previousEnv = process.env.NODE_ENV;
      const previousDebug = process.env.DEBUG;
      process.env.NODE_ENV = 'development';
      process.env.DEBUG = 'true';

      try {
        await request(app)
          .post('/api/health?password=LEAKED_VIA_ERROR_HANDLER')
          .set('Content-Type', 'application/json')
          .send('{"bad_json":');

        expect(errorSpy).toHaveBeenCalled();
        const loggedOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(loggedOutput).not.toContain('LEAKED_VIA_ERROR_HANDLER');
      } finally {
        errorSpy.mockRestore();
        process.env.NODE_ENV = previousEnv;
        process.env.DEBUG = previousDebug;
      }
    });

    it('verifies ADE URL passed as query parameter in /api/ade', () => {
      // Test what happens when ADE URL is sent as query parameter
      const targetUrl = '/api/ade?url=https://ade-outils.insa-lyon.fr/ADE-Cal:~login!2025:SECRET_ADE_TOKEN';
      const clean = sanitizeUrl(targetUrl);
      
      const containsSecret = clean.includes('SECRET_ADE_TOKEN');
      if (containsSecret) {
        console.warn('ADE URL query param token NOT sanitized by sanitizeUrl:', clean);
      }
      expect(containsSecret).toBe(false);
    });
  });

  describe('6. Boundary Conditions & Payload Limits', () => {
    it('rejects oversized JSON payload (>1MB) with HTTP 413', async () => {
      // Create a payload > 1MB
      const largePayload = { data: 'x'.repeat(1024 * 1024 + 100) };
      const res = await request(app)
        .post('/api/mdw')
        .set('Content-Type', 'application/json')
        .send(largePayload);

      expect(res.status).toBe(413);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('handles prototype pollution attempts safely', async () => {
      const payload = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"admin": true}}}');
      await request(app)
        .post('/api/mdw')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(({} as any).polluted).toBeUndefined();
      expect(({} as any).admin).toBeUndefined();
    });

    it('handles HTTP verb tampering across GET endpoints', async () => {
      const verbs = ['post', 'put', 'delete', 'patch'] as const;
      for (const verb of verbs) {
        const res = await (request(app)[verb])('/api/health');
        expect(res.status).toBe(404);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.body).toHaveProperty('error', 'Endpoint not found');
      }
    });

    it('handles malformed URI gracefully without crashing process', async () => {
      const res = await request(app).get('/api/%FF%FE%FD');
      expect([400, 404]).toContain(res.status);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
