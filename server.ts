import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Helper to format currency in deterministic fallback
function formatCurrency(val: number): string {
  const abs = Math.abs(val);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(abs);
  return val < 0 ? `-${formatted}` : formatted;
}

// Summary generation endpoint
app.post('/api/summarize', async (req: Request, res: Response) => {
  try {
    const {
      topRegion,
      metricUsed,
      dollarDelta,
      pctDelta,
      q2Revenue,
      q3Revenue,
      allRegions,
      topProducts,
      topChannels,
      unitsDelta,
      q2Units,
      q3Units,
      q2AvgDiscount,
      q3AvgDiscount,
    } = req.body;

    if (!topRegion) {
      return res.status(400).json({ error: 'Missing calculation payload' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && !apiKey.includes('YOUR_')) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const prompt = `You are a revenue intelligence analyst.
Write an EXACTLY THREE-SENTENCE summary of which sales region changed the most from Q2 to Q3, and why, adhering strictly to these requirements:
1. Must be EXACTLY three complete sentences. No bullet points, no asterisks, no quotes around the sentences, no conversational filler or preamble.
2. Sentence 1: Name ${topRegion} as the region that experienced the largest change from Q2 to Q3, stating its exact Q2 revenue (${formatCurrency(q2Revenue)}), Q3 revenue (${formatCurrency(q3Revenue)}), and dollar change (${formatCurrency(dollarDelta)}) or percentage change (${pctDelta >= 0 ? '+' : ''}${pctDelta.toFixed(1)}%).
3. Sentence 2: Explain the primary product level drivers for ${topRegion}'s shift using the exact calculated product numbers provided below (product names, revenue changes, unit counts).
4. Sentence 3: Explain the channel dynamics and/or discount/unit volume factors using the exact channel changes, unit delta (${unitsDelta >= 0 ? '+' : ''}${unitsDelta.toLocaleString()} units), or average discount shift (${q2AvgDiscount.toFixed(1)}% in Q2 vs ${q3AvgDiscount.toFixed(1)}% in Q3) provided below.
5. STRICT RULE: Use ONLY the numbers explicitly supplied below. Do not fabricate, invent, estimate, or alter any numbers.

Calculated data:
- Target Region: ${topRegion}
- Q2 Revenue: ${formatCurrency(q2Revenue)}
- Q3 Revenue: ${formatCurrency(q3Revenue)}
- Net Revenue Change: ${formatCurrency(dollarDelta)} (${pctDelta >= 0 ? '+' : ''}${pctDelta.toFixed(1)}%)
- All Region Rankings (by absolute revenue change):
${JSON.stringify(allRegions, null, 2)}
- Key Product Changes in ${topRegion}:
${JSON.stringify(topProducts, null, 2)}
- Key Channel Changes in ${topRegion}:
${JSON.stringify(topChannels, null, 2)}
- Total Units in ${topRegion}: Q2 = ${q2Units.toLocaleString()}, Q3 = ${q3Units.toLocaleString()} (Change: ${unitsDelta >= 0 ? '+' : ''}${unitsDelta.toLocaleString()})
- Average Discount in ${topRegion}: Q2 = ${q2AvgDiscount.toFixed(1)}%, Q3 = ${q3AvgDiscount.toFixed(1)}%`;

        // Helper to invoke model with timeout guard
        const generateWithModel = async (modelName: string, timeoutMs: number) => {
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error(`${modelName} timeout`)), timeoutMs)
          );

          const apiPromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction:
                'You are an executive revenue analytics analyst. Deliver concise, factual analysis using ONLY numbers provided. Adhere strictly to the requested three-sentence length.',
              temperature: 0.2,
              thinkingConfig: {
                thinkingLevel:
                  modelName === 'gemini-3.1-flash-lite'
                    ? ThinkingLevel.MINIMAL
                    : ThinkingLevel.LOW,
              },
            },
          });

          return (await Promise.race([apiPromise, timeoutPromise])) as any;
        };

        let response: any = null;
        let usedModel = 'gemini-3.1-flash-lite';

        try {
          // gemini-3.1-flash-lite provides sub-second responses without thinking latency
          response = await generateWithModel('gemini-3.1-flash-lite', 4000);
        } catch {
          try {
            usedModel = 'gemini-3.8-flash';
            response = await generateWithModel('gemini-3.8-flash', 5000);
          } catch {
            response = null;
          }
        }

        const text = response?.text?.trim() || '';
        if (text) {
          return res.json({ summary: text, source: usedModel });
        }
      } catch {
        // Continue to deterministic calculation without logging errors to stderr
      }
    }

    // Deterministic fallback if API key is absent or Gemini response is empty
    const productDriver =
      topProducts && topProducts.length > 0
        ? `${topProducts[0].product} (${formatCurrency(topProducts[0].delta >= 0 ? topProducts[0].delta : topProducts[0].delta)} revenue shift)`
        : 'key product lineup movements';
    const channelDriver =
      topChannels && topChannels.length > 0
        ? `sales through the ${topChannels[0].channel} channel (${formatCurrency(topChannels[0].delta)})`
        : 'channel allocation adjustments';

    const fallbackSummary = `${topRegion} recorded the greatest change from Q2 to Q3 across all regions, with revenue moving by ${formatCurrency(dollarDelta)} (${pctDelta >= 0 ? '+' : ''}${pctDelta.toFixed(1)}%) from ${formatCurrency(q2Revenue)} to ${formatCurrency(q3Revenue)}. This shift was primarily propelled by ${productDriver}, with total regional volume moving from ${q2Units.toLocaleString()} to ${q3Units.toLocaleString()} units. The performance was further shaped by ${channelDriver} alongside an average discount rate shift from ${q2AvgDiscount.toFixed(1)}% in Q2 to ${q3AvgDiscount.toFixed(1)}% in Q3.`;

    return res.json({ summary: fallbackSummary, source: 'calculated-engine' });
  } catch (err: any) {
    console.error('Error in /api/summarize:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate summary',
    });
  }
});

// Setup Vite middleware or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = parseInt(process.env.PORT || '3000', 10);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
