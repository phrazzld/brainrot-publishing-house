#!/usr/bin/env python3
import re
import sys

def split_chapters(text):
    # split text at lines beginning with 'chapter ' (case-insensitive)
    pattern = re.compile(r'^(chapter .*)$', re.I | re.M)
    parts = pattern.split(text)
    # drop any preamble before the first chapter header
    if parts and parts[0].strip() == '':
        parts = parts[1:]
    chapters = []
    for i in range(0, len(parts), 2):
        header = parts[i].strip()
        content = parts[i+1].strip() if i+1 < len(parts) else ''
        chapters.append((header, content))
    return chapters

def clean_filename(header, index):
    # remove the 'chapter ' prefix in a case-insensitive way and replace non-word chars
    if header.upper().startswith("CHAPTER "):
        chapter_label = header[len("CHAPTER "):].strip()
    else:
        chapter_label = header
    chapter_label = re.sub(r'\W+', '_', chapter_label)
    if not chapter_label:
        chapter_label = str(index)
    return f"chapter_{chapter_label}.txt"

def main():
    if len(sys.argv) < 2:
        print("usage: {} input_file".format(sys.argv[0]))
        sys.exit(1)
    input_file = sys.argv[1]
    with open(input_file, 'r', encoding='utf-8') as f:
        text = f.read()
    chapters = split_chapters(text)
    if not chapters:
        print("no chapters found!")
        sys.exit(1)
    for idx, (header, content) in enumerate(chapters, start=1):
        filename = clean_filename(header, idx)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(header + "\n\n" + content)
        print(f"wrote {filename}")

if __name__ == '__main__':
    main()
