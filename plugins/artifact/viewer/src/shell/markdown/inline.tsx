const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*)/g;

function codeNode(token: string, key: string): React.ReactNode {
  return (
    <code
      key={key}
      className="rounded bg-surface-3 px-1 py-px font-mono text-[13.5px] break-words text-accent-deep"
    >
      {token.slice(1, -1)}
    </code>
  );
}

function strongNode(token: string, key: string): React.ReactNode {
  return (
    <strong key={key} className="font-semibold text-foreground">
      {token.slice(2, -2)}
    </strong>
  );
}

function tokenNode(token: string, keyPrefix: string, tick: number): React.ReactNode {
  return token.startsWith("`")
    ? codeNode(token, `${keyPrefix}-c${tick}`)
    : strongNode(token, `${keyPrefix}-b${tick}`);
}

export function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  Array.from(text.matchAll(TOKEN)).forEach((match, tick) => {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(tokenNode(match[0], keyPrefix, tick));
    last = match.index + match[0].length;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
