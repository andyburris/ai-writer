import { BubbleMenu, EditorProvider, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCoState } from "jazz-react";
import { CoRichText } from "jazz-tools";
import { Document } from "../schema/document";
import { Plugin } from "@tiptap/pm/state";
import { createJazzPlugin } from "jazz-richtext-prosemirror";
import { JazzPluginConfig } from "jazz-richtext-prosemirror/src/lib/plugin";
import Placeholder from "@tiptap/extension-placeholder";

const extensions = [
    StarterKit,
    Placeholder.configure({ 
        placeholder: "Write something...",
        emptyEditorClass: "before:content-[attr(data-placeholder)] before:float-left before:text-stone-300 before:h-0 before:pointer-events-none",
    }),
]

export const Editor = ({ document, className, containerClassName }: { document: Document, className?: string, containerClassName?: string }) => {
    const loadedDocument = useCoState(Document, document.id, { resolve: { content: true } });
    if(!loadedDocument) return null;

    return (
    <EditorProvider 
        extensions={[
            ...extensions, 
            Extension.create({
                name: "jazz",
                addProseMirrorPlugins() {
                    return [createJazzPluginSafe(loadedDocument.content)]
                },
            })
        ]} 
        // content={loadedDocument.content.toString()}
        editorContainerProps={{
            className: containerClassName,
        }}
        editorProps={{
            attributes: {
                class: `prose prose-stone ${className}`,
            },
        }}
    >
      {/* <FloatingMenu editor={null}>This is the floating menu</FloatingMenu> */}
      <BubbleMenu editor={null}>This is the bubble menu</BubbleMenu>
    </EditorProvider>
  )
}

function createJazzPluginSafe(coRichText: CoRichText, config: JazzPluginConfig = {}) {
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
  