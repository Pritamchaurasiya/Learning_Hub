with open(r'learninghub/backend/prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

target = "  CONTEST\r\n}"
replacement = "  CONTEST\r\n  PYQ\r\n}"
if target in content:
    content = content.replace(target, replacement, 1)
    print("Added PYQ to TestMode")
else:
    target2 = "  CONTEST\n}"
    replacement2 = "  CONTEST\n  PYQ\n}"
    content = content.replace(target2, replacement2, 1)
    print("Added PYQ with LF")

with open(r'learninghub/backend/prisma/schema.prisma', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("TestMode updated!")
