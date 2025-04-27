import { useAccount, useIsAuthenticated } from "jazz-react";
import { Editor } from "./editor/Editor";
import { PromptCard } from "./home/PromptCard";
import { AIOptionsCard } from "./home/AIOptions";
import { JazzInspector } from "jazz-inspector";
import React from "react";
import { Resolved } from "jazz-tools";
import { AIModelSettings } from "./schema/schema";

const DEBUGHTML = false;
export const ModelSettingsContext = React.createContext<Resolved<AIModelSettings, {}> | undefined>(undefined);

function App() {
  const { me } = useAccount({ resolve: { profile: true, root: { documents: { $each: { content: true } }, aiOptions: { modelSettings: true } } } });

  return (
    <ModelSettingsContext.Provider value={me?.root.aiOptions.modelSettings}>
      <main className="flex w-screen h-screen p-4 pb-0 gap-4 bg-stone-100">
        <div className="w-full h-full rounded-t-2xl bg-white shadow-outset overflow-hidden">
          { DEBUGHTML && <p>{me?.root.documents[0]?.content.toString()}</p> }
          { me && <Editor document={me.root.documents[0]} className="w-full h-full p-4 focus:outline-hidden overflow-y-scroll" containerClassName="w-full h-full"/> }
        </div>
        <div className="flex flex-col gap-2 w-96">
          { me && <PromptCard document={me.root.documents[0]} /> }
          { me && <AIOptionsCard options={me.root.aiOptions} className="flex flex-col h-full rounded-t-2xl bg-white shadow-outset w-full"/> }
        </div>
      </main>
      <JazzInspector position="bottom right"/>
    </ModelSettingsContext.Provider>
  );
}

export default App;
