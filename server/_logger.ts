import { log } from "./_deps.ts";

const formatter = "{datetime} [{levelName}] {msg}";

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("INFO", { formatter }),
    file: new log.handlers.FileHandler("INFO", {
      filename: "./server.log",
      formatter,
    }),
  },
  loggers: {
    "denocg": { level: "DEBUG", handlers: ["console", "file"] },
  },
});

export const logger = log.getLogger("denocg");
