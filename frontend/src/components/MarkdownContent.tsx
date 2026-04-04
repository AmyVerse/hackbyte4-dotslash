type MarkdownContentProps = {
  content?: string
  className?: string
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const markdownToHtml = (markdown: string) => {
  if (!markdown) return ''

  const lines = markdown.split('\n')
  let html = ''
  let inList = false

  const flushList = () => {
    if (inList) {
      html += '</ul>'
      inList = false
    }
  }

  for (let rawLine of lines) {
    const line = rawLine.trim()

    if (line === '') {
      flushList()
      html += '<p></p>'
      continue
    }

    if (/^#{3}\s+/.test(line)) {
      flushList()
      html += `<h3>${escapeHtml(line.replace(/^#{3}\s+/, ''))}</h3>`
      continue
    }

    if (/^#{2}\s+/.test(line)) {
      flushList()
      html += `<h2>${escapeHtml(line.replace(/^#{2}\s+/, ''))}</h2>`
      continue
    }

    if (/^#\s+/.test(line)) {
      flushList()
      html += `<h1>${escapeHtml(line.replace(/^#\s+/, ''))}</h1>`
      continue
    }

    if (/^[\-*+]\s+/.test(line)) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      const itemText = line.replace(/^[\-*+]\s+/, '')
      html += `<li>${escapeHtml(itemText)}</li>`
      continue
    }

    flushList()
    let content = escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')

    html += `<p>${content}</p>`
  }

  flushList()
  return html
}

const MarkdownContent = ({ content = '', className = '' }: MarkdownContentProps) => (
  <div
    className={className}
    dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
  />
)

export default MarkdownContent
