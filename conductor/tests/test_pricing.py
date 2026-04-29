
import pytest
from apps.commerce.pricing_engine import PricingEngine

def test_pricing_engine():
    print("Running Pricing Optimizer Verification...")
    engine = PricingEngine(base_price=100.0, price_elasticity=-1.5, competitor_price=110.0)
    results = engine.optimize(generations=20)

    print(f"\nFound {len(results)} optimal price points.")

    assert results, "No results found!"

    print("\nSample Optimal Prices:")
    for r in results[:5]:
        print(r)

    assert results[0]['predicted_revenue'] > 0 and results[0]['retention_score'] >= 0, "Pricing Engine Output Invalid"

