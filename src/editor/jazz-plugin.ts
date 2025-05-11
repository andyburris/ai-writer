/****** CUSTOM *******/

export function createJazzPluginSafe(coRichText: CoRichText, config: JazzPluginConfig = {}) {
  const plugin = createJazzPlugin(coRichText, config);

  // Replace the broken `state.init()` with a no-op
  const patchedPlugin = new Plugin({
    ...plugin.spec,
    state: {
      init: () => ({ coRichText }),
      apply: plugin.spec.state!.apply ?? ((tr, val) => val),
    },
  });

  return patchedPlugin;
}

import {
    DOMOutputSpec,
    MarkSpec,
    DOMParser as PMDOMParser,
    DOMSerializer as PMDOMSerializer,
    Node as PMNode,
    Schema,
} from "prosemirror-model";
import { nodes as basicNodes, marks as basicMarks } from "prosemirror-schema-basic";
import { orderedList, bulletList, listItem } from "prosemirror-schema-list";

export function htmlToProseMirror(content: string) {
    const doc = new DOMParser().parseFromString(content, "text/html");
    const node = PMDOMParser.fromSchema(extendedSchema).parse(doc);
    return node;
  }
  

export function proseMirrorToHtml(doc: PMNode) {
    return new XMLSerializer()
        .serializeToString(PMDOMSerializer.fromSchema(extendedSchema).serializeFragment(doc.content))
        .replace(/\sxmlns="[^"]+"/g, "");
}

const extendedSchema: Schema<
    "blockquote" | "image" | "text" | "doc" | "paragraph" | "horizontalRule" | "heading" | "codeBlock" | "hardBreak", // | "bulletList" | "orderedList" | "listItem", 
    "link" | "code" | "em" | "strong" | "comment"
> = new Schema({
    nodes: {
        ...basicNodes,
        horizontalRule: basicNodes.horizontal_rule,
        codeBlock: basicNodes.code_block,
        hardBreak: basicNodes.hard_break,
        // listItem: listItem,
        // bulletList: bulletList,
        // orderedList: orderedList,
        paragraph: {
            attrs: {
                dataId: { default: null, validate: "string|null" },
            },
            content: "inline*",
            group: "block",
            parseDOM: [{ tag: "p", getAttrs(dom: HTMLElement) { return { dataId: dom.dataset["id"] ?? null }} }],
            toDOM(node) { 
                let { dataId } = node.attrs;
                if(!dataId) return ["p", 0];
                return ["p", {"data-id": dataId}, 0];
            }
        },
    },
    marks: {
        ...basicMarks,
        comment: {
            attrs: {
                commentId: { validate: "string" },
            },
            parseDOM: [
                {tag: "comment", getAttrs(dom: HTMLElement) { return {commentId: dom.getAttribute("commentId")} }},
            ],
            toDOM(node) { 
                let {commentId} = node.attrs; 
                return ["comment", {commentId}, 0] 
            }
        } as MarkSpec

    }
})

/*********** COPIED ************/

import { CoRichText } from "jazz-tools";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
/**
 * Configuration options for the Jazz plugin
 */
export interface JazzPluginConfig {
  /** Whether to show caret and selection decorations */
  showDecorations?: boolean;
}

/**
 * Unique key for the Jazz plugin to identify it in the ProseMirror state.
 * This key is used to access the plugin's state and view from the editor.
 */
export const jazzPluginKey = new PluginKey("jazz");

/**
 * Creates a ProseMirror plugin that synchronizes a CoRichText instance with a ProseMirror editor.
 *
 * This plugin enables bidirectional synchronization between a CoRichText instance
 * and a ProseMirror editor. It handles:
 * - Initializing the editor with CoRichText content
 * - Updating the editor when CoRichText changes
 * - Updating CoRichText when the editor changes
 * - Managing the editor view lifecycle
 *
 * @param coRichText - The CoRichText instance to synchronize with the editor.
 *                     If undefined, the plugin will still work but won't sync with CoRichText.
 * @param config - Optional configuration for the plugin
 * @returns A ProseMirror plugin instance that can be added to an editor
 *
 * @example
 * ```typescript
 * const coRichText = new CoRichText({ text: "<p>Hello</p>", owner: account });
 * const plugin = createJazzPlugin(coRichText, { showDecorations: true });
 * const state = EditorState.create({
 *   schema,
 *   plugins: [plugin],
 * });
 * ```
 */
