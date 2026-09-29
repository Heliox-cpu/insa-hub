import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../../src/server/app.js';

describe('Backend Server API & Healthcheck (M1 Foundation)', () => {
  const app = createApp();

  describe('GET /api/health (supertest)', () => {
    it('should return HTTP 200 with status ok and valid ISO timestamp', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'insa-campus-api');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');

      // Verify timestamp is a valid ISO-8601 string
      const date = new Date(res.body.timestamp);
      expect(date.getTime()).not.toBeNaN();
      expect(res.body.timestamp).toBe(date.toISOString());
    });
  });

  describe('Skeleton Route Mounts', () => {
    it('GET /api/ade returns 200 with ADE service info', async () => {
      const res = await request(app).get('/api/ade');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'ade');
      expect(res.body).toHaveProperty('status', 'ok');
    });

    it('GET /api/menus returns 200 with dining service info', async () => {
      const res = await request(app).get('/api/menus');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'dining');
      expect(res.body).toHaveProperty('status', 'ok');
    });

    it('GET /api/dining (alias) returns 200 with dining service info', async () => {
      const res = await request(app).get('/api/dining');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'dining');
      expect(res.body).toHaveProperty('status', 'ok');
    });

    it('GET /api/va returns 200 with Portail VA service info', async () => {
      const res = await request(app).get('/api/va');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'va');
      expect(res.body).toHaveProperty('status', 'ok');
    });

    it('GET /api/mdw returns 200 with MonDossierWeb service info', async () => {
      const res = await request(app).get('/api/mdw');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'mdw');
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Security & 404 Behavior', () => {
    it('returns JSON 404 for unhandled /api/* paths and does NOT serve SPA HTML', async () => {
      const res = await request(app).get('/api/unhandled-random-endpoint');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toHaveProperty('error', 'Endpoint not found');
      expect(res.body).toHaveProperty('path', '/api/unhandled-random-endpoint');
    });

    it('sets CORS headers on requests', async () => {
      const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('Native Node fetch() verification (Ephemeral Port)', () => {
    let server: Server;
    let baseUrl: string;

    beforeAll(() => new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    }));

    afterAll(() => new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    }));

    it('responds to native HTTP fetch on ephemeral socket', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
    });
  });
});
