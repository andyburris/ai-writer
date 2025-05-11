import { Editor } from '@tiptap/core'
import { TextSelection } from 'prosemirror-state'

export interface SentenceWithLocation {
    text: string
    id: string
    location: TextSelection
}

export function extractSentencesFromEditor(editor: Editor, longIDs?: boolean): Map<string, SentenceWithLocation> {
  const result: SentenceWithLocation[] = []

  const { doc } = editor.state
  const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("en", { granularity: "sentence" })
    : null

  let buffer = ''
  let bufferStart = 0 // document position where buffer started

  // Walk through all text nodes
  doc.descendants((node, pos) => {
    if (!node.isText) return true // skip non-text nodes

    const text = node.text ?? ''
    let localPos = pos

    if (segmenter) {
      for (const segment of segmenter.segment(text)) {
        const segmentText = segment.segment
        if (buffer === '') {
          bufferStart = localPos
        }

        buffer += segmentText

        // Assume every segment is a sentence (good for Intl.Segmenter)
        const start = localPos + segment.index
        const end = localPos + segment.index + segmentText.trim().length

        const selection = TextSelection.create(doc, start, end)
        const selectedText = doc.textBetween(start, end, "\n", "\n")

        if (selectedText !== buffer.trim()) {
          console.warn(`Text mismatch: expected [${JSON.stringify(buffer.trim())}], got [${JSON.stringify(selectedText)}]`)
        }

        result.push({
          text: buffer.trim(),
          id: longIDs ? crypto.randomUUID() : crypto.randomUUID().slice(0, 8),
          location: selection,
        })

        buffer = ''
      }
    } else {
      // Fallback: manual regex split
      const re = /([^.!?]+[.!?]+)(\s+|$)/g
      let match
      while ((match = re.exec(text)) !== null) {
        const sentenceText = match[1]

        if (buffer === '') {
          bufferStart = localPos + match.index
        }

        buffer += sentenceText

        const start = bufferStart
        const end = bufferStart + sentenceText.length

        const selection = TextSelection.create(doc, start, end)
        const selectedText = doc.textBetween(start, end, "\n", "\n")

        if (selectedText !== buffer.trim()) {
          console.warn(`Text mismatch: expected [${JSON.stringify(buffer.trim())}], got [${JSON.stringify(selectedText)}]`)
        }

        result.push({
          text: buffer.trim(),
          id: longIDs ? crypto.randomUUID() : crypto.randomUUID().slice(0, 8),
          location: selection,
        })

        buffer = ''
      }
    }

    return true
  })

  return new Map(result.map(sentence => [sentence.id, { ...sentence, text: removeCitationFragments(sentence.text) }]))
}

export function removeCitationFragments(text: string): string  {
    // Intl.Segmenter breaks on the opening bracket of a citation
    // so we need to remove open brackets at the end of sentences
    // and fragments like ^8] or 15] at the start of sentences
    // and replace them with an empty string

    return text.replace(/(\s*\[|\s*\^?\d+\])/g, '')
        .replace(/(\s*\[|\s*\^?\d+\])$/g, '')
        .replace(/^\s*\[|\s*\^?\d+\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}