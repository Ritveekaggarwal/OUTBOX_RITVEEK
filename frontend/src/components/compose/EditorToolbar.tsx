import type { Editor } from '@tiptap/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  AlignIcon,
  BoldIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  CodeIcon,
  IndentIcon,
  ItalicIcon,
  ListBulletIcon,
  ListOrderedIcon,
  OutdentIcon,
  QuoteIcon,
  RedoIcon,
  StrikeIcon,
  TextSizeIcon,
  UnderlineIcon,
  UndoIcon,
} from '../icons';
import { IconButton } from '../ui/IconButton';
import { Popover } from '../ui/Popover';

const Divider = () => <span className="mx-1 h-4 w-px bg-ink-300/60" aria-hidden="true" />;

function Tool({ label, icon, onClick, active, disabled }: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <IconButton
      size="sm"
      label={label}
      icon={icon}
      active={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={active ? 'text-brand-600' : undefined}
    />
  );
}

const HEADINGS = [
  { label: 'Normal text', level: 0 },
  { label: 'Heading 1', level: 1 },
  { label: 'Heading 2', level: 2 },
  { label: 'Heading 3', level: 3 },
] as const;

const ALIGNMENTS = ['left', 'center', 'right'] as const;

/** Figma editor toolbar: undo/redo · text size · B I U · align · lists · indent · quote · code · strike. */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const [sizeOpen, setSizeOpen] = useState(false);
  const chain = () => editor.chain().focus();
  const alignment = ALIGNMENTS.find((align) => editor.isActive({ textAlign: align })) ?? 'left';
  const nextAlignment = ALIGNMENTS[(ALIGNMENTS.indexOf(alignment) + 1) % ALIGNMENTS.length]!;

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-white px-2 py-1 shadow-card" role="toolbar" aria-label="Formatting">
      <Tool label="Undo" icon={<UndoIcon size={16} />} onClick={() => chain().undo().run()} disabled={!editor.can().undo()} />
      <Tool label="Redo" icon={<RedoIcon size={16} />} onClick={() => chain().redo().run()} disabled={!editor.can().redo()} />
      <Divider />

      <Popover
        open={sizeOpen}
        onClose={() => setSizeOpen(false)}
        className="w-40 p-1"
        trigger={
          <button
            type="button"
            aria-label="Text size"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setSizeOpen((open) => !open)}
            className="inline-flex h-7 items-center gap-0.5 rounded-lg px-1.5 text-ink-500 hover:bg-surface-muted hover:text-ink-900"
          >
            <TextSizeIcon size={16} />
            <ChevronDownIcon size={12} />
          </button>
        }
      >
        {HEADINGS.map(({ label, level }) => (
          <button
            key={label}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (level === 0) chain().setParagraph().run();
              else chain().toggleHeading({ level }).run();
              setSizeOpen(false);
            }}
            className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-ink-700 hover:bg-surface-muted"
          >
            {label}
          </button>
        ))}
      </Popover>
      <Divider />

      <Tool label="Bold" icon={<BoldIcon size={15} />} onClick={() => chain().toggleBold().run()} active={editor.isActive('bold')} />
      <Tool label="Italic" icon={<ItalicIcon size={15} />} onClick={() => chain().toggleItalic().run()} active={editor.isActive('italic')} />
      <Tool label="Underline" icon={<UnderlineIcon size={15} />} onClick={() => chain().toggleUnderline().run()} active={editor.isActive('underline')} />
      <Divider />

      <Tool label={`Align ${nextAlignment}`} icon={<AlignIcon size={16} />} onClick={() => chain().setTextAlign(nextAlignment).run()} active={alignment !== 'left'} />
      <Tool
        label="Toggle heading"
        icon={<ChevronUpDownIcon size={16} />}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading')}
      />
      <Divider />

      <Tool label="Numbered list" icon={<ListOrderedIcon size={16} />} onClick={() => chain().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
      <Tool label="Bulleted list" icon={<ListBulletIcon size={16} />} onClick={() => chain().toggleBulletList().run()} active={editor.isActive('bulletList')} />
      <Tool label="Indent" icon={<IndentIcon size={16} />} onClick={() => chain().sinkListItem('listItem').run()} disabled={!editor.can().sinkListItem('listItem')} />
      <Tool label="Outdent" icon={<OutdentIcon size={16} />} onClick={() => chain().liftListItem('listItem').run()} disabled={!editor.can().liftListItem('listItem')} />
      <Tool label="Quote" icon={<QuoteIcon size={16} />} onClick={() => chain().toggleBlockquote().run()} active={editor.isActive('blockquote')} />
      <Tool label="Code" icon={<CodeIcon size={16} />} onClick={() => chain().toggleCode().run()} active={editor.isActive('code')} />
      <Divider />

      <Tool label="Strikethrough" icon={<StrikeIcon size={16} />} onClick={() => chain().toggleStrike().run()} active={editor.isActive('strike')} />
    </div>
  );
}
