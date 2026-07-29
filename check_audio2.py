import os

# Search all of D: for audio-mind project dirs
targets = [r"D:\本地知识库", r"D:\VibeCoding", os.path.expanduser("~")]
for base in targets:
    if not os.path.exists(base): continue
    for root, dirs, files in os.walk(base):
        for d in dirs:
            if "audio-mind" in d.lower() or d == "audio_mind":
                print(f"DIR: {os.path.join(root, d)}")
        for f in files:
            if f in ["download.py", "transcribe.py", "analyze.py", "diarize.py"]:
                print(f"FILE: {os.path.join(root, f)}")
        # Limit depth
        if root.count(os.sep) - base.count(os.sep) > 5:
            dirs.clear()

print("\n--- Checking git repos ---")
for base in [r"D:\VibeCoding"]:
    for d in os.listdir(base):
        full = os.path.join(base, d)
        if os.path.isdir(full):
            for sub in os.listdir(full):
                if "audio" in sub.lower():
                    print(f"  {full}\\{sub}")
