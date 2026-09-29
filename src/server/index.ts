import { createApp } from './app.js';

const rawPort = process.env.PORT || '3000';
const PORT = parseInt(rawPort, 10);

if (isNaN(PORT) || PORT <= 0 || PORT > 65535) {
  console.error(`[FATAL] Invalid PORT specified: "${rawPort}". Using default 3000.`);
  process.exit(1);
}

const app = createApp();

const server = app.listen(PORT, '0.0.0.0', () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`\n=================================================`);
  console.log(`🚀 INSA Lyon Campus Hub Server`);
  console.log(`📡 Status: Running in [${env}] mode`);
  console.log(`🔗 Local:   http://localhost:${PORT}`);
  console.log(`🩺 Health:  http://localhost:${PORT}/api/health`);
  console.log(`=================================================\n`);
});

// Graceful Shutdown Handlers
function handleShutdown(signal: string) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Draining active connections...`);
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed gracefully.');
    process.exit(0);
  });

  // Force exit if hanging requests don't terminate within 5 seconds
  setTimeout(() => {
    console.error('[SHUTDOWN] Forcefully terminating after 5s timeout.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
