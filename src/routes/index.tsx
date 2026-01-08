import TiptapEditor from '@/features/rich-editor/editor'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="max-w-2xl mx-auto mt-20 font-sans antialiased text-gray-700">
      {/* <nav className="flex items-center gap-6 mb-12 text-sm font-medium">
        <button
          onClick={() => simulateStream('append')}
          disabled={isStreaming}
          className="text-gray-500 hover:text-black transition-colors disabled:opacity-30"
        >
          续写内容
        </button>
        <button
          onClick={() => simulateStream('replace')}
          disabled={isStreaming}
          className="text-gray-500 hover:text-black transition-colors disabled:opacity-30"
        >
          润色选区
        </button>
        {isStreaming && (
          <button
            onClick={() => {
              clearInterval(intervalRef.current)
              editorRef.current?.abort()
              setIsStreaming(false)
            }}
            className="text-red-400 hover:text-red-600"
          >
            停止
          </button>
        )}
      </nav> */}

      <div className="prose prose-slate max-w-none min-h-[500px]">
        <TiptapEditor />
      </div>
    </div>
  )
}
