import { co, CoList, CoMap, CoRichText } from "jazz-tools";

export class Document extends CoMap {
    title = co.string
    prompt = co.string
    content = co.ref(CoRichText)
}
export class DocumentList extends CoList.Of(co.ref(Document)) {}