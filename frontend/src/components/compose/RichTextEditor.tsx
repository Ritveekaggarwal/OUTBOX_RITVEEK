import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';

export interface RichTextEditorProps {
  onChange: (html: string, isEmpty: boolean) => void;
  placeholder?: string;
}

/** Figma "Type Your Reply..." editor: grey canvas with the toolbar pinned on top. */
export function RichTextEditor({ onChange, placeholder = 'Type Your Reply...' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        class: 'prose-editor min-h-[260px] px-1 text-sm leading-relaxed text-ink-900 outline-none',
        'aria-label': 'Email body',
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML(), instance.isEmpty),
  });

  return (
    <div className="rounded-xl bg-surface-subtle p-4 ring-1 ring-surface-line transition focus-within:ring-brand-500/30">
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="mt-4" />
    </div>
  );
}
