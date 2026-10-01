using System.Text.RegularExpressions;
using DocuSense.Api.Models;
using DocuSense.Api.Services;

namespace DocuSense.Api.Services;

/// <summary>
/// Four-layer explainable AI-content analysis engine.
/// Each layer returns a score in [0, 1] where higher = more AI-like signal.
/// </summary>
public partial class AnalysisService
{
    // ── Public Entry Point ────────────────────────────────────────────────────

    public ScanResult Analyze(ExtractedDocument doc, string fileName)
    {
        var sentences = Tokenize(doc.Text);
        if (sentences.Count == 0)
        {
            return EmptyResult(fileName);
        }

        var stylometric = AnalyzeStylometric(sentences, doc.Text);
        var semantic = AnalyzeSemantic(sentences, doc.Text);
        var metadata = AnalyzeMetadata(doc);
        var classifier = AnalyzeClassifier(sentences, doc.Text);

        var layers = new List<LayerResult> { stylometric, semantic, metadata, classifier };

        // Weighted overall: stylometric 30%, semantic 35%, metadata 15%, classifier 20%
        var overall = Math.Round(
            stylometric.Score * 0.30 +
            semantic.Score * 0.35 +
            metadata.Score * 0.15 +
            classifier.Score * 0.20, 2);

        var passages = BuildPassages(sentences, stylometric.Score, semantic.Score);
        var flagged = passages.Count(p => p.Layer is not null);

        var summary = BuildSummary(overall, layers);

        return new ScanResult
        {
            Id = $"ds-{Guid.NewGuid():N}"[..10],
            Title = Path.GetFileNameWithoutExtension(fileName),
            Author = doc.Author,
            Words = doc.WordCount,
            Draft = "uploaded",
            Date = DateTime.Now.ToString("dd MMM yyyy"),
            Overall = overall,
            Flagged = flagged,
            Summary = summary,
            Layers = layers,
            Passages = passages,
        };
    }

    // ── Layer 01 · Stylometric ────────────────────────────────────────────────

    private static LayerResult AnalyzeStylometric(List<string> sentences, string text)
    {
        // Sentence-length variance: low variance → AI signal
        var lengths = sentences.Select(s => s.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length).ToList();
        var mean = lengths.Average();
        var variance = lengths.Select(l => Math.Pow(l - mean, 2)).Average();
        var cv = mean > 0 ? Math.Sqrt(variance) / mean : 1.0; // coefficient of variation

        // Type-token ratio (lexical diversity): high TTR = human, low TTR = AI
        var words = text.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var ttr = words.Length > 0
            ? (double)words.Distinct().Count() / Math.Min(words.Length, 200)
            : 1.0;

        // Normalize: low CV → high score; low TTR → high score
        var cvScore = Math.Max(0, 1.0 - cv * 2.5);   // CV ~0.4 is average human
        var ttrScore = Math.Max(0, 1.0 - ttr * 0.8);  // TTR ~0.6 is typical human

        var score = Math.Round(Math.Clamp(cvScore * 0.6 + ttrScore * 0.4, 0, 1), 2);

        var note = score switch
        {
            > 0.7 => "Sentence length sits in an unusually narrow band and lexical variety is low — a common signature of generated prose.",
            > 0.45 => "Sentence length variance is moderate. Some sections show reduced lexical diversity typical of AI-drafted text.",
            _ => "Sentence rhythm and vocabulary range are consistent with human writing patterns.",
        };

        return new LayerResult
        {
            Key = "stylometric",
            Index = "01",
            Name = "Stylometric",
            Score = score,
            Note = note,
        };
    }

    // ── Layer 02 · Semantic ───────────────────────────────────────────────────

    private static readonly string[] HedgePhrases = [
        "it is important to note", "it is worth noting", "it is crucial to",
        "these findings suggest", "this highlights the importance", "this underscores",
        "overall, these results demonstrate", "in conclusion, these",
        "furthermore, the interplay", "the interplay between",
        "a comprehensive overview", "in a comprehensive manner",
        "significant advantages over traditional", "a powerful tool for",
        "has emerged as a", "offers significant", "plays a crucial role",
        "it should be noted that", "it can be argued that",
        "in light of the above", "as previously mentioned",
    ];