export function createJazzPlugin(
  coRichText: CoRichText | undefined,
  config: JazzPluginConfig = {},
) {
  const { setView, handleCoRichTextChange, handleProseMirrorChange } =
    createSyncHandlers(coRichText);

  return new Plugin({
    key: jazzPluginKey,

    view(editorView) {
      setView(editorView);

      if (coRichText) {
        coRichText.subscribe(handleCoRichTextChange);
      }

      return {
        destroy() {
          setView(undefined);
        },
      };
    },

    state: {
      init(_config, state) {
        if (coRichText) {
          const pmDoc = htmlToProseMirror(coRichText.toString());
          state.doc = pmDoc;
        }
        return { coRichText };
      },

      apply(tr, value) {
        handleProseMirrorChange(tr);
        return value;
      },
    },

    props: {
      decorations(state) {
        if (!config.showDecorations) {
          return null;
        }

        const selection = state.selection;

        if (selection.empty) {
          const caret = Decoration.widget(selection.from, () => {
            const div = document.createElement("span");
            div.className = "jazz-caret";
            div.style.borderLeft = "2px solid red";
            div.style.marginLeft = "-2px";
            div.style.backgroundColor = "rgba(255,0,0,0.1)";
            return div;
          });

          return DecorationSet.create(state.doc, [caret]);
        }

        const selectionDecoration = Decoration.inline(
          selection.from,
          selection.to,
          {
            class: "jazz-caret-selection",
            style:
              "border-left: 2px solid red; margin-left: -2px; background: rgba(255,0,0,0.1);",
          },
        );

        return DecorationSet.create(state.doc, [selectionDecoration]);
      },
    },
  });
}

import { recreateTransform } from "@manuscripts/prosemirror-recreate-steps";
import { Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

/**
 * Metadata key used to identify changes originating from Jazz.
 * This is used to prevent infinite update loops between CoRichText and ProseMirror.
 */
export const META_KEY = "fromJazz";

/**
 * Creates handlers for bidirectional synchronization between CoRichText and ProseMirror.
 *
 * This function returns a set of handlers that manage the synchronization between
 * a CoRichText instance and a ProseMirror editor. It handles:
 * - Updating the ProseMirror editor when CoRichText changes
 * - Updating CoRichText when the ProseMirror editor changes
 * - Preventing infinite update loops
 *
 * @param coRichText - The CoRichText instance to synchronize with
 * @returns An object containing the synchronization handlers:
 *   - setView: Function to set the current ProseMirror view
 *   - handleCoRichTextChange: Handler for CoRichText changes
 *   - handleProseMirrorChange: Handler for ProseMirror changes
 *
 * @example
 * ```typescript
 * const handlers = createSyncHandlers(coRichText);
 * handlers.setView(editorView);
 * ```
 */
export function createSyncHandlers(coRichText: CoRichText | undefined) {
  // Store the editor view in a closure
  let view: EditorView | undefined;

  /**
   * Handles changes from CoRichText by updating the ProseMirror editor.
   *
   * When CoRichText content changes, this function:
   * 1. Converts the new content to a ProseMirror document
   * 2. Creates a transaction to replace the editor's content
   * 3. Marks the transaction as coming from Jazz to prevent loops
   * 4. Dispatches the transaction to update the editor
   *
   * @param newText - The updated CoRichText instance
   */
  function handleCoRichTextChange(newText: CoRichText) {
    if (!view || !newText) return;

    const pmDoc = htmlToProseMirror(newText.toString());
    const transform = recreateTransform(view.state.doc, pmDoc);

    // Create a new transaction
    const tr = view.state.tr;

    // Apply all steps from the transform to the transaction
    transform.steps.forEach((step) => {
      tr.step(step);
    });

    tr.setMeta(META_KEY, true);
    view.dispatch(tr);
  }

  /**
   * Handles changes from ProseMirror by updating the CoRichText.
   *
   * When the ProseMirror editor content changes, this function:
   * 1. Checks if the change originated from Jazz (to prevent loops)
   * 2. Converts the new content to HTML
   * 3. Updates the CoRichText with the new content
   *
   * @param tr - The ProseMirror transaction representing the change
   */
  function handleProseMirrorChange(tr: Transaction) {
    if (!coRichText || tr.getMeta(META_KEY) || tr.getMeta("appendedTransaction")?.getMeta(META_KEY)) return;

    if (tr.docChanged) {
      const str = proseMirrorToHtml(tr.doc);
      coRichText.applyDiff(str);
    }
  }

  return {
    setView: (newView?: EditorView) => {
      view = newView;
    },
    handleCoRichTextChange,
    handleProseMirrorChange,
  };
}