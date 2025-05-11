import { co, CoList, CoMap, CoRichText } from "jazz-tools";

export class Comment extends CoMap {
    dataId = co.string
    text = co.string
    category = co.string
    severity = co.literal("low", "medium", "high")
    position = co.optional.literal("before", "after")
}
export class DumpOutline extends CoMap {
    dump = co.string
    outline = co.string
}
export class Document extends CoMap {
    title = co.string
    prompt = co.string
    content = co.ref(CoRichText)
    comments = co.ref(CoMap.Record(co.ref(Comment)))
    dumpOutline = co.ref(DumpOutline);
}
export class DocumentList extends CoList.Of(co.ref(Document)) {}