import { Server } from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

let server: Server | null = null;
let isShuttingDown = false;

/**
 * Handles graceful shutdown of HTTP server and database connections.
 */
async function gracefulShutdown(signal: string, exitCode: number = 0): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Force exit after 10 seconds if connections refuse to close
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      logger.info('HTTP server stopped accepting new connections');
    }

    await disconnectDatabase();
    logger.info('Graceful shutdown completed successfully');
    process.exit(exitCode);
  } catch (error) {
    logger.error('Error occurred during graceful shutdown', error);
    process.exit(1);
  }
}

// Process lifecycle event listeners
process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));

process.on('uncaughtException', async (error: Error) => {
  logger.error('FATAL: Uncaught exception encountered', error);
  await gracefulShutdown('uncaughtException', 1);
});

process.on('unhandledRejection', async (reason: unknown) => {
  logger.error('FATAL: Unhandled promise rejection encountered', reason);
  await gracefulShutdown('unhandledRejection', 1);
});

/**
 * Startup sequence:
 * 1. Environment already validated on import of `env`
 * 2. Connect to MongoDB
 * 3. Only if MongoDB connection succeeds, start HTTP server
 * 4. If connection fails, log and terminate gracefully
 */
async function startServer(): Promise<void> {
  try {
    // Connect to database first
    await connectDatabase();

    // Start HTTP server only after database connection succeeds
    server = app.listen(env.PORT, () => {
      logger.info(`Feedants Competition Backend successfully started`, {
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
        healthCheck: `http://localhost:${env.PORT}/health`,
        apiBase: `http://localhost:${env.PORT}/api/v1`,
      });
    });
  } catch (error) {
    logger.error('Startup failed: unable to establish database connection. Terminating.', error);
    process.exit(1);
  }
}

// Start application
startServer();
