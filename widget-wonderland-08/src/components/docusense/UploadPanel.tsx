import { useRef, useState } from "react";

const ACCEPTED = [".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt"];

export function UploadPanel({
  onFile,
  analyzing,
  progress,
  fileName,
}: {
  onFile: (file: File) => void;
  analyzing: boolean;
  progress: number;
  fileName: string | null;
}) {
  const [over, setOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const take = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;

    const lastDot = f.name.lastIndexOf(".");
    const ext = lastDot !== -1 ? f.name.slice(lastDot).toLowerCase() : "";

    if (!ACCEPTED.includes(ext)) {
      setFileError(
        `Unsupported file type (${ext || "no extension"}). Allowed formats: PDF, DOCX, DOC, TXT, RTF, ODT.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
    onFile(f);
  };

  return (
    <div>
      <div className="rounded-[18px] bg-paper/5 p-2 ring-1 ring-paper/12">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            take(e.dataTransfer.files);
          }}
          className={`grid w-full cursor-pointer place-items-center rounded-[10px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
            over
              ? "border-signal bg-signal/10"
              : "border-signal/40 bg-tabledeep/40 hover:border-signal/70 hover:bg-signal/5"
          }`}
        >
          <div className="grid size-11 place-items-center rounded-[10px] bg-signal/12 text-signal ring-1 ring-signal/30">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path d="M10 3a1 1 0 0 1 .7.3l3 3a1 1 0 1 1-1.4 1.4L10.5 6.4V13a1 1 0 1 1-2 0V6.4L7.7 7.7a1 1 0 0 1-1.4-1.4l3-3A1 1 0 0 1 10 3Z" />
              <path d="M4 13a1 1 0 0 1 1 1v1.5h10V14a1 1 0 1 1 2 0v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a1 1 0 0 1 1-1Z" />
            </svg>
          </div>
          <p className="mt-4 font-display text-lg text-paper">
            {fileName ?? "Drop a manuscript here"}
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/45">
            {analyzing ? "reading layers…" : "or browse your files"}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {["PDF", "DOCX", "TXT", "RTF", "ODT"].map((t) => (
              <span
                key={t}
                className="rounded-full bg-paper/8 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-paper/55 ring-1 ring-paper/10"
              >
                {t}
              </span>
            ))}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => take(e.target.files)}
          />
        </button>

        {analyzing ? (
          <div className="px-2 pb-1 pt-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-paper/10">
              <div
                className="h-full rounded-full bg-signal transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
              {progress < 30
                ? "01 · stylometric"
                : progress < 55
                  ? "02 · semantic"
                  : progress < 80
                    ? "03 · metadata"
                    : "04 · classifier"}
            </p>
          </div>
        ) : null}
      </div>
      {fileError ? <p className="mt-3 text-sm text-red-400">{fileError}</p> : null}
      <p className="mt-3 px-1 font-mono text-[10px] leading-relaxed text-paper/35">
        Files stay on your device during review. Nothing is stored or shared.
      </p>
    </div>
  );
}
