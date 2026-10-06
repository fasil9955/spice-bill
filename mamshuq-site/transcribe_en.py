import os
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
import numpy as np

files = [
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.33.39 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.39.16 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.40.16 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.41.19 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.43.07 PM.ogg",
    r"c:\Users\DELL\Downloads\WhatsApp Ptt 2026-09-28 at 5.43.38 PM.ogg",
]
out_path = r"d:\billing shop\spice-bill\mamshuq-site\voice_notes_en.txt"
prompt = (
    "Mamshuq Resort at Irumanathur, Periya, Wayanad. "
    "Contour survey, hill top, downside, pond, organic farm, acres, cents, "
    "swimming pool, fishing pool, glass bridge, ayurvedic spa, restaurant, turf, "
    "children park, gym, wellness center, villa, trees."
)
model = WhisperModel("medium", device="cpu", compute_type="int8")
with open(out_path, "w", encoding="utf-8") as fh:
    for f in files:
        name = os.path.basename(f)
        audio = decode_audio(f)
        dur = len(audio) / 16000.0
        rms = float(np.sqrt(np.mean(np.square(audio)))) if len(audio) else 0.0
        peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
        print("FILE", name, "dur", round(dur, 1), "rms", round(rms, 4), "peak", round(peak, 3), flush=True)
        fh.write("==== " + name + " ====\n")
        fh.write(f"audio_sec {dur:.1f} rms {rms:.4f} peak {peak:.3f}\n")
        segments, info = model.transcribe(
            f,
            task="translate",
            language="ml",
            beam_size=5,
            temperature=0.0,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 400},
            condition_on_previous_text=False,
            hallucination_silence_threshold=1.5,
            initial_prompt=prompt,
            no_speech_threshold=0.5,
            compression_ratio_threshold=2.2,
        )
        n = 0
        for seg in segments:
            if seg.start > dur + 0.4:
                continue
            text = " ".join(seg.text.split())
            if not text:
                continue
            fh.write(f"[{seg.start:6.1f}-{seg.end:6.1f}] {text}\n")
            n += 1
        fh.write("\n")
        fh.flush()
        print("segments", n, flush=True)
print("WROTE", out_path, flush=True)
