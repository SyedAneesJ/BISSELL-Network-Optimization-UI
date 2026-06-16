import { AIScenario } from '../../data/aiMockData';

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-3-5-sonnet-20241022";

export interface NarrativeSection {
  label: string;
  text: string;
}

function buildPrompt(scenario: AIScenario): string {
  const sc = scenario;
  const suppressed = sc.suppressedDC ? `suppressed DC: ${sc.suppressedDC}` : "all DCs active";
  return `You are a supply chain network optimization analyst. Narrate the following scenario results for a BISSELL logistics network optimization tool. Be concise, data-driven, and actionable. Use the exact numbers provided.

SCENARIO: ${sc.name}
Configuration: ${sc.sub}
Suppression status: ${suppressed}

KPIs:
- Total Cost: ${sc.kpis.cost}
- Cost per Unit: ${sc.kpis.cpu}
- Avg Delivery Days: ${sc.kpis.days}
- SLA Breach Rate: ${sc.kpis.sla}
- Max Utilization: ${sc.kpis.util}
${sc.suppressedDC ? `- Lanes displaced by suppression: ${sc.lanesDisplaced.toLocaleString()}
- Estimated suppression cost penalty: $${(sc.costPenalty / 1000000).toFixed(1)}M
- R Virginia at risk: ${sc.rvaFlag ? "YES — absorbing majority of displaced lanes, approaching overcapacity" : "No"}` : ""}

Respond with exactly 5 sections in this JSON format (return only valid JSON, no markdown):
{
  "sections": [
    { "label": "📊 EXECUTIVE SUMMARY", "text": "..." },
    { "label": "💰 COST ANALYSIS", "text": "..." },
    { "label": "⚡ CAPACITY & RISK", "text": "..." },
    { "label": "📦 SERVICE LEVEL", "text": "..." },
    { "label": "✅ RECOMMENDATION", "text": "..." }
  ]
}

Use <strong> tags for key numbers and findings. Keep each section to 2-3 sentences max. Be direct — no filler phrases.`;
}

export async function narrateScenario(scenario: AIScenario): Promise<NarrativeSection[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_KEY;
  if (!apiKey) {
    throw new Error("VITE_ANTHROPIC_KEY is not set in your .env file.");
  }

  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: buildPrompt(scenario) }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(raw);
    return parsed.sections;
  } catch {
    return [{ label: "📊 NARRATIVE", text: raw }];
  }
}
