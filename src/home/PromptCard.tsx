import { ArrowsClockwise } from "@phosphor-icons/react";
import { Button } from "../common/Components";
import { Document } from "../schema/document";
import { getEssayPrompt } from "../ai/ai-prompt";


export function PromptCard({ document }: { document: Document }) {
    return (
        <div className="flex flex-col items-start bg-stone-200 border border-stone-300 rounded-3xl py-1 pr-2">
            <div className="flex items-center pl-4 w-full justify-between">
                <p className="font-semibold text-stone-500">Prompt</p>
                <Button
                    className="hover:bg-stone-300"
                    onPress={async () => {
                        const lastLoaded = new Date(document.prompt?.slice("LOADING".length) ?? "0").getTime()
                        if(lastLoaded > 0 && (Date.now() - lastLoaded) < 10000) return

                        document.prompt = "LOADING" + new Date().toISOString()
                        const prompt = await getEssayPrompt({ provider: "ollama", model: "gemma3" })
                        console.log("got prompt", prompt)
                        document.prompt = prompt
                    }}
                >
                    <ArrowsClockwise />
                </Button>
            </div>
            <div className={document.prompt ? "px-4 pb-2" : ""}>
                { document.prompt?.startsWith("LOADING") ? <div className="h-4 w-20 rounded-full bg-stone-300"/>
                : !document.prompt ? null
                : <p className="">{document.prompt}</p>
                }
            </div>
        </div>
    );

}