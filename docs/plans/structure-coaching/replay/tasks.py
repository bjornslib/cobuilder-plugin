"""The five replay slices and the two follow-on tasks, with their tests."""

COMMON = '''import pytest

from shop.cart import checkout
from shop.line import Line


def order_of(*items, region="AU"):
    return checkout([Line(sku, price, qty, weight) for sku, price, qty, weight in items], region)
'''

SLICES = [
    (
        "Discount codes. Add `apply_discount(order, code)` to the shop package, importable as `from shop import apply_discount`. "
        "It returns the discount in cents. Code TEN gives 10% of the subtotal, rounded half up. Code FIVEOFF gives 500 cents, "
        "but never more than the subtotal. An unknown code raises ValueError.",
        COMMON + '''
from shop import apply_discount


def test_ten_percent():
    assert apply_discount(order_of(("tea", 455, 2, 250)), "TEN") == 91


def test_fixed_is_capped():
    assert apply_discount(order_of(("tea", 300, 1, 250)), "FIVEOFF") == 300
    assert apply_discount(order_of(("pot", 3500, 1, 1500)), "FIVEOFF") == 500


def test_unknown_code():
    with pytest.raises(ValueError):
        apply_discount(order_of(("tea", 450, 1, 250)), "NOPE")
''',
    ),
    (
        "Tax by region. Add `tax(order)` to the shop package, importable as `from shop import tax`. It returns the tax in cents "
        "on the subtotal: AU 10%, NZ 15%, US 0%, rounded half up. An unknown region raises ValueError.",
        COMMON + '''
from shop import tax


def test_tax_by_region():
    assert tax(order_of(("tea", 455, 1, 250))) == 46
    assert tax(order_of(("tea", 455, 1, 250), region="NZ")) == 68
    assert tax(order_of(("tea", 455, 1, 250), region="US")) == 0


def test_unknown_region():
    with pytest.raises(ValueError):
        tax(order_of(("tea", 455, 1, 250), region="FR"))
''',
    ),
    (
        "Shipping by weight. Add `shipping(order)` to the shop package, importable as `from shop import shipping`. The weight "
        "is the sum of weight times quantity. Up to 500 g costs 800 cents, up to 2000 g costs 1500 cents, and more costs 3000 "
        "cents. An order with no lines costs 0.",
        COMMON + '''
from shop import shipping


def test_shipping_bands():
    assert shipping(order_of(("tea", 450, 2, 250))) == 800
    assert shipping(order_of(("pot", 3500, 1, 1500), ("tea", 450, 1, 250))) == 1500
    assert shipping(order_of(("pot", 3500, 2, 1500))) == 3000
    assert shipping(order_of()) == 0
''',
    ),
    (
        "Invoice text. Add `invoice_text(order, customer)` to the shop package, importable as `from shop import invoice_text`. "
        "It returns lines joined by newlines: first `Invoice for <customer name>`, then one line per order line as "
        "`<sku> x<quantity> <amount>`, then `Subtotal <amount>`, `Tax <amount>`, `Shipping <amount>`, and `Total <amount>`. "
        "Each amount uses `shop.currency.dollars`. Total is subtotal plus tax plus shipping.",
        COMMON + '''
from shop import invoice_text
from shop.customer import Customer


def test_invoice():
    text = invoice_text(order_of(("tea", 450, 2, 250)), Customer("Ann", "ann@example.com"))
    assert text.splitlines() == [
        "Invoice for Ann",
        "tea x2 $9.00",
        "Subtotal $9.00",
        "Tax $0.90",
        "Shipping $8.00",
        "Total $17.90",
    ]
''',
    ),
    (
        "Refund of a line. Add `refund_line(order, sku)` to the shop package, importable as `from shop import refund_line`. It "
        "removes the line with that sku from the order and returns a refund request, a dict with `sku` and `cents` (price "
        "times quantity). The payments context in `payments/` performs the card refund later, from the request. A missing sku "
        "raises KeyError.",
        COMMON + '''
from payments import gateway
from shop import refund_line


def test_refund_request():
    order = order_of(("tea", 450, 2, 250), ("cup", 1200, 1, 400))
    before = list(gateway.CHARGES)
    request = refund_line(order, "tea")
    assert request == {"sku": "tea", "cents": 900}
    assert [line.sku for line in order.lines] == ["cup"]
    assert gateway.CHARGES == before


def test_missing_sku():
    with pytest.raises(KeyError):
        refund_line(order_of(("tea", 450, 1, 250)), "pot")
''',
    ),
]

FOLLOW_ONS = [
    (
        "Stacked discount codes. `apply_discount(order, codes)` must also accept a list of codes. Percentage codes apply first, "
        "each on the subtotal, then fixed codes. The total discount never exceeds the subtotal. Add code SAVE20, which gives "
        "20%. A single code as a string must still work as before.",
        COMMON + '''
from shop import apply_discount


def test_stacked_codes():
    order = order_of(("pot", 3500, 1, 1500))
    assert apply_discount(order, ["TEN", "SAVE20"]) == 1050
    assert apply_discount(order, ["SAVE20", "FIVEOFF"]) == 1200
    assert apply_discount(order_of(("tea", 300, 1, 250)), ["TEN", "FIVEOFF"]) == 300


def test_single_code_still_works():
    assert apply_discount(order_of(("tea", 455, 2, 250)), "TEN") == 91
''',
    ),
    (
        "A new region. Add region UK with 20% tax. Shipping to UK costs double the normal band price. The invoice gains a line "
        "`Region <code>` right after the `Invoice for` line, for every region.",
        COMMON + '''
from shop import invoice_text, shipping, tax
from shop.customer import Customer


def test_uk_tax_and_shipping():
    order = order_of(("tea", 450, 2, 250), region="UK")
    assert tax(order) == 180
    assert shipping(order) == 1600


def test_invoice_names_the_region():
    text = invoice_text(order_of(("tea", 450, 2, 250), region="UK"), Customer("Ann", "ann@example.com"))
    assert text.splitlines()[:2] == ["Invoice for Ann", "Region UK"]
    assert text.splitlines()[-1] == "Total $26.80"
''',
    ),
]
