const fs = require("fs")
const path = require("path")

// Configuration
const SRC_DIR = path.resolve(__dirname, "../frontend/src")
const TRANSLATIONS_FILE = path.resolve(__dirname, "../frontend/src/i18n/translations.ts")

// Regex to find t("key") or t('key')
// We relaxed the regex to not strictly require a closing parenthesis immediately,
// allowing for things like t("key" as any) or complex arguments.
// It matches: word boundary, 't', '(', optional space, quote, CAPTURE KEY, quote.
const T_REGEX = /\bt\(\s*["']([^"']+)["']/g

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== "node_modules" && file !== ".git") {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
      }
    } else {
      if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        arrayOfFiles.push(path.join(dirPath, "/", file))
      }
    }
  })

  return arrayOfFiles
}

function extractDefinedKeys() {
  const content = fs.readFileSync(TRANSLATIONS_FILE, "utf8")

  // Extract en block
  // Looks for "en: {" ... "}, es:"
  const enBlockMatch = content.match(/en:\s*\{([\s\S]*?)\n\s*\},\s*\n\s*es:/)
  const enBlock = enBlockMatch ? enBlockMatch[1] : ""

  // Extract es block
  // Looks for "es: {" ... "}," or "}"
  // We assume it ends with a closing brace on a new line
  const esBlockMatch = content.match(/es:\s*\{([\s\S]*?)\n\s*\}/)
  const esBlock = esBlockMatch ? esBlockMatch[1] : ""

  const extractKeysFromBlock = (block) => {
    const keys = new Set()
    const keyRegex = /^\s*([a-zA-Z0-9_]+):/gm
    let match
    while ((match = keyRegex.exec(block)) !== null) {
      keys.add(match[1])
    }
    return keys
  }

  return {
    en: extractKeysFromBlock(enBlock),
    es: extractKeysFromBlock(esBlock),
  }
}

function checkTranslations() {
  console.log("Checking for missing translations...")

  const definedKeys = extractDefinedKeys()
  console.log(`Found ${definedKeys.en.size} defined keys in EN.`)
  console.log(`Found ${definedKeys.es.size} defined keys in ES.`)

  const files = getAllFiles(SRC_DIR)
  const missingKeysEn = new Set()
  const missingKeysEs = new Set()

  let filesChecked = 0

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8")
    let match

    // Reset regex index
    T_REGEX.lastIndex = 0

    while ((match = T_REGEX.exec(content)) !== null) {
      const key = match[1]

      // Check EN
      if (!definedKeys.en.has(key)) {
        missingKeysEn.add(`${key} (found in ${path.relative(SRC_DIR, file)})`)
      }
      // Check ES
      if (!definedKeys.es.has(key)) {
        missingKeysEs.add(`${key} (found in ${path.relative(SRC_DIR, file)})`)
      }
    }
    filesChecked++
  })

  console.log(`Checked ${filesChecked} files.`)

  let hasError = false

  if (missingKeysEn.size > 0) {
    console.log("\n--- Missing EN Translations ---")
    console.error(`Found ${missingKeysEn.size} missing keys in English:`)
    Array.from(missingKeysEn)
      .sort()
      .forEach((msg) => {
        console.log(`- ${msg}`)
      })
    hasError = true
  }

  if (missingKeysEs.size > 0) {
    console.log("\n--- Missing ES Translations ---")
    console.error(`Found ${missingKeysEs.size} missing keys in Spanish:`)
    Array.from(missingKeysEs)
      .sort()
      .forEach((msg) => {
        console.log(`- ${msg}`)
      })
    hasError = true
  }

  if (hasError) {
    process.exit(1)
  } else {
    console.log("All used keys are defined in both languages.")
    process.exit(0)
  }
}

checkTranslations()
