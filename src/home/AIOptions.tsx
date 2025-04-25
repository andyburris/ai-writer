import { Switch } from "react-aria-components";
import { AIOptions } from "../schema/schema";
import { useCoState } from "jazz-react";

export function AIOptionsCard({ options, className }: { options: AIOptions, className?: string }) {
    const loadedOptions = useCoState(AIOptions, options.id, { resolve: { 
        modelSettings: {},
    }})
    if (!loadedOptions) return <div className={className} />

    return (
        <div className={className}>
            <div className="p-4 border-b border-stone-200">
                <p className="font-semibold">AI</p>
            </div>
            <div className="w-full grow overflow-y-scroll">
                <OptionsSection title="Model Settings">
                    <div className="flex flex-col gap-2">
                        <Switch
                            isSelected={loadedOptions.modelSettings.source === "ollama"}
                            onChange={async (isSelected) => {
                                loadedOptions.modelSettings.source = isSelected ? "ollama" : "openai"
                            }}
                        >
                                <div className="flex h-[26px] w-[44px] shrink-0 cursor-default rounded-full shadow-inner bg-clip-padding border border-solid border-white/30 p-[3px] box-border transition duration-200 ease-in-out bg-stone-100 group-pressed:bg-stone-700 group-selected:bg-stone-800 group-selected:group-pressed:bg-stone-900 outline-hidden group-focus-visible:ring-2 ring-black">
                                    <span className="h-[18px] w-[18px] transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out translate-x-0 group-selected:translate-x-[100%]" />
                                </div>
                                Use local model with Ollama
                        </Switch>
                    </div>
                </OptionsSection>
            </div>
        </div>
    )
}

function OptionsSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2 px-4 py-4 border-b border-stone-200">
            <p className="font-semibold text-stone-500">{title}</p>
            {children}
        </div>
    )
}