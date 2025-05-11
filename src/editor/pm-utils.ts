import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { EditorState } from '@tiptap/pm/state';

interface TextPosition {
  start: number;
  end: number;
  text: string;
}

/**
 * Finds the TextSelection for the first occurrence of the search text in a node.
 *
 * @param node - ProseMirror Node to search inside
 * @param nodeStartPos - Absolute starting position of the node in the document
 * @param searchText - Text to find
 * @param state - Tiptap/ProseMirror editor state
 * @returns TextSelection or null if not found
 */
export function findTextSelectionInNode(
  node: ProseMirrorNode,
  nodeStartPos: number,
  searchText: string,
  state: EditorState
): TextSelection | null {
  let textContent = '';
  const positions: TextPosition[] = [];

  node.descendants((child, pos) => {
    if (child.isText && child.text) {
      textContent += child.text;
      positions.push({
        start: pos,
        end: pos + child.nodeSize - 2, // text nodes size = text length + 2 (for start/end markers)
        text: child.text,
      });
    }
    return true; // keep descending
  });

  const index = textContent.indexOf(searchText);
  if (index === -1) {
    return null;
  }

  // Find the real start and end document positions
  let accumulated = 0;
  let startPos: number | null = null;
  let endPos: number | null = null;

  for (const part of positions) {
    if (accumulated + part.text.length >= index) {
      const offsetInNode = index - accumulated;
      startPos = nodeStartPos + part.start + offsetInNode;
      break;
    }
    accumulated += part.text.length;
  }

  accumulated = 0;
  for (const part of positions) {
    if (accumulated + part.text.length >= index + searchText.length) {
      const offsetInNode = (index + searchText.length) - accumulated;
      endPos = nodeStartPos + part.start + offsetInNode;
      break;
    }
    accumulated += part.text.length;
  }

  if (startPos !== null && endPos !== null) {
    return TextSelection.create(state.doc, startPos, endPos);
  }

  return null;
}