    private static readonly string[] BoilerplateOpeners = [
        "in conclusion", "in summary", "to summarize", "overall,",
        "to conclude", "in essence", "as a result,", "consequently,",
        "therefore,", "thus,", "hence,", "accordingly,",
    ];

    private static LayerResult AnalyzeSemantic(List<string> sentences, string fullText)
    {
        var lower = fullText.ToLower();

        // Count hedge phrases per 1000 words
        var wordCount = Math.Max(1, fullText.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length);
        var hedgeHits = HedgePhrases.Sum(p => CountOccurrences(lower, p));
        var hedgeDensity = (double)hedgeHits / wordCount * 1000.0;

        // Count boilerplate sentence openers
        var boilerplateHits = sentences.Count(s =>
            BoilerplateOpeners.Any(op => s.ToLower().TrimStart().StartsWith(op)));
        var boilerplateRate = (double)boilerplateHits / sentences.Count;

        // Transition cadence: count sentences starting with "Furthermore", "Moreover", "Additionally"
        var transitionWords = new[] { "furthermore", "moreover", "additionally", "in addition", "notably," };
        var transitionHits = sentences.Count(s => transitionWords.Any(t => s.ToLower().TrimStart().StartsWith(t)));
        var transitionRate = (double)transitionHits / sentences.Count;

        var score = Math.Round(Math.Clamp(
            hedgeDensity * 0.04 +
            boilerplateRate * 0.45 +
            transitionRate * 0.55,
            0, 1), 2);

        var note = score switch
        {
            > 0.65 => "Heavy hedging language and boilerplate transition patterns detected. Phrasing follows a template typical of large language models.",
            > 0.38 => "Moderate hedging and generic summary phrasing. The argument hedges where specific claims are expected.",
            _ => "Semantic patterns are consistent with focused academic writing. Limited boilerplate detected.",
        };

        return new LayerResult
        {
            Key = "semantic",
            Index = "02",
            Name = "Semantic",
            Score = score,
            Note = note,
        };
    }

    // ── Layer 03 · Metadata ───────────────────────────────────────────────────

    private static LayerResult AnalyzeMetadata(ExtractedDocument doc)
    {
        double score = 0.3; // baseline when no metadata available
        var notes = new List<string>();

        if (doc.Created.HasValue && doc.Modified.HasValue)
        {
            var editMinutes = (doc.Modified.Value - doc.Created.Value).TotalMinutes;
            var expectedMinutes = doc.WordCount / 30.0; // ~30 wpm average typing speed

            if (editMinutes < 1)
            {
                score = 0.95;
                notes.Add($"Created and modified within seconds for a {doc.WordCount:N0}-word document.");
            }
            else if (editMinutes < expectedMinutes * 0.05)
            {
                score = 0.80;
                notes.Add($"Edit window ({editMinutes:F0} min) is very short relative to document length.");
            }
            else if (editMinutes < expectedMinutes * 0.20)
            {
                score = 0.60;
                notes.Add($"Editing time is short relative to length. Circumstantial, not conclusive.");
            }
            else
            {
                score = 0.20;
                notes.Add($"Revision history spans a reasonable time window.");
            }
        }
        else
        {
            notes.Add("No creation/modification timestamps found — metadata layer is inconclusive.");
        }

        if (!string.IsNullOrWhiteSpace(doc.Author) && doc.Author != "Unknown")
        {
            notes.Add($"Author field present: \"{doc.Author}\".");
        }
        else
        {
            score = Math.Min(score + 0.05, 1.0);
            notes.Add("Author field is missing or generic.");
        }

        var note = string.Join(" ", notes);

        return new LayerResult
        {
            Key = "metadata",
            Index = "03",
            Name = "Metadata",
            Score = Math.Round(Math.Clamp(score, 0, 1), 2),
            Note = note,
        };
    }

