import { useAccount, useIsAuthenticated } from "jazz-react";
import { Editor } from "./editor/Editor";
import { PromptCard } from "./home/PromptCard";
import { AIOptionsCard } from "./home/AIOptionsCard";
import { JazzInspector } from "jazz-inspector";
import React from "react";
import { Resolved } from "jazz-tools";
import { AIModelSettings, AIOptions } from "./schema/schema";
import { DumpAndOutlineCards } from "./home/DumpAndOutlineCards";

const DEBUGHTML = false;
export const AIOptionsContext = React.createContext<Resolved<AIOptions, { modelSettings: {} }> | undefined>(undefined);

function App() {
  const { me } = useAccount({ resolve: { profile: true, root: { 
    documents: { $each: { content: true, comments: { $each: {} }, dumpOutline: {} } }, 
    aiOptions: { modelSettings: true },
  } } });

  return (
    <AIOptionsContext.Provider value={me?.root.aiOptions}>
      <main className="flex w-screen h-screen p-4 pb-0 gap-4 bg-stone-100 overflow-y-scroll">
        <div className="flex flex-col gap-2 grow">
          { me && <PromptCard document={me.root.documents[0]} /> }
          { me?.root.aiOptions.isDumpOutlineEnabled &&
            <DumpAndOutlineCards dumpOutline={me.root.documents[0].dumpOutline} className="w-full" />
          }
          <div className="w-full grow rounded-t-2xl bg-white shadow-outset relative">
            { me && 
              <Editor 
                document={me.root.documents[0]} 
                className="w-full p-4 focus:outline-hidden" 
                containerClassName="w-full"
              /> 
            }
          </div>
        </div>
        <div className="flex flex-col gap-2 w-72 shrink-0 sticky top-0">
          { me && <AIOptionsCard options={me.root.aiOptions} className="flex flex-col rounded-t-2xl bg-white shadow-outset w-full grow"/> }
        </div>
      </main>
      <JazzInspector position="bottom right"/>
    </AIOptionsContext.Provider>
  );
}

export default App;
