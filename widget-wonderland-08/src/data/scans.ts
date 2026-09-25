export type LayerKey = "stylometric" | "semantic" | "metadata" | "classifier";

export type Layer = {
  key: LayerKey;
  index: string;
  name: string;
  score: number;
  note: string;
};

export type Passage = {
  id: string;
  text: string;
  layer?: LayerKey;
  reason?: string;
};

export type Scan = {
  id: string;
  title: string;
  author: string;
  words: number;
  draft: string;
  date: string;
  overall: number;
  flagged: number;
  summary: string;
  layers: Layer[];
  passages: Passage[];
  isSample?: boolean;
};

const RAW_SCANS: Scan[] = [
  {
    id: "ds-1",
    title: "The Ethics of Machine Translation",
    author: "M. Okafor",
    words: 12480,
    draft: "draft v3",
    date: "14 Mar 2025",
    overall: 0.62,
    flagged: 12,
    summary:
      "A moderate overall signal. No single layer is decisive — the pattern becomes clearer when read across all four.",
    layers: [
      {
        key: "stylometric",
        index: "01",
        name: "Stylometric",
        score: 0.81,
        note: "Sentence length variance is unusually low across three passages. Uniform rhythm is a common signature of generated prose, but disciplined editing produces it too.",
      },
      {
        key: "semantic",
        index: "02",
        name: "Semantic",
        score: 0.44,
        note: "Coherence is high but the argument hedges where a specific claim is expected — a phrasing pattern typical of large language models.",
      },
      {
        key: "metadata",
        index: "03",
        name: "Metadata",
        score: 0.57,
        note: "Editing time is short relative to length and the authorship field changed between revisions. Circumstantial, not conclusive.",
      },
      {
        key: "classifier",
        index: "04",
        name: "Classifier",
        score: 0.38,
        note: "The trained model leans human for the document as a whole, with two localized spikes in the methods section.",
      },
    ],
    passages: [
      {
        id: "p1",
        text: "Recent advances in statistical machine translation have narrowed the gap between fluent and accurate rendering, yet several foundational questions remain unresolved.",
      },
      {
        id: "p2",
        text: "The accuracy of automated systems is often overstated in preliminary evaluations, and this tendency shapes much of the current literature.",
        layer: "stylometric",
        reason: "uniform clause length · stylometric 0.81",
      },
      {
        id: "p3",
        text: "In our study of 214 parallel corpora, BLEU scores correlated only weakly (r = 0.31) with human-annotated fidelity.",
        layer: "classifier",
        reason: "r = 0.31 · low correlation · classifier 0.38",
      },
      {
        id: "p4",
        text: "These findings suggest that composite metrics can be misleading when taken in isolation, and that editorial context should accompany any automated score.",
        layer: "semantic",
        reason: "hedged generalisation · semantic 0.44",
      },
      {
        id: "p5",
        text: "Subsequent sections revisit the corpus design and describe the annotation protocol used by the three reviewers.",
      },
    ],
  },
  {
    id: "ds-2",
    title: "Urban Heat Islands in Coastal Cities",
    author: "R. De Vita",
    words: 8940,
    draft: "final",
    date: "02 Mar 2025",
    overall: 0.34,
    flagged: 5,
    summary:
      "A low overall signal. Layer scores are consistent with a human-written paper carrying heavy quantitative sections.",
    layers: [
      { key: "stylometric", index: "01", name: "Stylometric", score: 0.29, note: "Sentence rhythm varies widely between the field notes and the discussion." },
      { key: "semantic", index: "02", name: "Semantic", score: 0.41, note: "Two summary paragraphs restate prior sections in noticeably smoother prose." },
      { key: "metadata", index: "03", name: "Metadata", score: 0.22, note: "Revision history spans eleven weeks with steady incremental edits." },
      { key: "classifier", index: "04", name: "Classifier", score: 0.44, note: "Model output sits near its decision boundary; treat as inconclusive." },
    ],
    passages: [
      { id: "p1", text: "Coastal cities experience heat retention patterns that diverge sharply from inland urban cores, largely because of sea-breeze circulation." },
      {
        id: "p2",
        text: "Overall, these results demonstrate the importance of considering multiple environmental factors in a comprehensive manner.",
        layer: "semantic",
        reason: "generic summarising register · semantic 0.41",
      },
      { id: "p3", text: "Sensor arrays were installed at 26 sites, with logging intervals of five minutes across the June–August window." },
      {
        id: "p4",
        text: "The data collection process was carefully designed to ensure accuracy and reliability throughout the study period.",
        layer: "classifier",
        reason: "boilerplate methods phrasing · classifier 0.44",
      },
    ],
  },
  {
    id: "ds-3",
    title: "A Review of Graph Neural Networks",
    author: "S. Lindqvist",
    words: 15220,
    draft: "draft v2",
    date: "27 Feb 2025",
    overall: 0.47,
    flagged: 8,
    summary:
      "A mid-range signal driven mostly by the literature review. The technical sections read as human-authored.",
    layers: [
      { key: "stylometric", index: "01", name: "Stylometric", score: 0.52, note: "Lexical variety drops sharply in the survey chapter relative to the rest." },
      { key: "semantic", index: "02", name: "Semantic", score: 0.61, note: "Several definitions paraphrase canonical sources in near-identical structure." },
      { key: "metadata", index: "03", name: "Metadata", score: 0.31, note: "Document properties are unremarkable; author field consistent throughout." },
      { key: "classifier", index: "04", name: "Classifier", score: 0.44, note: "Localized spikes in section 2; the remainder reads human." },
    ],
    passages: [
      { id: "p1", text: "Message-passing architectures generalise convolution to irregular domains by aggregating over a node's neighbourhood." },
      {
        id: "p2",
        text: "Graph neural networks have emerged as a powerful tool for learning on structured data, offering significant advantages over traditional approaches.",
        layer: "stylometric",
        reason: "flat lexical variety · stylometric 0.52",
      },
      {
        id: "p3",
        text: "This section provides a comprehensive overview of the key developments in the field over the past decade.",
        layer: "semantic",
        reason: "templated survey framing · semantic 0.61",
      },
      { id: "p4", text: "We reproduce the benchmark on OGB-arxiv and report a 1.8-point deviation from the published figure." },
    ],
  },
  {
    id: "ds-4",
    title: "Narrative Structure in Postwar Cinema",
    author: "J. Mbeki",
    words: 10310,
    draft: "draft v1",
    date: "19 Feb 2025",
    overall: 0.71,
    flagged: 17,
    summary:
      "A high overall signal across three of four layers. Warrants a conversation with the author — not a finding on its own.",
    layers: [
      { key: "stylometric", index: "01", name: "Stylometric", score: 0.78, note: "Sentence length sits in a narrow band for eleven consecutive paragraphs." },
      { key: "semantic", index: "02", name: "Semantic", score: 0.74, note: "Transitions follow a repeating three-beat pattern across sections." },
      { key: "metadata", index: "03", name: "Metadata", score: 0.69, note: "Created and modified timestamps are 41 minutes apart for a 10,000-word document." },
      { key: "classifier", index: "04", name: "Classifier", score: 0.63, note: "The model leans machine-generated with moderate confidence." },
    ],
    passages: [
      {
        id: "p1",
        text: "Postwar cinema reflects a profound shift in societal values, capturing the complexities of a changing world through innovative narrative techniques.",
        layer: "stylometric",
        reason: "narrow sentence-length band · stylometric 0.78",
      },
      { id: "p2", text: "Rossellini's location shooting in Rome, Open City was a practical constraint before it became an aesthetic." },
      {
        id: "p3",
        text: "Furthermore, the interplay between form and content serves to underscore the thematic concerns of the period.",
        layer: "semantic",
        reason: "repeating transition cadence · semantic 0.74",
      },
      {
        id: "p4",
        text: "In conclusion, these films collectively represent a significant turning point in the history of the medium.",
        layer: "metadata",
        reason: "written inside a 41-minute edit window · metadata 0.69",
      },
    ],
  },
];

export const SCANS: Scan[] = RAW_SCANS.map((s) => ({ ...s, isSample: true }));

export const TREND = [
  { label: "W1", value: 0.34 },
  { label: "W2", value: 0.4 },
  { label: "W3", value: 0.3 },
  { label: "W4", value: 0.46 },
  { label: "W5", value: 0.52 },
  { label: "W6", value: 0.44 },
  { label: "W7", value: 0.58 },
  { label: "W8", value: 0.62 },
];
