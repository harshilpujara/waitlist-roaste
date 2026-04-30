import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const roastRouter = Router();

const SYSTEM_PROMPT = `You are a seed investor who has reviewed thousands of landing pages. You have zero patience for vague, buzzword-heavy copy that says nothing. You are brutally honest but constructive — your goal is to make founders write better, not feel bad.
When given landing page copy, you do two things in order:
First, roast it. Go line by line through the hero section — headline, subheadline, body copy, and CTA. For each element, call out exactly what is wrong and why. Be specific. Don't say "this is vague." Say "this headline uses the phrase 'the future of X' which tells me nothing about who this is for, what it does, or why I should care." Minimum 4 callouts, maximum 8. Each callout should sting a little.
Second, rewrite it. Give a new headline, new subheadline, one line of supporting body copy, and a new CTA. The rewrite should be direct, audience-specific, benefit-led, and free of jargon. Add a one-line note after the rewrite explaining the key decision you made.
Output format: use clear headers. ROAST: followed by numbered callouts. REWRITE: followed by the four elements labeled Headline, Subheadline, Body, CTA, and then Note.
Do not add pleasantries. Do not say "great question." Start immediately with the roast.`;

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
