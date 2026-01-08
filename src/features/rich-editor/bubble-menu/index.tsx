import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus'
import { isNodeSelection } from '@tiptap/core'
import { type Editor } from '@tiptap/react'
import { useEffect, useState } from 'react'

import { AIButton } from './components/ai-button'
import './bubble-menu.css'
import { Divider } from './components/divider'
import { NodeTypeSelect } from './components/node-type-select'
import { AlignSelect } from './components/align-select'
import { ColorSelect } from './components/color-select'
import { MoreMenu } from './components/more-menu'
import { FormatButtons } from './components/format-buttons'

interface BubbleMenuProps {
  editor: Editor
}

export function BubbleMenu({ editor }: BubbleMenuProps) {
  const [placementDir, setPlacementDir] = useState<'top' | 'bottom'>('bottom')

  /**
   * Update placement direction based on selection position
   */
  useEffect(() => {
    const updatePlacement = () => {
      const { selection } = editor.state

      // Only update placement for text selections (not node selections)
      if (isNodeSelection(selection)) return

      const { from } = selection
      // Get the coordinates of the selection start
      const coords = editor.view.coordsAtPos(from)

      // If the selection is in the bottom half of the screen, open upwards
      // We use a threshold of 50% of the viewport height
      if (coords.top > window.innerHeight / 2) {
        setPlacementDir('top')
      } else {
        setPlacementDir('bottom')
      }
    }

    updatePlacement()

    editor.on('selectionUpdate', updatePlacement)
    editor.on('transaction', updatePlacement)
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true) // Capture scroll to handle all scrollable containers

    return () => {
      editor.off('selectionUpdate', updatePlacement)
      editor.off('transaction', updatePlacement)
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [editor])

  return (
    <TiptapBubbleMenu
      editor={editor}
      className="bubble-menu"
      shouldShow={({ state }) => {
        return !isNodeSelection(state.selection) && !state.selection.empty
      }}
    >
      {/* AI Button */}
      <AIButton />

      <Divider />

      {/* Node Type Select */}
      <NodeTypeSelect editor={editor} placementDir={placementDir} />

      {/* Alignment Select */}
      <AlignSelect editor={editor} placementDir={placementDir} />

      <Divider />

      {/* Format Buttons */}
      <FormatButtons editor={editor} />

      <Divider />

      {/* Color Select */}
      <ColorSelect editor={editor} placementDir={placementDir} />

      <Divider />

      {/* More Menu */}
      <MoreMenu editor={editor} placementDir={placementDir} />
    </TiptapBubbleMenu>
  )
}
