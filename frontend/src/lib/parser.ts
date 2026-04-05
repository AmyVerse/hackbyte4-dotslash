export const parseAIContent = (content: string = "") => {
  const lines = content.split('\n').filter(l => l.trim() !== "");

  // Try to find a line starting with ### for the title
  let titleIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### ')) {
      titleIndex = i;
      break;
    }
  }

  // Determine Title and Body
  let title = "Tactical Alert";
  let cleanBodyLines = lines;

  if (titleIndex !== -1) {
    // We have an explicit Markdown title
    title = lines[titleIndex].replace('### ', '').trim();
    cleanBodyLines = lines.filter((_, i) => i !== titleIndex);
  } else if (lines.length > 1) {
    // More than one line and no explicit title, use first as title
    title = lines[0].replace(/[*#]/g, '').trim();
    cleanBodyLines = lines.slice(1);
  } else {
    // Only one line, use it as body, title stays default
    title = "Tactical Alert";
    cleanBodyLines = lines;
  }

  // Extract Hashtags and Severity
  const hashtags = content.match(/#[a-zA-Z0-9]+/g) || [];
  const severityMatch = content.match(/\*\*Severity\*\*:\s*([^\n\r]+)/i);
  const severity = severityMatch ? severityMatch[1].trim() : null;

  // Extract Tactical Data
  const tacticalSection = content.split('**Tactical Data:**')[1]?.split('**')[0] || "";
  const tacticalData = (tacticalSection.match(/- ([^:]+): ([^\n\r]+)/g) || []).map(line => {
    const match = line.match(/- ([^:]+): ([^\n\r]+)/);
    return match ? { label: match[1].trim(), val: match[2].trim() } : null;
  }).filter(Boolean) as { label: string, val: string }[];

  // Extract Vehicles
  const vehiclesSection = content.split('**Vehicles Needed:**')[1]?.split('**')[0] || "";
  const vehicles = (vehiclesSection.match(/- (\w+): (\d+)/g) || []).map(line => {
    const match = line.match(/- (\w+): (\d+)/);
    return match ? { type: match[1].trim(), count: parseInt(match[2]) } : null;
  }).filter(Boolean) as { type: string, count: number }[];

  // Extract Personnel
  const personnelMatch = content.match(/\*\*Personnel Assigned\*\*:\s*(\d+)/i);
  const personnel = personnelMatch ? parseInt(personnelMatch[1]) : null;

  const cleanBody = cleanBodyLines
    .join('\n')
    .replace(/\*\*Severity\*\*:\s*.+/i, '')
    .replace(/\*\*Tactical Data\*\*:.+/is, '')
    .replace(/\*\*Vehicles Needed\*\*:.+/is, '')
    .replace(/\*\*Personnel Assigned\*\*:.+/i, '')
    .replace(/#[a-zA-Z0-9]+ ?/g, '')
    .trim();

  return { title, hashtags, cleanBody, severity, tacticalData, vehicles, personnel };
}
