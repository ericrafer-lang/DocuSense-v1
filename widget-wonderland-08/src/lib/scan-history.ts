import { SCANS, type LayerKey, type Scan, type Layer, type Passage } from "@/data/scans";
import type { DetectionResultDto } from "@/lib/docusense-api";

export const HISTORY_KEY = "docusense_history";

export const LAYER_ORDER: LayerKey[] = ["stylometric", "semantic", "metadata", "classifier"];

export const LAYER_LABELS: Record<LayerKey, string> = {
  stylometric: "Stylometric",
  semantic: "Semantic",
  metadata: "Metadata",
  classifier: "Classifier",
};

export function noteFor(layer: LayerKey, score: number): string {
  const band = score > 0.65 ? "high" : score > 0.3 ? "moderate" : "low";
  const templates: Record<LayerKey, Record<"high" | "moderate" | "low", string>> = {
    stylometric: {
      high: "Sentence length and word choice are unusually uniform across the document.",
      moderate: "Some sections show flatter rhythm than others; not decisive alone.",
      low: "Sentence structure varies naturally, consistent with typical human writing.",
    },
    semantic: {
      high: "Several passages use generic, templated phrasing common in generated text.",
      moderate: "A mix of specific and generic phrasing throughout.",
      low: "Argument and phrasing read as specific and situationally grounded.",
    },
    metadata: {
      high: "File properties (edit window, authorship) show signals worth reviewing.",
      moderate: "One or two metadata signals are slightly atypical.",
      low: "File properties look consistent with normal drafting history.",
    },
    classifier: {
      high: "The heuristic classifier flags multiple sentences as machine-like.",
      moderate: "A handful of sentences carry classifier-flagged phrasing.",
      low: "Few or no sentences match the classifier's flagged patterns.",
    },
  };
  return templates[layer][band];
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mapResultToScan(result: DetectionResultDto, fallbackTitle: string, author: string): Scan {
  const overall = result.overallScore / 100;
  const flagged = result.highlightedSections.length;

  const scoreByLayer = new Map(
    result.layerScores.map((l) => [l.layerType.toLowerCase() as LayerKey, l.score / 100]),
  );

  const layers: Layer[] = LAYER_ORDER.map((key, i) => {
    const score = scoreByLayer.get(key) ?? 0.5;
    return {
      key,
      index: String(i + 1).padStart(2, "0"),
      name: LAYER_LABELS[key],
      score,
      note: noteFor(key, score),
    };
  });

  const text = result.document?.extractedText ?? "";
  const sentences = splitSentences(text);
  const flaggedPositions = new Set(result.highlightedSections.map((h) => h.position));
  const flaggedByPosition = new Map(result.highlightedSections.map((h) => [h.position, h]));

  const passages: Passage[] =
    sentences.length > 0
      ? sentences.map((s, i) => {
          if (flaggedPositions.has(i)) {
            const h = flaggedByPosition.get(i)!;
            return {
              id: `p${i}`,
              text: s,
              layer: "classifier" as LayerKey,
              reason: `flagged pattern · classifier ${(h.sectionScore / 100).toFixed(2)}`,
            };
          }
          return { id: `p${i}`, text: s };
        })
      : [{ id: "p0", text: "(No text preview available for this file type yet.)" }];

  const summary =
    overall > 0.65
      ? "A high overall signal across multiple layers. Worth a conversation with the author — not a finding on its own."
      : overall > 0.3
        ? "A moderate signal. No single layer is decisive on its own."
        : "A low overall signal, consistent with typical human writing.";

  return {
    id: `upload-${result.documentId}`,
    title: fallbackTitle,
    author,
    words: text ? text.split(/\s+/).filter(Boolean).length : 0,
    draft: "uploaded",
    date: new Date().toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    overall,
    flagged,
    summary,
    layers,
    passages,
  };
}

export function loadHistory(): Scan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Scan[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(scans: Scan[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(scans.slice(0, 20)));
}

export function addScanToHistory(newScan: Scan): Scan[] {
  const current = loadHistory();
  const next = [newScan, ...current.filter((s) => s.id !== newScan.id)];
  saveHistory(next);
  return next;
}

export function getAllScans(): Scan[] {
  return [...loadHistory(), ...SCANS];
}

export function getScanById(id: string): Scan | undefined {
  const history = loadHistory();
  const foundInHistory = history.find((s) => s.id === id);
  if (foundInHistory) return foundInHistory;
  return SCANS.find((s) => s.id === id);
}