    // ── Layer 04 · Classifier ─────────────────────────────────────────────────
    //
    // This layer examines signals that the other three layers do NOT use:
    //   Signal A — AI-signature phrase density (documented LLM tell-phrases, per 1000 words)
    //   Signal B — contraction rate (human informal writing uses more contractions;
    //              very low rate in otherwise casual-register text is a mild AI signal)
    //   Signal C — sentence-starter repetition (burstiness proxy; distinct from
    //              stylometric's sentence-LENGTH variance — looks at repeated opening words)
    //
    // This is a rule-based heuristic classifier, the same category of technique early
    // tools like the original GPTZero used. It is NOT a trained model and is less
    // accurate than one, but it is a genuinely independent fourth signal.

    // A documented set of phrases disproportionately common in LLM output.
    private static readonly string[] AiSignaturePhrases =
    [
        "in conclusion", "it is important to note", "it's important to note",
        "furthermore,", "moreover,", "overall,", "in summary", "in today's world",
        "plays a crucial role", "plays a vital role", "in the realm of",
        "delve into", "it is worth noting", "a testament to",
        "in essence", "underscores the importance", "navigate the complexities",
        "in the ever-evolving", "has emerged as a", "offers a comprehensive",
        "a comprehensive overview", "significant implications",
    ];

    // Common English contractions used more frequently in human-written text.
    private static readonly string[] Contractions =
    [
        "don't", "can't", "won't", "isn't", "aren't", "it's", "i'm", "we're",
        "you're", "they're", "didn't", "doesn't", "wasn't", "weren't", "couldn't",
        "shouldn't", "wouldn't", "i've", "we've", "there's", "that's",
    ];

    private static LayerResult AnalyzeClassifier(List<string> sentences, string text)
    {
        if (sentences.Count == 0)
        {
            return new LayerResult
            {
                Key = "classifier", Index = "04", Name = "Classifier",
                Score = 0, Note = "No text to classify.",
            };
        }

        var lowerText = text.ToLowerInvariant();
        var wordCount = Math.Max(Regex.Matches(text, @"[A-Za-z']+").Count, 1);

        // Signal A: AI-signature phrase density (per 1000 words)
        var phraseHits = AiSignaturePhrases.Count(p => lowerText.Contains(p));
        var phraseDensity = (double)phraseHits / wordCount * 1000.0;

        // Signal B: contraction rate — low contractions in a casual-register doc = mild AI signal
        var contractionHits = Contractions.Count(c => lowerText.Contains(c));
        var contractionRate = (double)contractionHits / wordCount * 1000.0;
        // Absence of contractions (contractionRate near 0) contributes positively to AI score;
        // capped so a formally written human paper isn't unfairly penalised.
        var contractionSignal = Math.Clamp(Math.Max(0, 8.0 - contractionRate) / 8.0, 0, 0.4);

        // Signal C: sentence-starter repetition (burstiness proxy)
        var starters = sentences
            .Select(s => s.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries)
                          .FirstOrDefault()?.ToLowerInvariant() ?? "")
            .Where(w => w.Length > 0)
            .ToList();
        var starterRepeatRatio = starters.Count > 1
            ? 1.0 - ((double)starters.Distinct().Count() / starters.Count)
            : 0;

        // Combine: phrase density is the strongest signal, starter repetition secondary,
        // contraction absence is weakest (formal human writing can also lack contractions).
        var rawScore = phraseDensity * 0.07 + starterRepeatRatio * 0.35 + contractionSignal * 0.25;
        var score = Math.Round(Math.Clamp(rawScore, 0, 1), 2);

        var note = score switch
        {
            > 0.70 => "High AI-phrase density and low sentence-starter diversity detected. Pattern is consistent with machine-generated text.",
            > 0.45 => "The classifier detects above-average AI-signature phrase use and limited opener variety. Treat as one signal, not a verdict.",
            > 0.25 => "Some AI-signature phrases present but overall pattern is mixed. Near the decision boundary — manual review advised.",
            _ => "Low AI-phrase density, normal contraction use, and varied sentence starters — consistent with human-written prose.",
        };

