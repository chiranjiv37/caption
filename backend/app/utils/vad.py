"""Silero VAD helpers."""

import gc
import wave
from typing import Dict, List

import subprocess
import io
import numpy as np
import torch


def load_audio(audio_path: str) -> torch.Tensor:
    result = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            audio_path,
            "-ac",
            "1",
            "-ar",
            "16000",
            "-f",
            "wav",
            "-"
        ],
        stdout=subprocess.PIPE,
        check=True,
    )

    with wave.open(io.BytesIO(result.stdout), "rb") as wf:
        pcm = wf.readframes(wf.getnframes())

    audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
    return torch.from_numpy(audio)


def run_vad(audio_path: str, cfg: dict) -> List[Dict]:
    """
    Run Silero VAD.

    Returns:
        [
            {"start": 0.52, "end": 1.91},
            ...
        ]
    """
    import torch

    model, utils = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
        onnx=False,
        trust_repo=True,
    )

    get_speech_timestamps = utils[0]

    wav = load_audio(audio_path)

    speech_timestamps = get_speech_timestamps(
        wav,
        model,
        sampling_rate=16000,
        threshold=cfg.get("vad_onset", 0.35),
        neg_threshold=cfg.get("vad_offset", 0.20),
        min_speech_duration_ms=cfg.get("min_speech_ms", 250),
        min_silence_duration_ms=cfg.get("min_silence_ms", 300),
        return_seconds=False,
    )

    regions = [
        {
            "start": round(ts["start"] / 16000, 3),
            "end": round(ts["end"] / 16000, 3),
        }
        for ts in speech_timestamps
    ]

    del model, wav
    gc.collect()

    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return regions


if __name__ == "__main__":
    print(run_vad("/storage5/output.mp3", {}))