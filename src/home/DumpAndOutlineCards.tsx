import { Resolved } from "jazz-tools";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { Button } from "../common/Components";
import { CaretUp } from "@phosphor-icons/react";
import { DumpOutline } from "../schema/document";

export function DumpAndOutlineCards({ dumpOutline, className }: { dumpOutline: Resolved<DumpOutline, {}>, className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
        <EditorCard
            title="Braindump"
            content={dumpOutline.dump}
            onChange={content => dumpOutline.dump = content}
        />
        <EditorCard
            title="Outline"
            content={dumpOutline.outline}
            onChange={content => dumpOutline.outline = content}
        />
    </div>
  );
}

export function EditorCard({ title, content, onChange }: { title: string, content: string, onChange: (content: string) => void }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const editor = useEditor({
        content: content,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html);
        },
        editorProps: {
            attributes: {
                class: "text-stone-900 font-serif px-4 py-3 pt-1 focus:outline-none",
            },
        },
        extensions: [StarterKit.configure({
            heading: false, listItem: false, bulletList: false, orderedList: false, blockquote: false,
        })]
    })
  
    return (
    <div className="flex flex-col bg-stone-200 border border-stone-300 rounded-2xl">
        <div className={`flex items-center justify-between px-4 py-2 ${isCollapsed ? "" : "pb-0"}`}>
            <p className="font-semibold text-stone-500">{title}</p>
            <Button
                onPress={() => setIsCollapsed(!isCollapsed)}
                className={`hover:bg-stone-300`}
            >
                <CaretUp className={`transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
            </Button>
        </div>
        { !isCollapsed && 
            <EditorContent editor={editor} />
        }
    </div>
  );
}