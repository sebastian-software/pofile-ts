import * as fs from "node:fs"

export interface Headers {
  "Project-Id-Version": string
  "Report-Msgid-Bugs-To": string
  "POT-Creation-Date": string
  "PO-Revision-Date": string
  "Last-Translator": string
  Language: string
  "Language-Team": string
  "Content-Type": string
  "Content-Transfer-Encoding": string
  "Plural-Forms": string
  [name: string]: string
}

export interface ParsedPluralForms {
  nplurals: string | undefined
  plural: string | undefined
}

export interface ItemOptions {
  nplurals?: number | string
}

function trim(str: string): string {
  return str.replace(/^\s+|\s+$/g, "")
}

/**
 * Represents a single translation item in a PO file.
 */
export class Item {
  msgid = ""
  msgctxt: string | null = null
  references: string[] = []
  msgid_plural: string | null = null
  msgstr: string[] = []
  comments: string[] = []
  extractedComments: string[] = []
  flags: Record<string, boolean> = {}
  obsolete = false
  nplurals: number

  constructor(options?: ItemOptions) {
    const npluralsValue = options?.nplurals
    const npluralsNumber = Number(npluralsValue)
    this.nplurals = isNaN(npluralsNumber) ? 2 : npluralsNumber
  }

  toString(): string {
    const lines: string[] = []

    const escape = (str: string): string => {
      // eslint-disable-next-line no-control-regex
      return str.replace(/[\x07\b\t\v\f\r"\\]/g, (match) => {
        switch (match) {
          case "\x07":
            return "\\a"
          case "\b":
            return "\\b"
          case "\t":
            return "\\t"
          case "\v":
            return "\\v"
          case "\f":
            return "\\f"
          case "\r":
            return "\\r"
          default:
            return "\\" + match
        }
      })
    }

    const process = (keyword: string, text: string, index?: number): string[] => {
      const result: string[] = []
      const parts = text.split(/\n/)
      const indexStr = typeof index !== "undefined" ? "[" + String(index) + "]" : ""

      if (parts.length > 1) {
        result.push(keyword + indexStr + ' ""')
        for (const part of parts) {
          result.push('"' + escape(part) + '"')
        }
      } else {
        result.push(keyword + indexStr + ' "' + escape(text) + '"')
      }
      return result
    }

    const processLineBreak = (keyword: string, text: string, index?: number): string[] => {
      const processed = process(keyword, text, index)
      for (let i = 1; i < processed.length - 1; i++) {
        const current = processed[i]
        if (current) {
          processed[i] = current.slice(0, -1) + '\\n"'
        }
      }
      return processed
    }

    // Order: translator-comments, extracted-comments, references, flags
    for (const c of this.comments) {
      lines.push("# " + c)
    }

    for (const c of this.extractedComments) {
      lines.push("#. " + c)
    }

    for (const ref of this.references) {
      lines.push("#: " + ref)
    }

    const flags = Object.keys(this.flags).filter((flag) => Boolean(this.flags[flag]))
    if (flags.length > 0) {
      lines.push("#, " + flags.join(","))
    }

    const mkObsolete = this.obsolete ? "#~ " : ""

    const keywords = ["msgctxt", "msgid", "msgid_plural", "msgstr"] as const

    for (const keyword of keywords) {
      const text = this[keyword]

      if (text != null) {
        let hasTranslation = false

        if (Array.isArray(text)) {
          hasTranslation = text.some((t) => t)
        }

        if (Array.isArray(text) && text.length > 1) {
          text.forEach((t, i) => {
            const processed = processLineBreak(keyword, t, i)
            lines.push(mkObsolete + processed.join("\n" + mkObsolete))
          })
        } else if (this.msgid_plural && keyword === "msgstr" && !hasTranslation) {
          for (let pluralIndex = 0; pluralIndex < this.nplurals; pluralIndex++) {
            const processed = process(keyword, "", pluralIndex)
            lines.push(mkObsolete + processed.join(""))
          }
        } else {
          const index = this.msgid_plural && Array.isArray(text) ? 0 : undefined
          const textStr = Array.isArray(text) ? text.join("") : text
          const processed = processLineBreak(keyword, textStr, index)
          lines.push(mkObsolete + processed.join("\n" + mkObsolete))
        }
      }
    }

    return lines.join("\n")
  }
}

/**
 * Represents a Gettext PO file.
 */
