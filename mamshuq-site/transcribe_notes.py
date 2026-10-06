from faster_whisper import WhisperModel
import os

files = [
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.33.39 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.39.16 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.40.16 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.41.19 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.43.07 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.43.38 PM.ogg",
]

out_path = r"d:\billing shop\spice-bill\mamshuq-site\voice_notes_ml.txt"
model = WhisperModel("medium", device="cpu", compute_type="int8")
with open(out_path, "w", encoding="utf-8") as fh:
    for f in files:
        name = os.path.basename(f)
        print("FILE", name, flush=True)
        fh.write("==== " + name + " ====\n")
        segments, info = model.transcribe(
            f,
            language="ml",
            beam_size=5,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        header = f"duration_sec {info.duration:.1f} language {info.language} prob {info.language_probability:.2f}\n"
        fh.write(header)
        print(header.strip(), flush=True)
        n = 0
        for seg in segments:
            row = f"[{seg.start:6.1f}] {seg.text.strip()}\n"
            fh.write(row)
            n += 1
        fh.write("\n")
        fh.flush()
        print("segments", n, flush=True)
print("WROTE", out_path, flush=True)
