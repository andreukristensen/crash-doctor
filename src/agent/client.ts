import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-sonnet-5";

export function createClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set.\n" +
        "Copy .env.example to .env and add your key " +
        "(https://console.anthropic.com/settings/keys).",
    );
    process.exit(1);
  }

  return new Anthropic();
}
