import { useEffect, useState, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { GripVertical } from 'lucide-react'

interface BlockHandleProps {
  editor: Editor
}

export const BlockHandle = ({ editor }: BlockHandleProps) => {
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [activeNodePos, setActiveNodePos] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLElement | null>(null)
  const stateRef = useRef<{
    menuPosition: { top: number; left: number } | null
    activeNodePos: number | null
    activeDom: HTMLElement | null
  }>({ menuPosition: null, activeNodePos: null, activeDom: null })

  useEffect(() => {
    const editorEl = editor.view.dom
    const container = editorEl.parentElement
    editorRef.current = container

    if (!editorEl || !container) return

    let animationFrameId: number

    // 优化的类型定义：分离视觉元素和逻辑操作点
    type Candidate = {
      visualDom: HTMLElement // 用于计算位置 (通常是 p, h1 等)
      actionNodePos: number // 用于执行操作 (可能是父级 ListItem 的 pos)
      nodeTypeName: string // 逻辑节点的类型 (listItem, paragraph...)
    }

    const supportedContainerNodeTypes = new Set(['listItem', 'blockquote'])

    const getCandidateAtPoint = (x: number, y: number): Candidate | null => {
      const coords = { left: x, top: y }
      const found = editor.view.posAtCoords(coords)
      // 根据坐标返回文档位置，文档位置就是此时鼠标按下去后编辑器光标出现的位置的索引，
      // 每一个字符、每一个 非文本节点（比如 <p>, <blockquote>）的 “开始标签” 和 “结束标签” 各占 1 个位置、
      // 比如 <img /> 或 <hr />，这种没有内容的节点，本身作为一个整体占 1 个位置。

      if (!found) return null

      // @ts-ignore
      let curr = editor.$pos(found.pos) // 获取位置索引对应的NodePos对象，提供节点的具体位置、其子节点和父节点，和在这些节点之间轻松导航的功能

      // node.isTextblock 表示是否是文本块节点。就是只能包含文本内容的节点如 p、h1、codeblock 等。根据最近的文本块节点来计算 ICON 位置

      // 1. 向上查找最近的 P 或 Heading
      while (curr.depth > 0) {
        const node = curr.node
        if (['paragraph', 'heading'].includes(node.type.name)) {
          break
        }
        if (!curr.parent) break
        curr = curr.parent
      }

      // 验证找到的节点类型
      if (!['paragraph', 'heading'].includes(curr.node.type.name)) {
        return null
      }

      // NodePos.element 直接返回对应的 DOM 元素
      const textBlockDom = curr.element

      if (!(textBlockDom instanceof HTMLElement)) return null

      // 对于列表节点，根据最近的文本块节点来计算ICON位置，但根据最近的列表节点来执行操作
      // 身份向上一级确认：我是不是在列表或引用里？
      const parent = curr.parent
      if (parent && supportedContainerNodeTypes.has(parent.node.type.name)) {
        return {
          visualDom: textBlockDom,
          actionNodePos: parent.pos, // 文档位置
          nodeTypeName: parent.node.type.name, // DOM节点类型，如 li
        }
      }

      // 对于普通文本块节点，操作位置就是最近的文本块节点位置
      return {
        visualDom: textBlockDom,
        actionNodePos: curr.pos,
        nodeTypeName: curr.node.type.name,
      }
    }

    const pickCandidate = (x: number, y: number): Candidate | null => {
      const direct = getCandidateAtPoint(x, y)

      const peekX = x + 40
      const peek = getCandidateAtPoint(peekX, y)

      console.log('A', direct, peek)

      // 鼠标在内容区域之外，
      if (!direct) return peek
      if (!peek) return direct

      // 鼠标在节点内
      if (direct.actionNodePos === peek.actionNodePos) return direct

      // 如果不一致，通常意味着 peek 到了更深层或者相邻的结构
      // 在这个简化逻辑下，优先信任 direct (鼠标直接指的)，
      // 除非 direct 为空才用 peek。
      // 可以保留之前的层级判断逻辑，但在 P 节点优先的策略下，通常不需要复杂的 contains 判断
      return direct
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)

      animationFrameId = requestAnimationFrame(() => {
        const x = event.clientX
        const y = event.clientY

        const target = document.elementFromPoint(x, y) as HTMLElement | null
        if (!target) return

        if (!editorEl.contains(target)) {
          if (stateRef.current.activeDom) {
            setMenuPosition(null)
            setActiveNodePos(null)
            stateRef.current = {
              menuPosition: null, // Should match type { top: number; left: number } | null
              activeNodePos: null,
              activeDom: null,
            }
          }
          return
        }

        if (
          menuRef.current &&
          (menuRef.current === target || menuRef.current.contains(target))
        ) {
          return
        }

        const candidate = pickCandidate(x, y)
        if (!candidate) {
          if (stateRef.current.activeDom) {
            setMenuPosition(null)
            setActiveNodePos(null)
            stateRef.current = {
              menuPosition: null, // Should match type { top: number; left: number } | null
              activeNodePos: null,
              activeDom: null,
            }
          }
          return
        }

        const { visualDom, actionNodePos, nodeTypeName } = candidate

        // Calculate Position using Visual DOM (The Paragraph)
        const containerRect = container.getBoundingClientRect()
        const blockRect = visualDom.getBoundingClientRect()
        const styles = window.getComputedStyle(visualDom)

        let lineHeight = parseInt(styles.lineHeight)
        if (isNaN(lineHeight)) {
          const fontSize = parseInt(styles.fontSize)
          lineHeight = isNaN(fontSize) ? 24 : fontSize * 1.2
        }

        const paddingTop = parseInt(styles.paddingTop) || 0
        const handleHeight = 24
        const handleWidth = 28
        const gap = 2

        // Offset logic based on the CONTAINER type
        let extraOffset = 0
        if (nodeTypeName === 'listItem') {
          extraOffset = 24
        } else if (nodeTypeName === 'blockquote') {
          extraOffset = 20
        }

        // 计算 Top: 直接使用 Paragraph 的 Top，不需要再通过 parent 算 child offset
        const offset = (lineHeight - handleHeight) / 2 + paddingTop
        const relativeTop = blockRect.top - containerRect.top + offset

        // 计算 Left: 使用 Paragraph 的 Left, 减去偏移
        const unclampedLeft =
          blockRect.left - containerRect.left - handleWidth - gap - extraOffset
        const relativeLeft = Math.max(0, unclampedLeft)

        if (
          actionNodePos !== stateRef.current.activeNodePos ||
          !stateRef.current.menuPosition ||
          Math.abs(stateRef.current.menuPosition.top - relativeTop) > 0.5 ||
          Math.abs(stateRef.current.menuPosition.left - relativeLeft) > 0.5
        ) {
          setMenuPosition({ top: relativeTop, left: relativeLeft })
          setActiveNodePos(actionNodePos) // Store the CONTAINER pos for click actions
          stateRef.current = {
            menuPosition: { top: relativeTop, left: relativeLeft },
            activeNodePos: actionNodePos,
            activeDom: visualDom,
          }
        }
      })
    }

    const handleMouseLeave = (event: MouseEvent) => {
      // Check if we are moving into the handle itself
      if (
        menuRef.current &&
        (event.relatedTarget === menuRef.current ||
          menuRef.current.contains(event.relatedTarget as Node))
      ) {
        return
      }
      setMenuPosition(null)
      setActiveNodePos(null)
      stateRef.current = {
        menuPosition: null, // Should match type { top: number; left: number } | null
        activeNodePos: null,
        activeDom: null,
      }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [editor])

  if (!menuPosition) return null

  return (
    <div
      ref={menuRef}
      id="block-handle"
      className="block-handle"
      style={{
        position: 'absolute',
        top: menuPosition.top,
        left: menuPosition.left,
        width: '28px', // Wider hit area to prevent losing hover easily
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 50, // Higher z-index
        color: '#94a3b8', // slate-400 for better visibility
        transition: 'color 0.2s ease, background-color 0.2s ease',
        borderRadius: '4px',
      }}
      title="Click to select"
      onClick={() => {
        if (activeNodePos == null) return
        editor.commands.setNodeSelection(activeNodePos)
        editor.commands.focus()
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
        target.style.color = '#475569'
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.backgroundColor = 'transparent'
        target.style.color = '#94a3b8'
      }}
    >
      <GripVertical size={16} />
    </div>
  )
}
