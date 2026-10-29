with open(r'learninghub/backend/src/utils/testsHelper.ts', 'r', encoding='utf-8') as f:
    c = f.read()

target = "  'CONTEST',\r\n]"
replacement = "  'CONTEST',\r\n  'PYQ',\r\n]"
if target in c:
    c = c.replace(target, replacement, 1)
else:
    target2 = "  'CONTEST',\n]"
    replacement2 = "  'CONTEST',\n  'PYQ',\n]"
    c = c.replace(target2, replacement2, 1)

with open(r'learninghub/backend/src/utils/testsHelper.ts', 'w', encoding='utf-8', newline='') as f:
    f.write(c)

print("testsHelper.ts updated successfully")
