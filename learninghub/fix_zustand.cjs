const fs = require('fs')
const path = require('path')

const directoryPath = path.join(__dirname, 'src')

function processDirectory(dir) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      processDirectory(fullPath)
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath)
    }
  })
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  // Regex to match: const { var1, var2: alias2 } = useStore()
  // Handles multiline as well
  const regex = /const\s+\{([^}]+)\}\s*=\s*useStore\(\)/g

  const newContent = content.replace(regex, (match, varsGroup) => {
    modified = true
    const vars = varsGroup
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)

    const lines = vars.map(v => {
      // Handle aliases like `settings: globalSettings`
      if (v.includes(':')) {
        const [original, alias] = v.split(':').map(s => s.trim())
        return `const ${alias} = useStore(state => state.${original})`
      }
      return `const ${v} = useStore(state => state.${v})`
    })

    return lines.join('\n  ')
  })

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8')
    console.log(`Updated: ${filePath}`)
  }
}

processDirectory(directoryPath)
