import os

base = r"D:\本地知识库\my_knowledge\newKnowledge"
print(f"Checking: {base}")
print(f"Exists: {os.path.exists(base)}")

if os.path.exists(base):
    for root, dirs, files in os.walk(base):
        for d in dirs:
            if "audio" in d.lower() or "mind" in d.lower():
                print(f"DIR: {os.path.join(root, d)}")
        for f in files:
            if "audio" in f.lower() or "mind" in f.lower():
                print(f"FILE: {os.path.join(root, f)}")

# Also check VibeCoding
for d in os.listdir(r"D:\VibeCoding"):
    full = os.path.join(r"D:\VibeCoding", d)
    if os.path.isdir(full):
        print(f"D:\\VibeCoding\\{d}")
