// Readers of a drawn tree for the E3 question tests. The runner reads *.test.ts(x) only, so this file holds no test cases.
import type { Node } from './fakes'

// Every string under a node, Button labels included, in document order.
export function allText(x: any): string[] {
  if (typeof x === 'string') return [x]
  if (typeof x !== 'object' || x === null) return []
  const own = typeof x.props?.label === 'string' ? [x.props.label] : []
  const kids = Array.isArray(x.children) ? x.children.flatMap(allText) : []
  return [...own, ...kids]
}

// The first node that `match` accepts, searching the tree in document order.
export function findNode(x: any, match: (n: any) => boolean): any {
  if (typeof x !== 'object' || x === null) return undefined
  if (match(x)) return x
  for (const c of Array.isArray(x.children) ? x.children : []) {
    const hit = findNode(c, match)
    if (hit) return hit
  }
  return undefined
}

// The Text node whose whole text is `text`, or undefined.
export function textNode(root: Node, text: string): any {
  return findNode(root, (n) => n.type === 'Text' && allText(n).join('') === text)
}

// The node with `key`, or undefined.
export function findKey(root: Node, key: string): any {
  return findNode(root, (n) => (n.key ?? n.props?.key) === key)
}

// The draft block as one string, lines joined. Empty when the block is not drawn.
export async function draftText(ui: any): Promise<string> {
  const root = (await ui.drawn()) as Node
  return allText(findKey(root, 'draft-block')).join('\n')
}

// The colour of the key with `hotkey`: its own colour, or the colour of its first Text.
export function colourOf(root: Node, hotkey: string): string | undefined {
  const node = findNode(root, (n) => n.props?.hotkey === hotkey)
  if (!node) return undefined
  return node.props?.color ?? findNode(node, (n) => n.type === 'Text')?.props?.color
}
