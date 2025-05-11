import { Switch, TextFieldProps } from "react-aria-components";
import { AIOptions } from "../schema/schema";
import { useCoState } from "jazz-react";
import { TextAreaField } from "../common/Components";

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
            <div className="w-full grow overflow-y-scroll h-24 shrink">
                <OptionsSection title="Model Settings">
                    <SwitchWithLabel
                        isSelected={loadedOptions.modelSettings.source === "ollama"}
                        onChange={async (isSelected) => {
                            loadedOptions.modelSettings.source = isSelected ? "ollama" : "openai"
                        }}
                        label="Use local model (Ollama)"
                    />
                    <TextFieldWithLabel
                        value={loadedOptions.modelSettings.model}
                        onChange={value => loadedOptions.modelSettings.model = value}
                        label="Model name"
                    />
                    { loadedOptions.modelSettings.source === "openai" && (
                        <TextFieldWithLabel
                            value={loadedOptions.modelSettings.apiKey}
                            onChange={value => loadedOptions.modelSettings.apiKey = value}
                            label="API Key"
                            type="password"
                        />
                    )}
                    { loadedOptions.modelSettings.source === "ollama" && (
                        <TextFieldWithLabel
                            value={loadedOptions.modelSettings.ollamaURL}
                            onChange={value => loadedOptions.modelSettings.ollamaURL = value}
                            label="Ollama URL"
                        />
                    )}
                </OptionsSection>
                <OptionsSection title="Feedback Settings">
                    <SwitchWithLabel
                        isSelected={loadedOptions.isFeedbackEnabled}
                        onChange={isSelected => loadedOptions.isFeedbackEnabled = isSelected}
                        label="Give feedback"
                    />
                    <SwitchWithLabel
                        isSelected={loadedOptions.isDumpOutlineEnabled}
                        onChange={isSelected => loadedOptions.isDumpOutlineEnabled = isSelected}
                        label="Scaffold essay with braindump and outline"
                    />
                </OptionsSection>
            </div>
        </div>
    )
}

function OptionsSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2 items-stretch px-4 py-4 border-b border-stone-200">
            <p className="font-semibold text-stone-500">{title}</p>
            {children}
        </div>
    )
}

function SwitchWithLabel({ label, ...props }: { label: string } & React.ComponentProps<typeof Switch>) {
    return (
        <Switch {...props} className={`group flex items-center gap-3 justify-between ${props.className}`}>
            {label}
            <div className="flex h-[26px] w-[44px] shrink-0 cursor-default rounded-full shadow-inner bg-clip-padding border border-solid border-white/30 p-[3px] box-border transition duration-200 ease-in-out bg-stone-100 group-pressed:bg-stone-700 group-selected:bg-stone-800 group-selected:group-pressed:bg-stone-900 outline-hidden group-focus-visible:ring-2 ring-black">
                <span className="h-[18px] w-[18px] transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out translate-x-0 group-selected:translate-x-[100%]" />
            </div>
        </Switch>
    )
}

function TextFieldWithLabel({ label, ...props }: { label: string } & TextFieldProps & React.RefAttributes<HTMLDivElement>) {
    return (
        <div className={`flex flex-col gap-1 ${props.className}`}>
            <p className="">{label}</p>
            <TextAreaField {...props} className={``} aria-label={label} kind="background"/>
        </div>
    )
}