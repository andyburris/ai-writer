import { Mark, mergeAttributes, Range } from "@tiptap/core";
import { Mark as PMMark } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      /**
       * Set a comment (add)
       */
      setComment: (commentId: string, commentRange?: TextSelection) => ReturnType;
      /**
       * Unset a comment (remove)
       */
      unsetComment: (commentId: string) => ReturnType;
    };
  }
}

export interface MarkWithRange {
  mark: PMMark;
  range: Range;
}

export interface CommentOptions {
  HTMLAttributes: Record<string, any>;
  onCommentActivated: (commentId: string | null) => void;
}

export interface CommentStorage {
  activeCommentId: string | null;
}

export const CommentExtension = Mark.create<CommentOptions, CommentStorage>({
  name: "comment",

  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentActivated: () => {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) =>
          (el as HTMLSpanElement).getAttribute("data-comment-id"),
        renderHTML: (attrs) => ({ "data-comment-id": attrs.commentId }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "comment[data-comment-id]",
        getAttrs: (el) =>
          !!(el as HTMLSpanElement).getAttribute("data-comment-id")?.trim() &&
          null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "comment",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  onSelectionUpdate() {
    const { $from } = this.editor.state.selection;

    const marks = $from.marks();

    if (!marks.length) {
      this.storage.activeCommentId = null;
      this.options.onCommentActivated(this.storage.activeCommentId);
      return;
    }

    const commentMark = this.editor.schema.marks.comment;

    const activeCommentMark = marks.find((mark) => mark.type === commentMark);

    this.storage.activeCommentId = activeCommentMark?.attrs.commentId || null;

    this.options.onCommentActivated(this.storage.activeCommentId);
  },

  addStorage() {
    return {
      activeCommentId: null,
    };
  },

  addCommands() {
    return {
      setComment:
        (commentId, commentRange) =>
        ({ commands, dispatch, tr }) => {
          if (!commentId) return false;
          // use current selection if no range is provided
          if(!commentRange) return commands.setMark("comment", { commentId });
          // use the provided range
          const from = commentRange.$from.pos;
          const to = commentRange.$to.pos;
          const commentMark = this.editor.schema.marks.comment.create({commentId});
          const trWithComment = tr.addMark(from, to, commentMark);
          return dispatch?.(trWithComment);
        },
      unsetComment:
        (commentId) =>
        ({ tr, dispatch }) => {
          if (!commentId) return false;

          const commentMarksWithRange: MarkWithRange[] = [];

          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              (mark) =>
                mark.type.name === "comment" &&
                mark.attrs.commentId === commentId,
            );

            if (!commentMark) return;

            commentMarksWithRange.push({
              mark: commentMark,
              range: {
                from: pos,
                to: pos + node.nodeSize,
              },
            });
          });

          commentMarksWithRange.forEach(({ mark, range }) => {
            tr.removeMark(range.from, range.to, mark);
          });

          return dispatch?.(tr);
        },
    };
  },
});