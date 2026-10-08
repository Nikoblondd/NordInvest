import { Scenarios, scenarioSummary, type ScenarioColumn, type ScenarioLine } from "@/components/sheet/Scenarios";

/*
 * Forsigtig, forventet and optimistisk side by side, the way a bank or a
 * co-investor reads a deal. Each column says what it assumes, and the
 * cautious one uses how far asking prices in the postnummer have actually
 * been cut.
 */

export type Scenario = {
  key: "low" | "base" | "high";
  title: string;
  assumptions: string[];
  arv: number;
  renovation: number;
  months: number;
  profit: number;
  margin: number;
  roi: number;
};

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const pct = (n: number, d = 1) => `${(n * 100).toLocaleString("da-DK", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

export function FlipScenarios({ rows, target }: { rows: Scenario[]; target: number }) {
  type Tone = "good" | "warn" | "bad";
  const profitTone = (s: Scenario): Tone => (s.profit >= 0 ? "good" : "bad");
  const marginTone = (s: Scenario): Tone => (s.margin >= target / 100 ? "good" : s.profit >= 0 ? "warn" : "bad");
  const lines: ScenarioLine[] = [
    { label: "Salgspris", values: rows.map((s) => kr(s.arv)) },
    { label: "Renovering", values: rows.map((s) => kr(s.renovation)) },
    { label: "Måneder fra køb til salg", values: rows.map((s) => `${s.months} mdr.`) },
    { label: "Fortjeneste efter skat", values: rows.map((s) => kr(s.profit)), strong: true, tones: rows.map(profitTone) },
    { label: "Af salgsprisen", values: rows.map((s) => pct(s.margin)), tones: rows.map(marginTone) },
    { label: "Afkast på egen kapital", values: rows.map((s) => pct(s.roi, 0)) },
  ];
  const columns: ScenarioColumn[] = rows.map((s) => ({ key: s.key, title: s.title, assumptions: s.assumptions, good: s.profit > 0 }));
  return <Scenarios columns={columns} lines={lines} summary={scenarioSummary(columns, "Handlen giver overskud", "Handlen giver underskud")} />;
}
