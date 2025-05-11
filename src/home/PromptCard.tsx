import { ArrowsClockwise, Check, PencilLine, PencilSimpleLine } from "@phosphor-icons/react";
import { Button, TextAreaField } from "../common/Components";
import { Document } from "../schema/document";
import { getEssayPrompt } from "../ai/ai-prompt";
import { useContext, useState } from "react";
import { Input, TextArea, TextField } from "react-aria-components";
import { AIOptionsContext } from "../App";


export function PromptCard({ document }: { document: Document }) {
    const aiOptions = useContext(AIOptionsContext)
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState<Date | undefined>(undefined);
    
    return (
        <div className="flex flex-col items-stretch bg-stone-200 border border-stone-300 rounded-2xl py-1 pr-2">
            <div className="flex items-center pl-4 w-full justify-between">
                <p className="font-semibold text-stone-500">Prompt</p>
                <div className="flex items-center">
                    <Button
                        className="hover:bg-stone-300"
                        onPress={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? <Check/> : <PencilSimpleLine/> }
                    </Button>
                    <Button
                        className="hover:bg-stone-300"
                        isDisabled={(isLoading && isLoading.getTime() > Date.now() - 1000) || isEditing}
                        onPress={async () => {
                            setIsLoading(new Date())
                            const prompt = await getEssayPrompt(aiOptions!.modelSettings).catch(e => { console.error(e); return undefined })
                            console.log("got prompt", prompt)
                            document.prompt = prompt ?? ""
                            setIsLoading(undefined)
                        }}
                    >
                        <ArrowsClockwise />
                    </Button>
                </div>
            </div>
            { isEditing 
                ? <TextAreaField
                    value={document.prompt}
                    onChange={(value) => document.prompt = value}
                    className={"ml-2 mb-1 -mt-1"}
                    kind="background"
                    onFocus={(e) => e.target.setSelectionRange(0, e.target.value.length)}
                    autoFocus
                    aria-label="Edit prompt"
                />
                : <div className={"px-4 pb-2"}>
                    { isLoading ? <div className="h-4 w-20 rounded-full bg-stone-300"/>
                    : !document.prompt ? <p className="text-stone-400">None</p>
                    : <p className="font-serif">{document.prompt}</p>
                    }
                </div>
            }
        </div>
    );

}