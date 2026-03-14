// RaspyAIResponseSchema ...
// defines the default messages for Raspy AI for dev mode this is done to prevent overuse of tokens and to limit the hallucinations of the AI system. The structure for the Raspy Response messages are built in this format.
export const RaspyAIResponseSchema = {
  PropertyOverview: {
    portfolioHealth: {
      totalProperties: 1,
      vacantProperties: 1,
      activeProperties: 1,
    },
    financialHealth: {
      totalMonthlyRentIncome: 0,
      averageRentalYield: null, // TODO: CAN RASPY AI BRING THIS ??
      securityDepositsCollected: 0,
      totalPortfolioValue: null, // TODO: CAN RASPY AI BRING THIS ??
    },
    recommendedActions: [
      "Test - Displaying PropertyOverview",
      "List property on rental platforms to attract tenants",
      "Verify HOA compliance for rental regulations",
      "Conduct property inspection to ensure rental readiness",
      "Establish emergency contact protocol",
      "Review flood plan documentation for risk mitigation",
    ],
  },
  TenantStatus: {
    portfolioHealth: {
      totalProperties: 1,
      vacantProperties: 1,
      activeProperties: 1,
    },
    financialHealth: {
      totalMonthlyRentIncome: 0,
      averageRentalYield: null, // TODO: CAN RASPY AI BRING THIS ??
      securityDepositsCollected: 0,
      totalPortfolioValue: null, // TODO: CAN RASPY AI BRING THIS ??
    },
    recommendedActions: [
      "Test - Displaying TenantStatus",
      "List property on rental platforms to attract tenants",
      "Verify HOA compliance for rental regulations",
      "Conduct property inspection to ensure rental readiness",
      "Establish emergency contact protocol with tenant",
      "Review flood plan documentation for risk mitigation",
    ],
  },
  RentAnalysis: {
    portfolioHealth: {
      totalProperties: 1,
      vacantProperties: 1,
      activeProperties: 1,
    },
    financialHealth: {
      totalMonthlyRentIncome: 0,
      averageRentalYield: null, // TODO: CAN RASPY AI BRING THIS ??
      securityDepositsCollected: 0,
      totalPortfolioValue: null, // TODO: CAN RASPY AI BRING THIS ??
    },
    recommendedActions: [
      "Test - Displaying RentAnalysis",
      "Search for cleaners around the area",
      "Verify utility and water is in good shape.",
      "Explain grace period to the user for rent",
      "Establish emergency contact protocol with the tenant.",
    ],
  },
  MaintenanceAlerts: {
    portfolioHealth: {
      totalProperties: 1,
      vacantProperties: 1,
      activeProperties: 1,
    },
    financialHealth: {
      totalMonthlyRentIncome: 0,
      averageRentalYield: null, // TODO: CAN RASPY AI BRING THIS ??
      securityDepositsCollected: 0,
      totalPortfolioValue: null, // TODO: CAN RASPY AI BRING THIS ??
    },
    recommendedActions: [],
  },
  RecommendedActions: {
    portfolioHealth: {
      totalProperties: 1,
      vacantProperties: 1,
      activeProperties: 1,
    },
    financialHealth: {
      totalMonthlyRentIncome: 0,
      averageRentalYield: null, // TODO: CAN RASPY AI BRING THIS ??
      securityDepositsCollected: 0,
      totalPortfolioValue: null, // TODO: CAN RASPY AI BRING THIS ??
    },
    recommendedActions: ["Test - Displaying MaintenanceAlerts"],
  },
  Other: {
    portfolioHealth: {
      totalProperties: 1,
      vacantProperties: 1,
      activeProperties: 1,
    },
    financialHealth: {
      totalMonthlyRentIncome: 0,
      averageRentalYield: null, // TODO: CAN RASPY AI BRING THIS ??
      securityDepositsCollected: 0,
      totalPortfolioValue: null, // TODO: CAN RASPY AI BRING THIS ??
    },
    recommendedActions: ["Testing - Other recommended actions is displayed"],
  },
};
