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
  
  // 记录当前激活的 Block 相关信息，用于点击操作
  const [activeBlock, setActiveBlock] = useState<{
    pos: number
    node: any
  } | null>(null)

  const menuRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLElement | null>(null)

  // 使用 Ref 存储最新状态以避免闭包陷阱
  const stateRef = useRef<{
    menuPosition: { top: number; left: number } | null
    activeBlock: { pos: number; node: any } | null
  }>({ menuPosition: null, activeBlock: null })

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const scheduleHide = () => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      setMenuPosition(null)
      setActiveBlock(null)
      stateRef.current = { menuPosition: null, activeBlock: null }
    }, 200)
  }


  useEffect(() => {
    const editorEl = editor.view.dom
    // 假设 editor.view.dom 的父元素是我们要参考的相对定位容器
    // 在实际项目中，可能需要确认这个父容器是否具有 relative/absolute 定位
    const container = editorEl.parentElement
    editorRef.current = container

    if (!editorEl || !container) return

    let animationFrameId: number

    const updateMenuPosition = (event: MouseEvent) => {
      const x = event.clientX
      const y = event.clientY

      // 1. 基础命中测试
      const targetDom = document.elementFromPoint(x, y) as HTMLElement | null
      if (!targetDom) return

      // 如果鼠标移到了 Handle 自己身上，不做任何改变，保持显示
      if (
        menuRef.current &&
        (menuRef.current === targetDom || menuRef.current.contains(targetDom))
      ) {
        return
      }

      // 如果移出了编辑器区域（且不是在 Handle 上），隐藏菜单
      // Fix: 允许 targetDom 是 container 本身（比如 gutter 区域），或者 container 包含 targetDom
      if (!container.contains(targetDom)) {
        scheduleHide()
        return
      }

      // 2. 利用 Prosemirror API 查找文档位置
      let result = editor.view.posAtCoords({ left: x, top: y })

      // Gutter 探测逻辑：如果鼠标在内容左侧（或者 posAtCoords 没命中），尝试水平投影到内容区探测
      // 这里的逻辑是为了支持鼠标在段落左侧空白处悬浮也能显示 Handle
      {
        const rect = editorEl.getBoundingClientRect()
        const style = window.getComputedStyle(editorEl)
        const paddingLeft = parseInt(style.paddingLeft) || 0
        const contentLeft = rect.left + paddingLeft

        if (!result || x < contentLeft) {
          const probeResult = editor.view.posAtCoords({ 
            left: contentLeft + 10,  // 偏移进内容区
            top: y 
          })
          if (probeResult) {
            result = probeResult
          }
        }
      }

      if (!result) {
        return
      }

      // 3. 向上寻找最近的 Block 节点
      // 我们需要找到用户“心理上”认为的一行/一块
      // 通常是 Paragraph, Heading, ListItem 等
      let resolvedPos = editor.state.doc.resolve(result.pos)
      let currentDepth = resolvedPos.depth

      // Safety check: if depth is 0 (top-level doc), we can't get 'before' position
      if (currentDepth === 0) {
        scheduleHide()
        return
      }
      
      let targetNode = resolvedPos.node(currentDepth) // 当前深度的节点
      let targetPos = resolvedPos.before(currentDepth) // 该节点在文档中的绝对起始位置

      // 向上回溯直到找到我们支持的 Block 节点
      while (currentDepth > 0) {
        const node = resolvedPos.node(currentDepth)
        if (node.isBlock) {
          targetNode = node
          targetPos = resolvedPos.before(currentDepth)
          // 如果是文本块（p, h1），这就是我们要找的视觉锚点
          // 哪怕它在 ListItem 里，我们也先定位到这一行文本
          if (node.isTextblock) {
            break
          }
        }
        currentDepth--
      }
      
      if (!targetNode || currentDepth === 0) return

      // 4. 计算精准坐标
      // 4.1 Y 轴：使用 coordsAtPos 获取该 Block 起始位置的光标坐标
      const coords = editor.view.coordsAtPos(targetPos + 1) // +1 是为了进入节点内部拿第一个字符的位置
      
      // 4.2 X 轴：分级策略
      const domInfo = editor.view.domAtPos(targetPos + 1)
      let element = domInfo.node instanceof HTMLElement ? domInfo.node : domInfo.node.parentElement
      if (!element) return
      
      // 找到语义上的容器 (LI or Blockquote or P)
      // 这主要用于获取“当前的缩进位置”
      const containerElement = element.closest('li') || element.closest('blockquote') || element
      
      const containerRect = container.getBoundingClientRect()
      const elementRect = containerElement.getBoundingClientRect()
      const editorRect = editorEl.getBoundingClientRect()
      
      // 计算编辑器的“内容基准线” (Base Content Line)
      // 这是所有一级普通段落左对齐的位置
      const editorStyle = window.getComputedStyle(editorEl)
      const editorPaddingLeft = parseInt(editorStyle.paddingLeft) || 0
      const baseX = editorRect.left + editorPaddingLeft

      // 确定“逻辑层级”
      // 在 Tiptap 中：
      // Doc (0)
      //   Paragraph (1) -> Root Node
      //   BulletList (1) -> ListItem (2) -> Root List Item
      //   Blockquote (1) -> Paragraph (2) -> Root Quote Content
      
      // 策略：
      // 对于视觉上属于“第一级”的内容，强制对齐 BaseX。
      // 对于嵌套内容，跟随 DOM 缩进。
      
      let finalLeft = 0
      const handleWidth = 20
      const gap = 4
      
      // 判断是否是“根级视觉元素”
      // 1. 直接的深度为 1 的节点 (P, H1)
      // 2. 深度为 2 的 List Item (父级是 List, 爷级是 Doc)
      // 3. 深度为 2 的 Blockquote 内容 (父级是 Blockquote, 爷级是 Doc) -> 注意 Blockquote 里面可能是 P
      
      // 简化判断：我们查找最顶层的 Block Container 的深度
      // 如果当前的 containerElement 是 li，看它的深度。
      
      // 为了更准确，我们使用 resolvedPos 的深度信息
      // 如果 targetNode 是 P (depth N)，且它在一个 LI (depth N-1) 里
      // 我们关心的是这个 LI 是第几级。
      
      let isRootLevel = currentDepth === 1 // 普通 P
      
      // 检查父级链
      if (currentDepth > 1) {
          const parent = resolvedPos.node(currentDepth - 1)
          const grandParent = currentDepth > 2 ? resolvedPos.node(currentDepth - 2) : null
          
          if (parent.type.name === 'listItem') {
             // 如果父级是 LI，且 LI 的父级是 List，List 的父级是 Doc (depth-2 是 List, depth-3 是 Doc)
             // 这里的 depth 是基于 content 的。
             // doc(0) -> list(1) -> item(2) -> p(3).
             // 所以 currentDepth (targetNode=P) 是 3.
             // 我们看 item(2). 
             // 如果 item(2) 的 parent 是 list(1), list(1) parent 是 doc(0). 
             // 那么这是 Level 1 List.
             
             // 修正逻辑：
             // 我们只关心“当前行”所属的最高级 Block 结构是否在一级。
             // 简单的 heuristic: 
             // 如果 containerElement 是 LI，且它的 parentElement 是 UL/OL，且 UL/OL 的 parent 是编辑器根？
             
             const li = element.closest('li')
             if (li) {
                 const listParent = li.parentElement
                 if (listParent && listParent.parentElement === editorEl) {
                     isRootLevel = true
                 }
             }
          } else if (parent.type.name === 'blockquote') {
             // 类似，如果 Blockquote 直接在 editorEl 下
             const bq = element.closest('blockquote')
             if (bq && bq.parentElement === editorEl) {
                 isRootLevel = true
             }
          }
      }

      if (isRootLevel) {
          // 强制对齐编辑器左侧基准线
          // 这让一级列表的 Handle 和一级段落的 Handle 完全垂直对齐
          const relativeX = baseX - containerRect.left
          finalLeft = relativeX - handleWidth - gap
      } else {
          // 嵌套节点：跟随缩进
          // 这里的 elementRect.left 通常是文本/内容的左边界
          // 我们需要留出足够的空间给 bullet points
          const relativeX = elementRect.left - containerRect.left
          // 对于二级列表，elementRect.left 是文本开始的位置。Bullet 在左边。
          // 我们需要把 Handle 放在 Bullet 的左边。
          // 通常 Bullet 占据约 20px-24px 的空间。
          const nestedOffset = 26 
          finalLeft = relativeX - handleWidth - gap - nestedOffset
      }

      // Y轴：光标高度的中点
      // coords.top 是行顶，coords.bottom 是行底
      // 我们把 Icon 垂直居中于第一行文本
      const textCenterY = (coords.top + coords.bottom) / 2
      const handleHeight = 24
      const relativeTop = textCenterY - containerRect.top - (handleHeight / 2)


      const finalTop = relativeTop
      finalLeft = Math.max(0, finalLeft)

      // 6. 确定操作节点（Action Node）
      // ... (保留之前的逻辑) -> 
      // 修正：我们应该根据 visual 的层级来决定 action node
      // 如果视觉上我们是对齐了 LI，那么 Action Node 应该是 LI
      let actionPos = targetPos
      
      // 尝试提升 Action Target 到 ListItem 或 Blockquote
      const li = element.closest('li')
      if (li) {
          // 只有当我们的 TargetNode 是 LI 的第一个子节点时，才提升？
          // 或者只要在 LI 里，点击 Handle 就选中整个 LI？通常是后者。
          // 我们得找到这个 li 对应的 pos。
          // 比较困难直接从 DOM 找 POS，不如用 resolvedPos 回溯。
          for (let d = currentDepth; d > 0; d --) {
             const node = resolvedPos.node(d)
             if (node.type.name === 'listItem') {
                 actionPos = resolvedPos.before(d)
                 break
             }
          }
      }

      // 更新状态
      const newState = {
        menuPosition: { top: finalTop, left: finalLeft },
        activeBlock: { pos: actionPos, node: targetNode }
      }

      // 简单的防抖/阈值判断，避免微小抖动
      if (
        !stateRef.current.menuPosition ||
        stateRef.current.activeBlock?.pos !== actionPos ||
        Math.abs(stateRef.current.menuPosition.top - finalTop) > 1 || 
        Math.abs(stateRef.current.menuPosition.left - finalLeft) > 1
      ) {
        setMenuPosition(newState.menuPosition)
        setActiveBlock(newState.activeBlock)
        stateRef.current = newState
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      clearHideTimer()
      // 使用 rAF 节流
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      animationFrameId = requestAnimationFrame(() => {
         updateMenuPosition(event)
      })
    }
    
    // 监听mouseleave以隐藏
    const handleMouseLeave = (event: MouseEvent) => {
       // 如果移到了 Handle 上，不隐藏
       if (
        menuRef.current &&
        (event.relatedTarget === menuRef.current ||
          menuRef.current.contains(event.relatedTarget as Node))
      ) {
        return
      }
      scheduleHide()
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      clearHideTimer()
    }
  }, [editor])

  if (!menuPosition) return null

  return (
    <div
      ref={menuRef}
      className="block-handle"
      style={{
        position: 'absolute',
        top: menuPosition.top,
        left: menuPosition.left,
        width: '20px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 50,
        color: '#94a3b8',
        borderRadius: '4px',
        transition: 'color 0.1s ease, background-color 0.1s ease', // 移除 top/left 的 transition，让跟随更跟手
      }}
      onClick={() => {
        if (!activeBlock) return
        editor.commands.setNodeSelection(activeBlock.pos)
        editor.commands.focus()
      }}
      onMouseEnter={(e) => {
        clearHideTimer()
        const target = e.currentTarget
        target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
        target.style.color = '#475569'
      }}
      onMouseLeave={(e) => {
        scheduleHide()
        const target = e.currentTarget
        target.style.backgroundColor = 'transparent'
        target.style.color = '#94a3b8'
      }}
    >
      <GripVertical size={16} />
    </div>
  )
}
