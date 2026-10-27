export function captionSource(text: string): string {
  const cue = text
    .replace(/-->/g, "->")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
  const vtt = `WEBVTT\n\n00:00:00.000 --> 99:59:59.000\n${cue}`;
  return `data:text/vtt;charset=utf-8,${encodeURIComponent(vtt)}`;
}
