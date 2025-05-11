import { ListBullets, Sparkle, Spinner, X } from "@phosphor-icons/react";
import Placeholder from "@tiptap/extension-placeholder";
import { BubbleMenu, EditorContent, Extension, useEditor, Editor as TTEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Resolved } from "jazz-tools";
import { useContext, useEffect, useState } from "react";
import { Button } from "../common/Components";
import { Comment, Document, DumpOutline } from "../schema/document";
import { CommentExtension } from "./comment-plugin";
import { createJazzPluginSafe } from "./jazz-plugin";
import UniqueId from "./unique-id-plugin";
import { set } from "zod";
import { extractSentencesFromEditor } from "./splitter";
import { IssueComment, MissingComment, sendFeedback, testAI } from "../ai/ai-feedback";
import { AIOptionsContext } from "../App";
import { AIModelSettings, AIOptions } from "../schema/schema";
import { createScaffold } from "../ai/ai-dumpoutline";
  

const extensions = [
    StarterKit.configure({
        paragraph: {
            HTMLAttributes: {
                class: "text-stone-900 font-serif my-4 first:mt-0 last:mb-0",
            }
        },
        heading: {
            levels: [1, 2, 3],
            HTMLAttributes: {
                class: "font-bold text-stone-900",
            },
        },
        bulletList: false, orderedList: false, listItem: false, blockquote: false, 
        // bulletList: {
        //     HTMLAttributes: {
        //         class: "list-disc list-inside pl-4",
        //     },
        // },
        // orderedList: {
        //     HTMLAttributes: {
        //         class: "list-decimal list-inside pl-4",
        //     },
        // },
    }),
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

export const Editor = ({ document, className, containerClassName }: { 
    document: Resolved<Document, { content: true, comments: { $each: {} }, dumpOutline: {} }>, 
    className?: string, 
    containerClassName?: string
 }) => {
    const aiOptions = useContext(AIOptionsContext)
    const [activeCommentID, setActiveCommentID] = useState<string | null>(null)
    const [isRunningFeedback, setIsRunningFeedback] = useState(false)
    const activeComment = activeCommentID ? document.comments[activeCommentID] : null

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
                    class: "bg-yellow-100 border-b-2 border-yellow-400 rounded-t-sm px-px -mx-px",
                },
                onCommentActivated: (commentID) => setActiveCommentID(commentID),
            }),
        ],
        editorProps: {
            attributes: {
                class: `prose prose-stone ${className} ${isRunningFeedback ? "pointer-events-none opacity-30" : ""}`,
            },
        },
    })

    useEffect(() => editor?.setOptions({ editable: !isRunningFeedback }), [isRunningFeedback])

    async function clearCommentsAndRun(toRun: ((editor: TTEditor, aiOption: Resolved<AIOptions, { modelSettings: {} }>) => Promise<void>)) {
        if(!editor || !aiOptions) return
        setIsRunningFeedback(true)
        Object.keys(document.comments).forEach(k => editor.commands.unsetComment(k))
        setActiveCommentID(null)
        document.comments.applyDiff({}) // clear comments
        await toRun(editor, aiOptions)
        setIsRunningFeedback(false)
    }

    return (
        <>
            <div className="sticky flex justify-end z-10 -top-4 left-0 h-0 px-4 gap-2">
                { aiOptions?.isDumpOutlineEnabled &&
                    <Button
                        kind="primary"
                        isDisabled={isRunningFeedback || !(document.dumpOutline.dump.trim().length > 1 && document.dumpOutline.outline.trim().length > 1)}
                        onPress={async () => {
                            await clearCommentsAndRun(async (editor, aiOptions) => {
                                await mergeOutlineAndDump(editor, document, aiOptions.modelSettings)
                            })
                        }}
                        className={"my-4"}
                    >
                        {isRunningFeedback && <Spinner className="animate-spin" />}
                        <ListBullets/>
                    </Button>
                }
                { aiOptions?.isFeedbackEnabled &&
                    <Button
                        kind="primary"
                        isDisabled={isRunningFeedback}
                        onPress={async () => {
                            await clearCommentsAndRun(async (editor, aiOptions) => {
                                await runFeedback(editor, document, aiOptions.modelSettings)
                            })
                        }}
                        className={"my-4"}
                    >
                        {isRunningFeedback && <Spinner className="animate-spin" />}
                        <Sparkle/>
                    </Button>
                }
            </div>
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
                    <div className="flex flex-col">
                        <p>{activeComment?.text}</p>
                        <p className="text-sm text-neutral-500">{activeCommentID} • {activeComment?.category} • {activeComment?.severity}</p>
                    </div>
                    <div className="flex">
                        {/* <Button onPress={() => console.log("html", proseMirrorToHtml(editor!.view.state.doc))}> <Code/> </Button> */}
                        <Button 
                            onPress={() => {
                                if(!activeCommentID) return
                                editor?.commands.unsetComment(activeCommentID)
                                setActiveCommentID(null)
                                const raw = document.comments._raw.asObject()
                                raw[activeCommentID] = undefined
                                document.comments[activeCommentID].applyDiff(raw)
                            }}
                        >
                            <X/>
                        </Button>
                    </div>
                </div>
            </BubbleMenu>
            <BubbleMenu editor={editor} className="bg-white shadow-outset rounded-xl p-1">
                <Button 
                    onPress={() => {
                        const commentID = crypto.randomUUID()
                        document.comments[commentID] = Comment.create({
                            dataId: commentID,
                            category: "test",
                            text: "Test",
                            severity: "low",
                        })
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

async function runFeedback(editor: TTEditor, document: Resolved<Document, { comments: { $each: {} }}>, modelSettings: AIModelSettings) {
    const sentences = extractSentencesFromEditor(editor)
    console.log(`Getting feedback for ${sentences.size} sentences`, sentences.values())
    const feedback = await sendFeedback(editor.$doc.textContent, document.prompt, Array.from(sentences.values()), modelSettings)
    // await testAI(aiOptions.modelSettings)
    console.log(`Got ${feedback.length} items of feedback`, feedback)

    const { missing, issues } = feedback.reduce((acc, item) => {
        if(item.type === "missing") { acc.missing.push(item) } else { acc.issues.push(item) }
        return acc
    }, { missing: [] as MissingComment[], issues: [] as IssueComment[] })
    issues.forEach(issue => {
        const selection = sentences.get(issue.sentenceID)!
        editor.commands.setComment(selection.id, selection.location)
        document.comments[issue.sentenceID] = Comment.create({
            dataId: selection.id,
            category: issue.category,
            text: issue.feedback,
            severity: issue.severity,
        })
    })

}

async function mergeOutlineAndDump(editor: TTEditor, document: Resolved<Document, { dumpOutline: {} }>, modelSettings: AIModelSettings) {
    // convert dump and outline HTML to text
    const dumpText = document.dumpOutline.dump.replace(/<\/[^>]+>/g, '\n').replace(/<[^>]+>/g, '').replace("\n\n", "\n")
    const outlineText = document.dumpOutline.outline.replace(/<\/[^>]+>/g, '\n').replace(/<[^>]+>/g, '').replace("\n\n", "\n")

    console.log("Creating scaffold with dump and outline", {dumpText, outlineText})
    const scaffold = await createScaffold(dumpText, outlineText, document.prompt, modelSettings)
    console.log("Created scaffold", scaffold)

    editor.commands.clearContent()
    editor.commands.setContent(scaffold, true, { preserveWhitespace: "full" })
}