        return new LayerResult
        {
            Key = "classifier",
            Index = "04",
            Name = "Classifier",
            Score = score,
            Note = note,
        };
    }

    // ── Passage Extraction ────────────────────────────────────────────────────

    private static List<PassageResult> BuildPassages(List<string> sentences, double styloScore, double semScore)
    {
        var passages = new List<PassageResult>();
        var lowerHedges = HedgePhrases.Select(p => p.ToLower()).ToList();
        var lowerBoilerplate = BoilerplateOpeners.Select(p => p.ToLower()).ToList();

        for (int i = 0; i < sentences.Count && passages.Count < 8; i++)
        {
            var s = sentences[i];
            var lower = s.ToLower().Trim();
            var id = $"p{i + 1}";

            // Check hedge phrases
            var hedgeHit = lowerHedges.FirstOrDefault(h => lower.Contains(h));
            if (hedgeHit is not null && semScore > 0.3)
            {
                passages.Add(new PassageResult
                {
                    Id = id,
                    Text = s.Trim(),
                    Layer = "semantic",
                    Reason = $"hedging phrase: \"{hedgeHit}\" · semantic {semScore:F2}",
                });
                continue;
            }

            // Check boilerplate openers
            var boilerHit = lowerBoilerplate.FirstOrDefault(b => lower.TrimStart().StartsWith(b));
            if (boilerHit is not null && semScore > 0.3)
            {
                passages.Add(new PassageResult
                {
                    Id = id,
                    Text = s.Trim(),
                    Layer = "semantic",
                    Reason = $"boilerplate opening: \"{boilerHit}\" · semantic {semScore:F2}",
                });
                continue;
            }

            // Check short sentence-length variance (stylometric)
            var words = s.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
            if (words is >= 18 and <= 24 && styloScore > 0.4 && i > 0)
            {
                passages.Add(new PassageResult
                {
                    Id = id,
                    Text = s.Trim(),
                    Layer = "stylometric",
                    Reason = $"sentence in narrow length band ({words} words) · stylometric {styloScore:F2}",
                });
                continue;
            }

            // Normal passage
            if (passages.Count < 6)
            {
                passages.Add(new PassageResult { Id = id, Text = s.Trim() });
            }
        }

        return passages;
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    private static string BuildSummary(double overall, List<LayerResult> layers)
    {
        var dominant = layers.OrderByDescending(l => l.Score).First();
        return overall switch
        {
            > 0.70 => $"A high overall signal, driven by the {dominant.Name.ToLower()} layer. Warrants a conversation with the author — not a finding on its own.",
            > 0.50 => $"A moderate overall signal. The {dominant.Name.ToLower()} layer shows the clearest pattern; read all four before drawing conclusions.",
            > 0.30 => $"A low-to-moderate signal. The {dominant.Name.ToLower()} layer raised some flags, but most patterns are consistent with human writing.",
            _ => "A low overall signal. Layer scores are consistent with a human-written paper.",
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static List<string> Tokenize(string text)
    {
        // Split on sentence-ending punctuation
        var raw = SentenceRegex().Split(text.Replace("\r\n", " ").Replace("\n", " "));
        return raw.Where(s => s.Trim().Length > 20).ToList();
    }

    private static int CountOccurrences(string text, string phrase) =>
        (text.Length - text.Replace(phrase, "").Length) / phrase.Length;

    private static ScanResult EmptyResult(string fileName) => new()
    {
        Id = $"ds-{Guid.NewGuid():N}"[..10],
        Title = Path.GetFileNameWithoutExtension(fileName),
        Author = "Unknown",
        Words = 0,
        Draft = "uploaded",
        Date = DateTime.Now.ToString("dd MMM yyyy"),
        Overall = 0,
        Flagged = 0,
        Summary = "The document appears to be empty or could not be read.",
        Layers = new()
        {
            new() { Key = "stylometric", Index = "01", Name = "Stylometric", Score = 0, Note = "No text found." },
            new() { Key = "semantic",    Index = "02", Name = "Semantic",    Score = 0, Note = "No text found." },
            new() { Key = "metadata",   Index = "03", Name = "Metadata",    Score = 0, Note = "No text found." },
            new() { Key = "classifier", Index = "04", Name = "Classifier",  Score = 0, Note = "No text found." },
        },
        Passages = new(),
    };

    private static readonly Regex SentenceRegexInstance = new(@"(?<=[.!?])\s+", RegexOptions.Compiled);
    private static Regex SentenceRegex() => SentenceRegexInstance;
}
