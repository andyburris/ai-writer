import { Code, Printer, X } from "@phosphor-icons/react";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin } from "@tiptap/pm/state";
import { BubbleMenu, EditorContent, Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { JazzPluginConfig } from "jazz-richtext-prosemirror/src/lib/plugin";
import { CoRichText, Resolved } from "jazz-tools";
import { useState } from "react";
import { Button } from "../common/Components";
import { Document } from "../schema/document";
import { CommentExtension } from "./comment-plugin";
import { createJazzPlugin, proseMirrorToHtml } from "./jazz-plugin";
import UniqueId from "./unique-id-plugin";
import { useFeedbackCoordinator, useReadyParagraphsOnCursorExit, useSentenceHashesFromHTML } from "./useFeedbackTriggers";
  

const extensions = [
    StarterKit,
    Placeholder.configure({ 
        placeholder: "Write something...",
        emptyEditorClass: "before:content-[attr(data-placeholder)] before:float-left before:text-stone-300 before:h-0 before:pointer-events-none",
    }),
    UniqueId.configure({
        attributeName: "dataId",
        types: ["paragraph"],
        createId: () => crypto.randomUUID(),
    }),
]

export const Editor = ({ document, className, containerClassName }: { document: Resolved<Document, { content: true }>, className?: string, containerClassName?: string }) => {
    const [activeCommentID, setActiveCommentID] = useState<string | null>(null)
    const editor = useEditor({
        extensions: [
            ...extensions, 
            Extension.create({
                name: "jazz",
                addProseMirrorPlugins() {
                    return [createJazzPluginSafe(document.content)]
                },
            }),
            CommentExtension.configure({
                HTMLAttributes: {
                    class: "bg-yellow-200 border-b-2 border-yellow-400 rounded-t-sm px-px -mx-px",
                },
                onCommentActivated: (commentID) => setActiveCommentID(commentID),
            }),
        ],
        editorProps: {
            attributes: {
                class: `prose prose-stone ${className}`,
            },
        },
    })
    const hashes = useSentenceHashesFromHTML(document.content.toString())
    const { readyParagraphs, markParagraphSent } = useReadyParagraphsOnCursorExit(editor)
    useFeedbackCoordinator(editor, document.content.toString())

    return (
        <>
            <EditorContent editor={editor} className={containerClassName} />
            {/* <FloatingMenu editor={null}>This is the floating menu</FloatingMenu> */}
            <BubbleMenu 
                editor={editor} 
                className="bg-white shadow-outset rounded-xl"
                shouldShow={({ state }) => {
                    let found = false
                    state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
                        if (node.marks.length > 0) {
                            const commentMark = node.marks.find((mark) => mark.type.name === "comment")
                            if (commentMark) {
                                found = true
                            }
                        }
                    })
                    return found
                    // return activeCommentId.current !== null
                }}
            >
                <div className="flex items-center gap-2 p-2">
                    <p>{activeCommentID}</p>
                    {/* <Button onPress={() => console.log("doc", editor!.view.state.doc)}> <Code/> </Button> */}
                    <Button onPress={() => console.log("html", proseMirrorToHtml(editor!.view.state.doc))}> <Code/> </Button>
                    {/* <Button onPress={() => console.log("hashes", hashes)}> <Printer/> </Button> */}
                    <Button onPress={() => console.log("readyParagraphs", readyParagraphs)}> <Printer/> </Button>
                    <Button 
                        onPress={() => {
                            if(!activeCommentID) return
                            editor?.commands.unsetComment(activeCommentID)
                            setActiveCommentID(null)
                        }}
                    >
                        <X/>
                    </Button>
                </div>
            </BubbleMenu>
            <BubbleMenu editor={editor} className="bg-white shadow-outset rounded-xl p-1">
                <Button 
                    onPress={() => {
                        const commentID = crypto.randomUUID()
                        editor?.commands.setComment(commentID)
                        setActiveCommentID(commentID)
                    }}
                >
                    Comment
                </Button>
            </BubbleMenu>
        </>
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
