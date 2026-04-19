/**
 * config.js
 *
 * defines schema and parameters for Raspy
 */

// PropertyOverviewEnumValue ...
export const PropertyOverviewEnumValue = "PropertyOverview";
// TenantStatusEnumValue ...
export const TenantStatusEnumValue = "TenantStatus";
// RentAnalysisEnumValue ...
export const RentAnalysisEnumValue = "RentAnalysis";
// MaintenanceAlertsEnumValue ...
export const MaintenanceAlertsEnumValue = "MaintenanceAlerts";

// OtherEnumValue ...
export const OtherEnumValue = "Other";

// IntentEnumValues ...
// defines the intents that are allowed within the intent classifier
export const IntentEnumValues = {
  PropertyOverview: PropertyOverviewEnumValue,
  TenantStatus: TenantStatusEnumValue,
  RentAnalysis: RentAnalysisEnumValue,
  MaintenanceAlerts: MaintenanceAlertsEnumValue,
  Other: OtherEnumValue,
};

// GrokModelProps ...
// defines the props for grok model
// contains various system message prompts
export const GrokModelProps = {
  model: "qwen/qwen3-32b",
  temperature: 0.3,
  max_tokens: 1200,
  systemMessages: {
    // user intent
    userIntent: {
      role: "system",
      content: `You are a property management assistant. Classify user messages for a property management assistant. Use your best knowledge to guess what the user is trying to solve. Return response as JSON.`,
    },
    // property analysis
    propertyAnalysis: {
      role: "system",
      content: `You are a property management assistant. Analyze property, tenant, and rent data and produce a useful recap for a property owner. Return response as JSON. Do not guess values. Focus on practical insights for landlords.
    
      Return list of recommended actions that the property owner can take.`,
    },
  },
};
