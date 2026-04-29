
import logging
import math
import random
from typing import List, Dict, Any
from apps.optimization.evolutionary import MultiObjectiveGA, Individual

logger = logging.getLogger(__name__)

class PricingEngine:
    """
    AI-Powered Pricing Optimization Engine.
    Uses NSGA-II (Multi-Objective Genetic Algorithm) to find optimal price points.
    Objectives:
    1. Maximize Revenue
    2. Maximize User Retention / Market Share
    """

    def __init__(self, base_price: float, price_elasticity: float = -1.5, competitor_price: float = 100.0):
        self.base_price = base_price
        self.elasticity = price_elasticity
        self.competitor_price = competitor_price
        self.optimizer = MultiObjectiveGA(
            pop_size=50,
            gene_length=1, # Only optimizing Price Factor (0.5x to 2.0x)
            mutation_rate=0.2,
            crossover_rate=0.8
        )

    def _demand_function(self, price: float) -> float:
        """Simple demand curve: Demand = Baseline * (Price / BasePrice) ^ Elasticity"""
        if price <= 0: return 1000.0 # Cap
        return 100.0 * ((price / self.base_price) ** self.elasticity)

    def _revenue_objective(self, chromosome: List[float]) -> float:
        """Objective 1: Maximize Revenue."""
        price_factor = 0.5 + (chromosome[0] * 2.5) # Map [0,1] to [0.5, 3.0]
        price = self.base_price * price_factor
        
        demand = self._demand_function(price)
        revenue = price * demand
        return revenue # Maximize

    def _retention_objective(self, chromosome: List[float]) -> float:
        """Objective 2: Maximize Retention / Market Competitiveness."""
        price_factor = 0.5 + (chromosome[0] * 2.5)
        price = self.base_price * price_factor
        
        # Competitiveness: Higher is better (lower price vs competitor)
        # If price < competitor, score 1.0. If price > competitor, decays.
        
        ratio = price / self.competitor_price
        if ratio < 0.8:
            score = 100.0 # Excellent value
        elif ratio > 1.5:
            score = 0.0 # Too expensive
        else:
            # Linear decay from 0.8 to 1.5
            score = 100.0 * (1.5 - ratio) / (0.7)
            
        return max(0, score)

    def optimize(self, generations: int = 30) -> List[Dict[str, float]]:
        """
        Run the optimization.
        Returns list of optimal price points (Pareto Front).
        """
        logger.info(f"Starting Pricing Optimization for Base Price ${self.base_price}")
        
        def obj1(chrom): return self._revenue_objective(chrom)
        def obj2(chrom): return self._retention_objective(chrom)
        
        pareto_individuals = self.optimizer.run_multi_objective(
            objective_fns=[obj1, obj2],
            generations=generations
        )
        
        results = []
        for ind in pareto_individuals:
            price_factor = 0.5 + (ind.chromosome[0] * 2.5)
            price = self.base_price * price_factor
            revenue = ind.objectives[0]
            retention_score = ind.objectives[1]
            
            results.append({
                "price": round(price, 2),
                "factor": round(price_factor, 2),
                "predicted_revenue": round(revenue, 2),
                "retention_score": round(retention_score, 2)
            })
            
        # Deduplicate and sort by price
        unique_results = {r['price']: r for r in results}.values()
        return sorted(list(unique_results), key=lambda x: x['price'])

def demo():
    engine = PricingEngine(base_price=50.0, price_elasticity=-1.2, competitor_price=60.0)
    results = engine.optimize()
    print("Optimal Pricing Strategies (Pareto Front):")
    print(f"{'Price':<10} | {'Revenue':<10} | {'Retention':<10}")
    print("-" * 36)
    for r in results:
        print(f"${r['price']:<9} | ${r['predicted_revenue']:<9} | {r['retention_score']:<10}")

if __name__ == '__main__':
    demo()
