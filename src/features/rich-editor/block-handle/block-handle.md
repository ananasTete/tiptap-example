# 节点选择手柄 (Block Handle) 需求文档

## 1. 概览

实现类似 Notion/Linear 的节点侧边手柄功能。当鼠标悬停在文本类节点上时，在左侧显示一个图标（Handle）。点击该图标可选中当前块，并呼出气泡菜单。

## 2. 功能详情

### 2.1 节点手柄 (Handle)

- **触发方式**：鼠标移入文本类节点 (Hover)。
- **适用范围**：
  - **支持**：文本类节点 (Paragraph, Heading, List Item 等)。
  - **不支持**：非文本类型节点 (Image, Divider, CodeBlock 等) **不显示** ICON。
- **位置**：编辑器内容区域左侧（Padding区域内）。
- **对齐**：与节点的第一行文本垂直对齐。
- **交互**：
  - **Hover**：显示图标（六点拖拽样式）。
  - **Click**：选中对应的整个块节点。
    - **无需拖拽**：本次**不需要**实现拖拽排序功能，仅需点击选中。
  - **选中视觉**：对应段落背景高亮，且带有圆角。

### 2.2 气泡菜单 (Block Action Menu)

- **触发条件**：点击 Handle 选中节点后自动出现。
- **菜单内容（根据节点内容动态变化）**：
  - **场景 A：节点有内容**
    - 显示完整功能菜单（与滑词选区菜单一致：加粗、变色、AI、删除等）。
  - **场景 B：节点无内容**
    - 仅显示 **AI** 和 **删除** 两个按钮。
- **删除按钮行为**：
  - **点击效果**：**彻底移除**当前选中的节点。
  - **结果**：该节点从文档中消失，下方内容上移（与标准删除行为一致）。

## 实现方案

- [x] **Step 1: 创建 BlockHandle 基础组件**
  - 创建 `src/features/rich-editor/block-handle/block-handle.tsx`。
  - **性能优化**：使用 `requestAnimationFrame` 监听编辑器容器的 `mousemove` 事件，确保 UI 更新与屏幕刷新率同步，提供最流畅的跟随效果且开销最小。
  - **状态管理**：仅当鼠标**跨越 Block 边界**时，才更新组件状态（避免在同一 Block 内移动时频繁 Re-render）。
  - **定位逻辑**：相对于 Editor 容器绝对定位 (`position: absolute`)。获取当前 Hover 节点的 `getBoundingClientRect()`，计算 `top` 值，使其与 Block 首行垂直对齐。
  - **过滤逻辑**：仅在 `Paragraph`, `Heading`, `List` 等文本节点显示。
- [x] **Step 2: 实现选中与高亮交互**
  - 实现 Handle 点击事件：触发 `editor.commands.setNodeSelection(pos)`。
  - 添加 CSS 样式：为被选中的节点（`.ProseMirror-selectednode`）添加背景色和圆角样式 (`border-radius`)。
  - 验证：点击 Handle 后，对应 Block 背景变色。
- [x] **Step 3: 创建独立的 BlockMenu**
  - **新建组件**：`src/features/rich-editor/bubble-menu/block-menu.tsx`。
  - **显示条件**：仅在 **NodeSelection** (Block选区) 时显示，与原有的 TextSelection 菜单互斥。
  - **复用组件**：复用现有的 `AIButton`, `ColorSelect`, `FormatButtons` 等子组件（它们是通用的）。
  - **动态内容**：
    - 基础：显示 AI、删除按钮。
    - 扩展：如果 Block 有内容，额外显示加粗、颜色等格式选项。
- [x] **Step 4: 实现删除功能**
  - 在 `BlockMenu` 中添加 `DeleteBlockButton` 组件。
  - 绑定逻辑：调用 `editor.commands.deleteSelection()`。
  - 验证：点击删除后，节点消失，光标行为正常。

## 进度

## 2026-01-06

- [x] Step 1: 创建 BlockHandle 基础组件
  - 已创建 `src/features/rich-editor/components/block-handle.tsx`
  - 实现了基于 mousemove 的悬浮检测与位置计算
  - **修复了鼠标移入 ICON 时消失的问题**：通过引入“向右探测” (Peek Right) 逻辑桥接了编辑器内边距 (Padding) 的间隙，并扩大了 ICON 的响应区域。
  - 集成到了 Editor 组件中
- [x] Step 2: 实现选中与高亮交互
  - 修改 `src/features/rich-editor/components/block-handle.tsx`，添加 `onClick` 事件处理，使用 `editor.commands.setNodeSelection(pos)` 选中 Block。
  - 修改 `src/features/rich-editor/editor.css`，添加 `.ProseMirror-selectednode` 样式。
  - **验证**：点击 Handle 后，对应 Block 背景变色（浅蓝色背景 + 细边框）。
- [x] Step 3: 创建独立的 BlockMenu
  - 创建了 `src/features/rich-editor/bubble-menu/block-menu.tsx`，使用 `shouldShow={({ state }) => isNodeSelection(state.selection)}` 确保仅在选中 Block 时显示。
  - 集成到了 `src/features/rich-editor/editor.tsx` 中。
  - 复用了 `AIButton`, `FormatButtons`, `ColorSelect` 等组件。
  - **验证**：点击 Handle 选中 Block 后，应当出现 BlockMenu。
