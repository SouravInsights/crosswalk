/**
 * Logging via pino: structured when piped (JSON for CI), pretty when TTY
 * (the person running the command). Levels control verbosity; --verbose
 * enables debug.
 *
 * pino-pretty is passed as a direct in-process stream, not a `transport`.
 * Transports run in a worker thread, which is right for servers but wrong
 * for a short-lived CLI: worker output interleaves out of order with the
 * report renderer's direct console writes, and buffered lines can flush
 * late or twice on exit. In-process keeps every line in order.
 */

import pino from "pino";
import pretty from "pino-pretty";

// TTY detection: undefined or false means piped/CI, so use JSON.
// True means a real terminal, so use pretty printing.
const isTTY = process.stdout.isTTY === true;

const logger = pino(
  {
    level: process.env.WEBMCP_LOG_LEVEL ?? (process.argv.includes("--verbose") ? "debug" : "info"),
  },
  isTTY
    ? pretty({
        colorize: true,
        ignore: "pid,hostname,time,level",
        messageFormat: "{msg}",
        translateTime: false,
        hideObject: true,
        sync: true,
      })
    : undefined,
);

export const debug = (msg: string): void => logger.debug(msg);
export const info = (msg: string): void => logger.info(msg);
export const warn = (msg: string): void => logger.warn(msg);
export const error = (msg: string): void => logger.error(msg);
export const success = (msg: string): void => logger.info(msg);

/** Enable debug-level output (the --verbose flag). */
export function enableVerbose(): void {
  logger.level = "debug";
}
