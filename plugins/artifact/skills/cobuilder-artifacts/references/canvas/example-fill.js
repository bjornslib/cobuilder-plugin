// WORKED EXAMPLE, not a generator. This is the fill script a subagent wrote for
// design/hosted-canvas-ui-redesign, in the CURRENT layout: the before/after picture goes
// in the `why-beforeafter` frame, and zone-flow shows only the sequence.
// The text is specific to that design. Reuse the shape of it: frame-local coordinates,
// one card helper, one bound-arrow helper, meta.source on every shape,
// violet = new, grey = unchanged, 5 to 7 parts per diagram.
const { createShapeId, toRichText } = await import('tldraw')
const id = (k) => createShapeId(k)
const card = (key, parent, x, y, w, h, text, colour, source) => {
	editor.createShape({ id: id(key), type: 'geo', parentId: id(parent), x, y, meta: { source },
		props: { geo: 'rectangle', w, h, color: colour, fill: 'semi', size: 's', verticalAlign: 'start', align: 'start', richText: toRichText(text) } })
}
const head = (key, parent, x, y, w, text, source) => {
	editor.createShape({ id: id(key), type: 'text', parentId: id(parent), x, y, meta: { source },
		props: { w, autoSize: false, size: 'm', richText: toRichText(text) } })
}
const before = new Set(editor.getCurrentPageShapes().map(s=>s.id))
const arrows = []
const arrow = (a, b, src) => { helpers.createArrowBetweenShapes(id(a), id(b), {}); arrows.push(src) }
const N='violet', G='grey'
let Z, L

Z='why-beforeafter'; L='build_canvas.py (problem, solution)'
head('b-h-b',Z,40,30,1300,'Before: the problem',L)
head('b-h-a',Z,1620,30,1300,'After: the solution',L)
card('b-b1',Z,40,100,1300,240,'A stock tldraw editor with a chat sidebar bolted on. The meeting is nearly invisible: raw buttons in a corner of the panel.',G,L)
card('b-b2',Z,40,400,1300,240,'Every icon is a unicode glyph. One shadcn Toggle exists, with Tailwind\'s reset removed to avoid a collision nobody measured.',G,L)
card('b-a1',Z,1620,100,1300,240,'tldraw chrome is replaced slot by slot, and everything is styled from one token source that speaks both design systems.',N,L)
card('b-a2',Z,1620,400,1300,240,'The agent conversation floats over the canvas in a stacking context we own. The meeting shows in the app bar.',N,L)
arrow('b-b1','b-a1',L); arrow('b-b2','b-a2',L)

Z='zone-landscape'; L='level-1.mmd'
head('l-h1',Z,40,30,380,'Browser: our code',L)
head('l-h2',Z,460,30,380,'Browser: tldraw',L)
head('l-h3',Z,880,30,380,'Outside the browser',L)
card('l-token',Z,40,100,380,190,'Token source\nOne module for every colour and size. Skins both shadcn and tldraw.',N,L)
card('l-shell',Z,40,320,380,190,'App shell\nShadcn chrome. Owns the page stacking context. Replaces tldraw menus, tool rail and zoom cluster.',N,L)
card('l-panel',Z,40,540,380,190,'Floating agent panel\nChat and thought stream, over the canvas. Local to each person.',N,L)
card('l-meet',Z,40,760,380,190,'Meeting layer\nJoins the room. Shows live audio in the app bar.',N,L)
card('l-editor',Z,460,320,380,230,'tldraw editor\nThe canvas itself. Its inner styles stay untouched.',G,L)
card('l-server',Z,880,100,380,300,'Worker and agent service\nRuns the agent, syncs the canvas, handles meeting turns.',G,L)
card('l-lk',Z,880,560,380,230,'LiveKit audio server\nCarries meeting audio for the room.',G,L)
arrow('l-token','l-shell',L); arrow('l-token','l-editor',L); arrow('l-shell','l-panel',L)
arrow('l-panel','l-server',L); arrow('l-editor','l-server',L); arrow('l-meet','l-lk',L)

Z='zone-flow'; L='level-2.mmd'
const steps=[
 ['Person sends a prompt from the panel',G],
 ['Worker opens the run with the agent service',G],
 ['Density controller sets the agent-live tier',N],
 ['Chrome slims through CSS alone, no re-render',N],
 ['Thoughts and shapes stream into the panel and canvas',G],
 ['Run ends. Tier returns to full',N]]
steps.forEach(([t,c],i)=>card('f-'+i,Z,20+i*215,300,170,360,(i+1)+'. '+t,c,L))
for(let i=0;i<5;i++) arrow('f-'+i,'f-'+(i+1),L)

Z='zone-structure'; L='level-3.mmd'
card('s-ctl',Z,400,100,500,560,'UiDensityController\ncurrentTier: DensityTier\nisGenerating: boolean\nfocusModeActive: boolean\nsetTier(tier)\nwriteDataTierAttribute()',N,L)
card('s-tok',Z,40,100,300,300,'TokenSource\nSupplies the tier custom properties and the override sheet',G,L)
card('s-tier',Z,960,100,300,260,'DensityTier\nfull, agent-live, focus',N,L)
card('s-panel',Z,960,440,300,260,'AgentPanel\nTells the controller when a run is generating',N,L)
arrow('s-tok','s-ctl',L); arrow('s-ctl','s-tier',L); arrow('s-ctl','s-panel',L)

const src=[...arrows]
const newArrows=editor.getCurrentPageShapes().filter(s=>s.type==='arrow'&&!before.has(s.id))
newArrows.forEach((a,i)=>editor.updateShape({id:a.id,type:'arrow',meta:{...a.meta,source:src[i]??'level-3.mmd'}}))
return { n:newArrows.length, lints: await helpers.getLints() }
