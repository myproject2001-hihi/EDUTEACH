import json

with open('sourcemap.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

original_code = data['sourcesContent'][0]

with open('src/views/AssignmentsView.tsx', 'w', encoding='utf-8') as f:
    f.write(original_code)

print("Recovered file length:", len(original_code))
