import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const roastRouter = Router();

const SYSTEM_PROMPT = `You are a seed investor who has reviewed thousands of landing pages. You have strong opinions and zero tolerance for copy that sounds like it was written by a committee. But you are also fair — when something works, you say so. Your job is to give founders the honest read they would never get from their team.

Given landing page copy, return a structured response with these exact sections in this order:

TITLE: A 4 to 5 word brutal but witty summary of the copy's core failure. This will be shown as the browser tab title. Example: Streamline This Into The Bin. No punctuation at the end.

SUMMARY: Two sentences max. Your overall read as an investor. Honest, specific, not kind but not cruel. This appears next to their score.

PRAISE: One to three things that actually work. If nothing works write one line acknowledging what the intent was even if the execution failed. Format each as: WHAT // one sentence explanation. If everything is genuinely bad write NONE // This copy has no salvageable elements, which is rare but possible.

PROBLEMS: Exactly 5 callouts. Each as: VERDICT // EXPLANATION. Verdict is one line max 15 words, sharp and specific. Explanation is one sentence. No asterisks, no markdown, no dashes.

REWRITE:
Headline: under 10 words, names a real pain or a real person
Subheadline: one sentence, adds one new idea the headline did not say
Body: one sentence or leave blank
CTA: 2 to 4 words starting with a verb
Decision: one sentence on the single biggest strategic change you made

Return plain text only. No asterisks, no markdown, no dashes as bullets. Use line breaks between items. The PRAISE and PROBLEMS sections must use the double slash separator between verdict and explanation.`;

roastRouter.post("/roast", async (req, res) => {
  const { copy } = req.body as { copy?: string };

  if (!copy || typeof copy !== "string" || copy.trim().length === 0) {
    res.status(400).json({ error: "copy field is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: copy.trim() }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error streaming roast");
    res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
    res.end();
  }
});

export default roastRouter;