- [x] Step 4: 实现删除功能
  - 创建了 `src/features/rich-editor/bubble-menu/components/delete-block-button.tsx`。
  - 集成到了 `BlockMenu` 中，调用 `editor.commands.deleteSelection()`。
  - **验证**：点击删除按钮，Block 被正确移除。
- [x] **修复**：列表节点和引用节点被识别为无内容节点的问题
  - 原因：原逻辑只允许 `isTextblock` 类型的节点显示格式菜单，但 `listItem` 和 `blockquote` 并非 `isTextblock`。
  - 修复：改为仅检测 `node.textContent.length > 0`。
- **任务已完成**

## 问题与修复记录

### 1. 列表和引用节点被识别为无内容节点

- **问题描述**：当使用 Block Handle 选中列表项 (List Item) 或引用块 (Blockquote) 时，Block Menu 仅显示“AI”和“删除”按钮，不显示加粗、颜色等格式选项。
- **原因分析**：原代码在决定是否显示格式菜单时，使用了 `node.type.isTextblock` 进行判断。在 ProseMirror/Tiptap 中，`listItem` 和 `blockquote` 通常被视为容器节点而非纯文本块 (`isTextblock: false`)，尽管它们内部包含文本内容。
- **解决方案**：修改 `src/features/rich-editor/bubble-menu/block-menu.tsx` 中的 `showFormatting` 函数，移除 `node.type.isTextblock` 检查，改为仅检查 `node.textContent.length > 0`。这样只要节点包含文本内容，就显示格式菜单。

### 2. 嵌套列表父级抢占 Hover 问题

- **问题描述**：在二级列表节点的左侧移动鼠标试图点击 Handle 时，鼠标尚未触及 ICON，光标就落入了父级列表项的区域（因为二级列表嵌套在父级 `li` 内部），导致 Handle 切换回父节点。
- **解决方案**：优化 `mousemove` 侦测逻辑。在计算 Hover 目标时，不仅检测鼠标当前位置的元素，还强制向右（x + 40px）探测。如果探测到的节点是当前命中节点的**子节点**（例如在父 `li` 区域探测到了子 `li`），则优先认定用户意图是操作子节点。这样即使鼠标在父节点的 Padding 区，只要视觉上对齐子节点，就会正确显示子节点的 Handle。

## 3. 优化计划：动态定位 Handle (2026-01-06)

### 需求变更

- **不再固定位置**：Handle 位置不再固定在编辑器容器的最左侧 (Left: 0)。
- **跟随缩进**：Handle 应显示在当前 Block 内容的左侧附近。
  - **根节点**：仍显示在左侧 Padding 区域（视觉上类似）。
  - **嵌套节点（如二级列表）**：Handle 水平向右移动，跟随列表的缩进深度，显示在子项内容的左侧。

### 实现方案 (待执行)

- [x] **Step 1: 动态计算 Left 坐标**
  - **当前逻辑**：Left 固定为 `0px`。
  - **新逻辑**：在 `mousemove` 事件中动态计算 Left 值。
  - **计算公式**：`handleLeft = blockRect.left - containerRect.left - HandleWidth - Gap`。
    - `HandleWidth`: 约 28px (组件宽度)。
    - `Gap`: 约 4px (与内容的间距)。
  - **状态更新**：`activeBlock` 状态需包含 `left` 属性或独立 `left` 状态。

### 3.1 补充修复：列表与引用节点重叠 (2026-01-06) [Done]

- **问题**：`li` 和 `blockquote` 节点的 Handle 与列表序号/引用边框重叠。
- **原因**：动态计算是基于内容（Child Paragraph）的 Left 值，未能避开 `li`/`blockquote` 左侧的 Marker 或 Border 区域。
- **方案**：针对特定节点增加 `ExtraOffset`。
  - **List Item (`li`)**: 增加 `24px` (对应 `padding-left: 1.5rem`)。
  - **Blockquote (`blockquote`)**: 增加 `20px` (对应 `padding-left: 1rem` + `border: 4px`)。
  - **公式调整**：`relativeLeft = relativeLeft - ExtraOffset`。

### 3.2 优化列表选中样式 (2026-01-06) [Done]

- **问题**：选中列表节点时，背景高亮未包含左侧序号/Bullet。
- **方案**：
  - 修改 `src/features/rich-editor/editor.css`。
  - 针对 `li.ProseMirror-selectednode` 添加 `::before` 伪元素。
  - 伪元素定位：`left: -1.5rem`，`width: 1.5rem`，高度 100%。
  - 样式：背景色同主节点，调整 `border-radius` 使左右视觉融合。

- [x] **Step 2: 验证多级列表与对齐**
  - 验证**Paragraph** (根节点)：应靠近编辑器左边界。
  - 验证**Level 1 List**：应考虑 `ul` 的 Padding，Handle 显示在 bullet 附近或更左侧。
  - 验证**Level 2+ List**：Handle 明显缩进，位于二级列表项左侧。

# 核心实现

## 根据鼠标位置计算悬浮ICON坐标

1. 编辑器容器注册 mousemove 事件，使用 requestAnimationFrame 优化性能
2. 利用鼠标坐标位置获取DOM元素

## 点击ICON触发选中段落背景高亮并触发气泡菜单
