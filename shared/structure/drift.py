"""The public surface of a Python source, and the drift events between two surfaces.

The module reads a source with ast, and it uses the standard library only. A name with
a leading underscore is private, except __init__. A source that does not parse gives an
empty surface. Each event names its kind, its symbol, and its class: input, output, or
error. The events report facts. VALIDATE judges them.
"""
from __future__ import annotations

import ast
from dataclasses import dataclass

_FUNCTIONS = (ast.FunctionDef, ast.AsyncFunctionDef)
_KIND_CLASS = {
    "new-required-param": "input",
    "param-removed": "input",
    "param-order": "input",
    "default-changed": "input",
    "return-changed": "output",
    "raises-changed": "error",
    "catches-changed": "error",
    "removed": "input",
}
# A parameter name with its default text, or None when the parameter has no default.
_Param = tuple[str, str | None]


@dataclass(frozen=True)
class Surface:
    """One public symbol. Each tuple keeps the order of the source."""

    name: str
    req: tuple[str, ...]
    opt: tuple[str, ...]
    kw_req: tuple[str, ...]
    kw_opt: tuple[str, ...]
    defaults: tuple[str, ...]
    ret: str | None
    raises: frozenset[str]
    catches: frozenset[str]


def public_surface(source: str) -> dict[str, Surface]:
    """Return the public symbols of a source by name. A source that does not parse gives {}."""
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return {}
    surface: dict[str, Surface] = {}
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            if not node.name.startswith("_"):
                surface.update(_methods(node))
        elif isinstance(node, _FUNCTIONS) and not node.name.startswith("_"):
            surface[node.name] = _symbol(node.name, node, method=False)
    return surface


def drift_events(before: dict[str, Surface], after: dict[str, Surface]) -> list[dict[str, str]]:
    """Return the drift events from one surface to another.

    A symbol that only the after surface holds gives no event. Each kind of change gives
    one event for its symbol, in a fixed order of kinds.
    """
    events: list[dict[str, str]] = []
    for name, old in before.items():
        new = after.get(name)
        kinds = ["removed"] if new is None else _changed_kinds(old, new)
        events.extend({"kind": kind, "symbol": name, "class": _KIND_CLASS[kind]} for kind in kinds)
    return events


def _methods(node: ast.ClassDef) -> dict[str, Surface]:
    """Return the public methods of a class, and its __init__, keyed by Class.method."""
    found: dict[str, Surface] = {}
    for item in node.body:
        if not isinstance(item, _FUNCTIONS):
            continue
        if item.name == "__init__" or not item.name.startswith("_"):
            name = f"{node.name}.{item.name}"
            found[name] = _symbol(name, item, method=True)
    return found


def _symbol(name: str, node: ast.FunctionDef | ast.AsyncFunctionDef, method: bool) -> Surface:
    """Return the surface of one function. A method drops its first positional parameter."""
    positional = _positional(node.args)
    if method and not _is_static(node):
        positional = positional[1:]
    keyword = _keyword(node.args)
    req, opt = _split(positional)
    kw_req, kw_opt = _split(keyword)
    defaults = tuple(default for _, default in [*positional, *keyword] if default is not None)
    return Surface(
        name=name,
        req=req,
        opt=opt,
        kw_req=kw_req,
        kw_opt=kw_opt,
        defaults=defaults,
        ret=_text(node.returns),
        raises=_raises(node),
        catches=_catches(node),
    )


def _positional(args: ast.arguments) -> list[_Param]:
    """Return the positional parameters with their defaults. The defaults align with the end."""
    params = [*args.posonlyargs, *args.args]
    padded = [None] * (len(params) - len(args.defaults)) + list(args.defaults)
    return [(param.arg, _text(default)) for param, default in zip(params, padded)]


def _keyword(args: ast.arguments) -> list[_Param]:
    """Return the keyword-only parameters with their defaults. A missing default is None."""
    pairs = zip(args.kwonlyargs, args.kw_defaults)
    return [(param.arg, _text(default)) for param, default in pairs]


def _split(params: list[_Param]) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """Return the names without a default, then the names with one."""
    required = tuple(name for name, default in params if default is None)
    optional = tuple(name for name, default in params if default is not None)
    return required, optional


def _is_static(node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    """Return True when the function has the staticmethod decorator."""
    return any(ast.unparse(item) == "staticmethod" for item in node.decorator_list)


def _text(node: ast.expr | None) -> str | None:
    """Return the source text of an expression, or None when there is none."""
    return None if node is None else ast.unparse(node)


def _raises(node: ast.AST) -> frozenset[str]:
    """Return the names of the exceptions that the raise statements of a function name."""
    names: set[str] = set()
    for part in ast.walk(node):
        if isinstance(part, ast.Raise) and part.exc is not None:
            target = part.exc.func if isinstance(part.exc, ast.Call) else part.exc
            names.add(ast.unparse(target))
    return frozenset(names)


def _catches(node: ast.AST) -> frozenset[str]:
    """Return the names of the exception types that the except clauses of a function name."""
    names: set[str] = set()
    for part in ast.walk(node):
        if isinstance(part, ast.ExceptHandler) and part.type is not None:
            types = part.type.elts if isinstance(part.type, ast.Tuple) else [part.type]
            names.update(ast.unparse(item) for item in types)
    return frozenset(names)


def _changed_kinds(old: Surface, new: Surface) -> list[str]:
    """Return the kinds of change between two surfaces of one symbol, in a fixed order."""
    changed = [
        ("new-required-param", _gained_required(old, new)),
        ("param-removed", _lost_params(old, new)),
        ("param-order", _reordered(old, new)),
        ("default-changed", _defaults_changed(old, new)),
        ("return-changed", old.ret != new.ret),
        ("raises-changed", old.raises != new.raises),
        ("catches-changed", old.catches != new.catches),
    ]
    return [kind for kind, flag in changed if flag]


def _gained_required(old: Surface, new: Surface) -> bool:
    """Return True when a parameter needs a value now that did not need one before."""
    return bool(set(new.req + new.kw_req) - set(old.req + old.kw_req))


def _lost_params(old: Surface, new: Surface) -> bool:
    """Return True when a parameter of the old surface is gone from the new one."""
    return bool(set(_params(old)) - set(_params(new)))


def _params(surface: Surface) -> tuple[str, ...]:
    """Return every parameter name of a surface."""
    return surface.req + surface.opt + surface.kw_req + surface.kw_opt


def _reordered(old: Surface, new: Surface) -> bool:
    """Return True when the positional names that both surfaces keep appear in another order."""
    before = old.req + old.opt
    after = new.req + new.opt
    kept_before = [name for name in before if name in after]
    kept_after = [name for name in after if name in before]
    return kept_before != kept_after


def _defaults_changed(old: Surface, new: Surface) -> bool:
    """Return True when a parameter with a default on both sides has a different default."""
    before = dict(zip(old.opt + old.kw_opt, old.defaults))
    after = dict(zip(new.opt + new.kw_opt, new.defaults))
    return any(name in after and after[name] != text for name, text in before.items())
