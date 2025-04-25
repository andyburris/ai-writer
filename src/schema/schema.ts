/**
 * Learn about schemas here:
 * https://jazz.tools/docs/react/schemas/covalues
 */

import { Account, CoMap, CoPlainText, CoRichText, Group, Profile, co } from "jazz-tools";
import { Document, DocumentList } from "./document";

export class JazzProfile extends Profile {
}

export class AIModelSettings extends CoMap {
  source = co.literal("openai", "ollama")
  model = co.string
  ollamaURL = co.string
  apiKey = co.string
}
export class AIOptions extends CoMap {
  modelSettings = co.ref(AIModelSettings)
  isFeedbackEnabled = co.boolean
  isDumpOutlineEnabled = co.boolean
  isAutoCiteEnabled = co.boolean
}
export class AccountRoot extends CoMap {
  documents = co.ref(DocumentList);
  aiOptions = co.ref(AIOptions);
}

export class JazzAccount extends Account {
  profile = co.ref(JazzProfile);
  root = co.ref(AccountRoot);


  migrate(this: JazzAccount) {
    if (this.root === undefined) {
      const group = Group.create();

      const initialDocument = Document.create({ title: "Document", content: CoRichText.create("", { owner: group }) })
      this.root = AccountRoot.create(
        {
          documents: DocumentList.create([initialDocument], group),
          aiOptions: AIOptions.create({
            modelSettings: AIModelSettings.create({
              source: "ollama",
              model: "llama3",
              ollamaURL: "http://localhost:11434",
              apiKey: "",
            }),
            isFeedbackEnabled: false,
            isDumpOutlineEnabled: false,
            isAutoCiteEnabled: false,
          }),
        },
        group,
      );
    }

    if (this.profile === undefined) {
      const group = Group.create();
      group.addMember("everyone", "reader"); // The profile info is visible to everyone

      this.profile = JazzProfile.create(
        {
          name: "Anonymous user",
        },
        group,
      );
    }
  }
}
