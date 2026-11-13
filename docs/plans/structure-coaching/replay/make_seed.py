"""Build the replay seed repo: a small shop package near the folder limit.

Usage: python3 make_seed.py <dest> <on|off>
"""
import json
import subprocess
import sys
from pathlib import Path

SHOP = {
    "order.py": '"""An order of lines."""\nfrom shop.line import Line\n\n\nclass Order:\n    """An order holds lines and a region code."""\n\n    def __init__(self, region="AU"):\n        self.region = region\n        self.lines: list[Line] = []\n\n    def add(self, line):\n        """Add one line."""\n        self.lines.append(line)\n',
    "line.py": '"""One order line."""\nfrom dataclasses import dataclass\n\n\n@dataclass\nclass Line:\n    """A product, a unit price in cents, a quantity, and a weight in grams."""\n\n    sku: str\n    price: int\n    quantity: int = 1\n    weight: int = 0\n',
    "subtotal.py": '"""The subtotal of an order."""\n\n\ndef subtotal(order):\n    """Return the sum of price times quantity, in cents."""\n    return sum(line.price * line.quantity for line in order.lines)\n',
    "customer.py": '"""A customer."""\nfrom dataclasses import dataclass\n\n\n@dataclass\nclass Customer:\n    """A customer name and email."""\n\n    name: str\n    email: str\n',
    "catalog.py": '"""The product catalog."""\n\nCATALOG = {"tea": 450, "cup": 1200, "pot": 3500}\n\n\ndef price_of(sku):\n    """Return the price of a sku in cents."""\n    return CATALOG[sku]\n',
    "stock.py": '"""Stock levels."""\n\nSTOCK = {"tea": 10, "cup": 4, "pot": 2}\n\n\ndef in_stock(sku, quantity):\n    """Return True when the stock covers the quantity."""\n    return STOCK.get(sku, 0) >= quantity\n',
    "currency.py": '"""Money formatting."""\n\n\ndef dollars(cents):\n    """Return a dollar string for an amount in cents."""\n    return f"${cents / 100:.2f}"\n',
    "regions.py": '"""Region codes."""\n\nREGIONS = ("AU", "NZ", "US")\n',
    "status.py": '"""Order status values."""\n\nOPEN = "open"\nPAID = "paid"\nSHIPPED = "shipped"\n',
    "events.py": '"""Order events."""\n\n\ndef event(name, order):\n    """Return an event record."""\n    return {"name": name, "lines": len(order.lines)}\n',
    "ids.py": '"""Order ids."""\nimport itertools\n\n_COUNTER = itertools.count(1)\n\n\ndef next_id():\n    """Return the next order id."""\n    return next(_COUNTER)\n',
    "validation.py": '"""Order checks."""\n\n\ndef check(order):\n    """Raise ValueError for an order with no lines."""\n    if not order.lines:\n        raise ValueError("empty order")\n',
    "audit.py": '"""Audit trail."""\n\nLOG = []\n\n\ndef record(entry):\n    """Append one audit entry."""\n    LOG.append(entry)\n',
    "notify.py": '"""Customer messages."""\n\n\ndef message(customer, text):\n    """Return a message for a customer."""\n    return f"To {customer.email}: {text}"\n',
    "cart.py": '"""A cart that becomes an order."""\nfrom shop.order import Order\n\n\ndef checkout(items, region="AU"):\n    """Return an order for the items."""\n    order = Order(region)\n    for line in items:\n        order.add(line)\n    return order\n',
    "rounding.py": '"""Rounding of cents."""\n\n\ndef round_cents(value):\n    """Round a float amount of cents to an int, half up."""\n    return int(value + 0.5)\n',
    "tags.py": '"""Product tags."""\n\nTAGS = {"tea": ["drink"], "cup": ["ware"], "pot": ["ware"]}\n',
    "labels.py": '"""Shelf labels."""\n\n\ndef label(sku):\n    """Return a shelf label."""\n    return sku.upper()\n',
    "weights.py": '"""Product weights in grams."""\n\nWEIGHTS = {"tea": 250, "cup": 400, "pot": 1500}\n',
    "__init__.py": "",
}
PAYMENTS = {
    "__init__.py": "",
    "gateway.py": '"""The card gateway. Only the payments context calls it."""\n\nCHARGES = []\n\n\ndef charge(cents):\n    """Charge a card."""\n    CHARGES.append(cents)\n    return True\n\n\ndef refund_card(cents):\n    """Refund a card."""\n    CHARGES.append(-cents)\n    return True\n',
}
BOUNDARY = {
    "shop": "id: shop\npath: shop\nallowed_dependencies: []\nforbidden_dependencies:\n  - \"payments/**\"\n",
    "payments": "id: payments\npath: payments\nallowed_dependencies: [shop]\nforbidden_dependencies: []\n",
}
OFF_CONFIG = {"excluded_paths": ["**"]}


def write(root, rel, text):
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def main():
    dest, mode = Path(sys.argv[1]), sys.argv[2]
    dest.mkdir(parents=True)
    for name, text in SHOP.items():
        write(dest, f"shop/{name}", text)
    for name, text in PAYMENTS.items():
        write(dest, f"payments/{name}", text)
    for ctx, text in BOUNDARY.items():
        write(dest, f"docs/architecture/contexts/{ctx}/boundary.yaml", text)
    write(dest, "tests/__init__.py", "")
    write(dest, "tests/conftest.py", "import sys\nfrom pathlib import Path\n\nsys.path.insert(0, str(Path(__file__).resolve().parent.parent))\n")
    write(dest, ".habit-hooks/config.toml", 'plugins = ["python", "generic"]\nfiles = ["**/*.py", "!**/.venv/**"]\n')
    write(dest, ".gitignore", ".cobuilder/\n__pycache__/\n.pytest_cache/\n.serena/\n")
    if mode == "off":
        write(dest, ".cobuilder/structure-signals.json", json.dumps(OFF_CONFIG))
    run = lambda *a: subprocess.run(a, cwd=dest, check=True, capture_output=True)
    run("git", "init", "-q", "-b", "main")
    run("git", "config", "user.email", "replay@example.com")
    run("git", "config", "user.name", "replay")
    run("git", "add", "-A")
    run("git", "commit", "-qm", "seed")


if __name__ == "__main__":
    main()
