import ts from "typescript";

/** `path` is relative to the package root, such as `src/shell/model.ts`. */
export interface SourceFile {
  path: string;
  text: string;
}

/**
 * The literal node kinds: every range of text that is data rather than code. A template
 * has three text chunks (`TemplateHead`, `TemplateMiddle`, `TemplateTail`), and each
 * `${}` substitution sits between them as ordinary code. Blanking the chunks alone keeps
 * the substitutions as code, which C1 needs: a join read inside a `${}` is a read of it.
 */
const LITERAL_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.RegularExpressionLiteral,
  /* JSX text is prose a reader sees, so it is data, as a string is. */
  ts.SyntaxKind.JsxText,
]);

/** A `.tsx` file is parsed as TSX, so a JSX element is not read as a type assertion. */
function scriptKind(file: SourceFile): ts.ScriptKind {
  return file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function sourceOf(file: SourceFile): ts.SourceFile {
  return ts.createSourceFile(
    file.path,
    file.text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    scriptKind(file),
  );
}

export function literalRanges(file: SourceFile): Array<[number, number]> {
  const source = sourceOf(file);
  const ranges: Array<[number, number]> = [];
  const visit = (node: ts.Node): void => {
    if (LITERAL_KINDS.has(node.kind)) ranges.push([node.getStart(source), node.getEnd()]);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return ranges;
}

const COMMENT_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
]);

function newScanner(text: string): ts.Scanner {
  return ts.createScanner(
    ts.ScriptTarget.Latest,
    /* skipTrivia */ false,
    ts.LanguageVariant.Standard,
    text,
  );
}

/**
 * Every range of comment trivia, read from text whose literals are already blanked. The
 * order matters. The scanner does not re-scan a slash as the start of a regular expression,
 * so a regex that holds a backtick ends its string state early, and every later comment in
 * the file is read as code. Blanking the literals first removes the characters that could
 * mislead it. Blanking changes no offset, and a comment cannot sit inside a literal, so no
 * real comment is lost.
 */
export function commentRanges(text: string): Array<[number, number]> {
  const scanner = newScanner(text);
  const ranges: Array<[number, number]> = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (COMMENT_KINDS.has(token)) ranges.push([scanner.getTokenPos(), scanner.getTextPos()]);
  }
  return ranges;
}

export function blankRanges(text: string, ranges: Array<[number, number]>): string {
  const chars = text.split("");
  for (const [start, end] of ranges) {
    for (let i = start; i < end; i += 1) {
      if (chars[i] !== "\n" && chars[i] !== "\r") chars[i] = " ";
    }
  }
  return chars.join("");
}

/**
 * True when the literal starting at `start` is an element-access key: `joins["KEY"]`. That
 * is the same read as `joins.KEY`, so the code projection keeps it. C1 says "however the
 * call site spells it", so an erased spelling would be a hole rather than a mention.
 */
export function isIndexKey(text: string, start: number): boolean {
  let i = start - 1;
  while (i >= 0 && (text[i] === " " || text[i] === "\t")) i -= 1;
  return text[i] === "[";
}
