/**
 * Logging via pino: structured when piped (JSON for CI), pretty when TTY
 * (the person running the command). Levels control verbosity; --verbose
 * enables debug.
 */

import pino from "pino";

// TTY detection: undefined or false means piped/CI, so use JSON.
// True means a real terminal, so use pretty printing.
const isTTY = process.stdout.isTTY === true;

const logger = pino({
  level: process.env.WEBMCP_LOG_LEVEL ?? (process.argv.includes("--verbose") ? "debug" : "info"),
  transport: isTTY
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname,time,level",
          messageFormat: "{msg}",
          translateTime: false,
          hideObject: true,
        },
      }
    : undefined,
});

export const debug = (msg: string): void => logger.debug(msg);
export const info = (msg: string): void => logger.info(msg);
export const warn = (msg: string): void => logger.warn(msg);
export const error = (msg: string): void => logger.error(msg);
export const success = (msg: string): void => logger.info(msg);

/** Enable debug-level output (the --verbose flag). */
export function enableVerbose(): void {
  logger.level = "debug";
}