export class PO {
  comments: string[] = []
  extractedComments: string[] = []
  headers: Partial<Headers> = {}
  headerOrder: string[] = []
  items: Item[] = []

  static Item = Item

  /**
   * Parses Plural-Forms header string.
   */
  static parsePluralForms(pluralFormsString: string | undefined): ParsedPluralForms {
    const results = (pluralFormsString ?? "")
      .split(";")
      .reduce<Record<string, string>>((acc, keyValueString) => {
        const trimmedString = keyValueString.trim()
        const equalsIndex = trimmedString.indexOf("=")
        const key = trimmedString.substring(0, equalsIndex).trim()
        const value = trimmedString.substring(equalsIndex + 1).trim()
        acc[key] = value
        return acc
      }, {})

    return {
      nplurals: results.nplurals,
      plural: results.plural
    }
  }

  /**
   * Parses a PO file string and returns a PO object.
   */
  static parse(data: string): PO {
    // Support both unix and windows newline formats
    data = data.replace(/\r\n/g, "\n")

    const po = new PO()
    const sections = data.split(/\n\n/)
    const headers: string[] = []

    // Everything until the first 'msgid ""' is considered header
    while (
      sections[0] &&
      (headers.length === 0 || !headers[headers.length - 1]?.includes('msgid ""'))
    ) {
      if (/msgid\s+"[^"]/.exec(sections[0])) {
        // Found first real string, adding a dummy header item
        headers.push('msgid ""')
      } else {
        const shifted = sections.shift()
        if (shifted !== undefined) {
          headers.push(shifted)
        }
      }
    }

    const headersStr = headers.join("\n")
    const lines = sections.join("\n").split(/\n/)

    po.headers = {
      "Project-Id-Version": "",
      "Report-Msgid-Bugs-To": "",
      "POT-Creation-Date": "",
      "PO-Revision-Date": "",
      "Last-Translator": "",
      Language: "",
      "Language-Team": "",
      "Content-Type": "",
      "Content-Transfer-Encoding": "",
      "Plural-Forms": ""
    }
    po.headerOrder = []

    interface AccWithMerge extends Array<string> {
      merge?: boolean
    }

    const initialAcc: AccWithMerge = []
    initialAcc.merge = false

