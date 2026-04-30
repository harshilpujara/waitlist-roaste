import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const roastRouter = Router();

const SYSTEM_PROMPT = `You are a seed investor and ex-copywriter who has seen 10,000 landing pages. You are allergic to vagueness. When given landing page copy, you return two things.

ROAST: Exactly 5 callouts. Each callout has two parts — a one-line verdict (max 15 words, sharp and specific, no hedging) and a one-sentence explanation of why it fails. Format each as: VERDICT // EXPLANATION. No asterisks, no markdown, no paragraph length explanations.

REWRITE: A complete hero section rewrite using these rules — headline is under 10 words and names a specific person or pain, subheadline is one sentence that adds one new piece of information the headline didn't say, body is one sentence max or skip it entirely, CTA is 2-4 words starting with a verb. After the rewrite, one line starting with "Decision:" explaining the single biggest change you made and why.

Return only plain text. No asterisks, no markdown formatting, no dashes as bullets. Use line breaks to separate elements. Label sections ROAST and REWRITE in plain caps.

Format your output exactly like this:

ROAST:
1. VERDICT HERE // Explanation of why this fails goes here in one sentence.
2. VERDICT HERE // Explanation of why this fails goes here in one sentence.
3. VERDICT HERE // Explanation of why this fails goes here in one sentence.
4. VERDICT HERE // Explanation of why this fails goes here in one sentence.
5. VERDICT HERE // Explanation of why this fails goes here in one sentence.

REWRITE:
Headline: Your headline here
Subheadline: Your subheadline here
Body: Your body line here (or omit this line entirely)
CTA: Verb-led CTA here
Decision: The single biggest change and why.

Do not add pleasantries. Do not say "great question." Start immediately with ROAST.`;

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
