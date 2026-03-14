/**
 * config.js
 *
 * defines schema and parameters for Raspy
 */
import { RaspyAIResponseSchema } from "./sampleResponse";

// PropertyOverviewEnumValue ...
export const PropertyOverviewEnumValue = "PropertyOverview";
// TenantStatusEnumValue ...
export const TenantStatusEnumValue = "TenantStatus";
// RentAnalysisEnumValue ...
export const RentAnalysisEnumValue = "RentAnalysis";
// MaintenanceAlertsEnumValue ...
export const MaintenanceAlertsEnumValue = "MaintenanceAlerts";
// RecommendedActionsEnumValue ...
export const RecommendedActionsEnumValue = "RecommendedActions";
// OtherEnumValue ...
export const OtherEnumValue = "Other";

// IntentEnumValues ...
// defines the intents that are allowed within the intent classifier
export const IntentEnumValues = {
  PropertyOverview: PropertyOverviewEnumValue,
  TenantStatus: TenantStatusEnumValue,
  RentAnalysis: RentAnalysisEnumValue,
  MaintenanceAlerts: MaintenanceAlertsEnumValue,
  PropertyRecommendations: RecommendedActionsEnumValue,
  Other: OtherEnumValue,
};

// UserIntentResponseSchema ...
// defines the response schema for user intent
const UserIntentResponseSchema = {
  intent: Object.values(IntentEnumValues),
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
      content: `You are a property management assistant. Classify user messages for a property management assistant. If information is missing, return null. Return response as JSON. Do not guess values. Focus on practical insights for landlords.
      Must follow ${UserIntentResponseSchema}. Return ${IntentEnumValues.Other} if missing.`,
    },
    // property analysis
    propertyAnalysis: {
      role: "system",
      content: `You are a property management assistant. Analyze property, tenant, and rent data and produce a useful recap for a property owner. If information is missing, return null. Return response as JSON. Do not guess values. Focus on practical insights for landlords and return a structured response.
    
      Always follow format defined within ${RaspyAIResponseSchema}. The key intent can be used to know what schema to use.`,
    },
  },
};