    headersStr
      .split(/\n/)
      .reduce<AccWithMerge>((acc, line) => {
        if (acc.merge) {
          // Join lines, remove last resp. first "
          const popped = acc.pop()
          if (popped !== undefined) {
            line = popped.slice(0, -1) + line.slice(1)
          }
          delete acc.merge
        }
        if (/^".*"$/.test(line) && !/^".*\\n"$/.test(line)) {
          acc.merge = true
        }
        acc.push(line)
        return acc
      }, initialAcc)
      .forEach((header) => {
        if (/^#\./.exec(header)) {
          po.extractedComments.push(header.replace(/^#\.\s*/, ""))
        } else if (/^#/.exec(header)) {
          po.comments.push(header.replace(/^#\s*/, ""))
        } else if (/^"/.exec(header)) {
          const cleanHeader = header.trim().replace(/^"/, "").replace(/\\n"$/, "")
          const parts = cleanHeader.split(/:/)
          const name = parts.shift()
          if (name !== undefined) {
            const value = parts.join(":").trim()
            po.headers[name.trim()] = value
            po.headerOrder.push(name.trim())
          }
        }
      })

    const parsedPluralForms = PO.parsePluralForms(po.headers["Plural-Forms"])
    const nplurals = parsedPluralForms.nplurals

    let item = new Item({ nplurals })
    let context: string | null = null
    let plural = 0
    let obsoleteCount = 0
    let noCommentLineCount = 0

    const finish = (): void => {
      if (item.msgid.length > 0) {
        if (obsoleteCount >= noCommentLineCount) {
          item.obsolete = true
        }
        obsoleteCount = 0
        noCommentLineCount = 0
        po.items.push(item)
        item = new Item({ nplurals })
      }
    }

    const extract = (str: string): string => {
      str = trim(str)
      str = str.replace(/^[^"]*"|"$/g, "")
      str = str.replace(
        /\\([abtnvfr'"\\?]|([0-7]{3})|x([0-9a-fA-F]{2}))/g,
        (_, esc: string, oct: string | undefined, hex: string | undefined) => {
          if (oct) {
            return String.fromCharCode(parseInt(oct, 8))
          }
          if (hex) {
            return String.fromCharCode(parseInt(hex, 16))
          }
          switch (esc) {
            case "a":
              return "\x07"
            case "b":
              return "\b"
            case "t":
              return "\t"
            case "n":
              return "\n"
            case "v":
              return "\v"
            case "f":
              return "\f"
            case "r":
              return "\r"
            default:
              return esc
          }
        }
      )
      return str
    }

    while (lines.length > 0) {
      const shifted = lines.shift()
      if (shifted === undefined) break

      let line = trim(shifted)
      let lineObsolete = false

      if (/^#~/.exec(line)) {
        // Obsolete item - only remove the obsolete comment mark
        line = trim(line.substring(2))
        lineObsolete = true
      }

      if (/^#:/.exec(line)) {
        // Reference
        finish()
        item.references.push(trim(line.replace(/^#:/, "")))
      } else if (/^#,/.exec(line)) {
        // Flags
        finish()
        const flags = trim(line.replace(/^#,/, "")).split(",")
        for (const flag of flags) {
          item.flags[flag.trim()] = true
        }
      } else if (/^#($|\s+)/.exec(line)) {
        // Translator comment
        finish()
        item.comments.push(trim(line.replace(/^#($|\s+)/, "")))
      } else if (/^#\./.exec(line)) {
        // Extracted comment
        finish()
        item.extractedComments.push(trim(line.replace(/^#\./, "")))
      } else if (/^msgid_plural/.exec(line)) {
        // Plural form
        item.msgid_plural = extract(line)
        context = "msgid_plural"
        noCommentLineCount++
      } else if (/^msgid/.exec(line)) {
        // Original
        finish()
        item.msgid = extract(line)
        context = "msgid"
        noCommentLineCount++
      } else if (/^msgstr/.exec(line)) {
        // Translation
        const m = /^msgstr\[(\d+)\]/.exec(line)
        plural = m?.[1] ? parseInt(m[1], 10) : 0
        item.msgstr[plural] = extract(line)
        context = "msgstr"
        noCommentLineCount++
      } else if (/^msgctxt/.exec(line)) {
        // Context
        finish()
        item.msgctxt = extract(line)
        context = "msgctxt"
        noCommentLineCount++
      } else {
        // Probably multiline string or blank
        if (line.length > 0) {
          noCommentLineCount++
          if (context === "msgstr") {
            item.msgstr[plural] = (item.msgstr[plural] ?? "") + extract(line)
          } else if (context === "msgid") {
            item.msgid += extract(line)
          } else if (context === "msgid_plural") {
            item.msgid_plural = (item.msgid_plural ?? "") + extract(line)
          } else if (context === "msgctxt") {
            item.msgctxt = (item.msgctxt ?? "") + extract(line)
          }
        }
      }

      if (lineObsolete) {
        obsoleteCount++
      }
    }

    finish()
    return po
  }

  /**
   * Loads a PO file from disk.
   */
  static load(
    filename: string,
    callback: (err: NodeJS.ErrnoException | null, po?: PO) => void
  ): void {
    fs.readFile(filename, "utf-8", (err, data) => {
      if (err) {
        callback(err)
        return
      }
      const po = PO.parse(data)
      callback(null, po)
    })
  }

  /**
   * Saves the PO file to disk.
   */
  save(filename: string, callback: (err: NodeJS.ErrnoException | null) => void): void {
    fs.writeFile(filename, this.toString(), callback)
  }

  /**
   * Serializes the PO file to a string.
   */
  toString(): string {
    const lines: string[] = []

    for (const comment of this.comments) {
      lines.push(("# " + comment).trim())
    }

    for (const comment of this.extractedComments) {
      lines.push(("#. " + comment).trim())
    }

    lines.push('msgid ""')
    lines.push('msgstr ""')

    const headerOrder: string[] = []

    for (const key of this.headerOrder) {
      if (key in this.headers) {
        headerOrder.push(key)
      }
    }

    const keys = Object.keys(this.headers)
    for (const key of keys) {
      if (!headerOrder.includes(key)) {
        headerOrder.push(key)
      }
    }

    for (const key of headerOrder) {
      lines.push('"' + key + ": " + (this.headers[key] ?? "") + '\\n"')
    }

    lines.push("")

    for (const item of this.items) {
      lines.push(item.toString())
      lines.push("")
    }

    return lines.join("\n")
  }
}

export default PO
