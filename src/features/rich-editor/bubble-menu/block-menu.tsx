import { BubbleMenu } from '@tiptap/react/menus'
import { isNodeSelection } from '@tiptap/core'
import { Editor } from '@tiptap/react'
import { useState, useEffect } from 'react'

import { AIButton } from './components/ai-button'
import { Divider } from './components/divider'
import { NodeTypeSelect } from './components/node-type-select'
import { AlignSelect } from './components/align-select'
import { ColorSelect } from './components/color-select'
import { MoreMenu } from './components/more-menu'
import { FormatButtons } from './components/format-buttons'
import { DeleteBlockButton } from './components/delete-block-button'
import './bubble-menu.css'

interface BlockMenuProps {
  editor: Editor
}

export const BlockMenu = ({ editor }: BlockMenuProps) => {
  const [placementDir, setPlacementDir] = useState<'top' | 'bottom'>('bottom')
  // Force re-render on editor state change
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const handleUpdate = () => {
      forceUpdate({})

      const { selection } = editor.state
      if (!isNodeSelection(selection)) return

      const { from } = selection
      const coords = editor.view.coordsAtPos(from)

      if (coords.top > window.innerHeight / 2) {
        setPlacementDir('top')
      } else {
        setPlacementDir('bottom')
      }
    }

    handleUpdate()

    editor.on('selectionUpdate', handleUpdate)
    editor.on('transaction', handleUpdate)
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)

    return () => {
      editor.off('selectionUpdate', handleUpdate)
      editor.off('transaction', handleUpdate)
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
    }
  }, [editor])

  const shouldShow = ({ state }: { state: any }) => {
    return isNodeSelection(state.selection)
  }

  // Helper to check if the selected node supports text formatting
  // We can check if the node has 'content' that is text-like
  const showFormatting = () => {
    const { selection } = editor.state
    if (isNodeSelection(selection)) {
      const node = selection.node
      // Show formatting for any node that has content (text)
      // This includes paragraph, heading, list-item, blockquote etc.
      // We removed isTextblock check because list-item and blockquote are not textblocks but contain text.
      return node.textContent.length > 0
    }
    return false
  }

  return (
    <BubbleMenu
      editor={editor}
      className="bubble-menu block-menu"
      shouldShow={shouldShow}
    >
      <AIButton />

      {showFormatting() ? (
        <>
          <Divider />
          <NodeTypeSelect editor={editor} placementDir={placementDir} />
          <AlignSelect editor={editor} placementDir={placementDir} />
          <Divider />
          <FormatButtons editor={editor} />
          <Divider />
          <ColorSelect editor={editor} placementDir={placementDir} />
          <Divider />
          <MoreMenu
            editor={editor}
            placementDir={placementDir}
            isBlockNode={true}
          />
        </>
      ) : (
        <>
          <Divider />
          <DeleteBlockButton editor={editor} />
        </>
      )}
    </BubbleMenu>
  )
}
