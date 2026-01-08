import { Sparkles } from 'lucide-react'

export function AIButton() {
  const handleClick = () => {
    // TODO: Implement AI functionality
    console.log('AI button clicked')
  }

  return (
    <button
      type="button"
      className="ai-button"
      onClick={handleClick}
      title="Ask AI"
    >
      <Sparkles size={14} />
      <span>Ask AI</span>
    </button>
  )
}
