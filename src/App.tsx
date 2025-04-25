import { useAccount, useIsAuthenticated } from "jazz-react";
import { Editor } from "./editor/Editor";
import { Button } from "./common/Components";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { PromptCard } from "./home/PromptCard";
import { AIOptionsCard } from "./home/AIOptions";

function App() {
  const { me } = useAccount({ resolve: { profile: true, root: { documents: { $each: true }, aiOptions: true } } });

  return (
    <>
      <main className="flex w-screen h-screen p-4 pb-0 gap-4 bg-stone-100">
        <div className="w-full h-full rounded-t-3xl bg-white shadow-outset overflow-hidden">
          { me && <Editor document={me.root.documents[0]} className="w-full h-full p-4 focus:outline-none overflow-y-scroll" containerClassName="w-full h-full"/> }
        </div>
        <div className="flex flex-col gap-2 w-96">
          { me && <PromptCard document={me.root.documents[0]} /> }
          { me && <AIOptionsCard options={me.root.aiOptions} className="flex flex-col h-full rounded-t-3xl bg-white shadow-outset w-full"/> }
        </div>
      </main>
    </>
  );
}

export default App;
