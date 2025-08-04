
import { supabase } from '@/integrations/supabase/client';
import { TenantAwareService } from './TenantAwareService';
import type { Lead } from '@/types/leads';

export interface ScoringResult {
  score: number;
  recommendedAction: string;
  factors: ScoringFactor[];
  confidence: number;
}

export interface ScoringFactor {
  factor: string;
  value: any;
  impact: number;
  weight: number;
}

export class LeadScoringService extends TenantAwareService {
  private static instance: LeadScoringService;

  static getInstance(): LeadScoringService {
    if (!this.instance) {
      this.instance = new LeadScoringService();
    }
    return this.instance;
  }

  async calculateLeadScore(lead: Lead): Promise<ScoringResult> {
    try {
      // Get active scoring rules for tenant
      const { data: rules } = await supabase
        .from('lead_scoring_rules')
        .select('*')
        .eq('is_active', true)
        .order('score_value', { ascending: false });

      let totalScore = 0;
      const factors: ScoringFactor[] = [];

      // Apply rule-based scoring
      if (rules) {
        for (const rule of rules) {
          const ruleScore = this.evaluateRule(rule, lead);
          if (ruleScore > 0) {
            totalScore += ruleScore;
            factors.push({
              factor: rule.rule_name,
              value: this.getRuleValue(rule, lead),
              impact: ruleScore,
              weight: rule.score_value
            });
          }
        }
      }

      // Apply demographic scoring
      const demographicScore = this.calculateDemographicScore(lead);
      totalScore += demographicScore.score;
      factors.push(...demographicScore.factors);

      // Apply engagement scoring
      const engagementScore = this.calculateEngagementScore(lead);
      totalScore += engagementScore.score;
      factors.push(...engagementScore.factors);

      // Calculate confidence based on data completeness
      const confidence = this.calculateConfidence(lead);

      // Generate AI recommendation
      const recommendedAction = this.generateRecommendation(totalScore, factors);

      const result: ScoringResult = {
        score: Math.min(100, Math.max(0, totalScore)),
        recommendedAction,
        factors,
        confidence
      };

      // Update lead with AI score
      await this.updateLeadAIScore(lead.id, result.score, result.recommendedAction);

      return result;
    } catch (error) {
      console.error('Error calculating lead score:', error);
      return {
        score: 0,
        recommendedAction: 'Review manually',
        factors: [],
        confidence: 0
      };
    }
  }

  private evaluateRule(rule: any, lead: Lead): number {
    // Simplified rule evaluation - would be more complex in production
    try {
      const conditions = rule.conditions || {};
      let matches = true;

      Object.entries(conditions).forEach(([field, expectedValue]) => {
        const leadValue = (lead as any)[field];
        if (leadValue !== expectedValue) {
          matches = false;
        }
      });

      return matches ? rule.score_value : 0;
    } catch (error) {
      return 0;
    }
  }

  private getRuleValue(rule: any, lead: Lead): any {
    const conditions = rule.conditions || {};
    const field = Object.keys(conditions)[0];
    return field ? (lead as any)[field] : null;
  }

  private calculateDemographicScore(lead: Lead): { score: number; factors: ScoringFactor[] } {
    let score = 0;
    const factors: ScoringFactor[] = [];

    // Organization name provided
    if (lead.organization_name) {
      score += 15;
      factors.push({
        factor: 'Has organization name',
        value: lead.organization_name,
        impact: 15,
        weight: 1
      });
    }

    // Complete contact info
    if (lead.phone) {
      score += 10;
      factors.push({
        factor: 'Phone number provided',
        value: lead.phone,
        impact: 10,
        weight: 1
      });
    }

    // Priority level
    const priorityScores = { urgent: 25, high: 20, medium: 10, low: 5 };
    const priorityScore = priorityScores[lead.priority] || 0;
    if (priorityScore > 0) {
      score += priorityScore;
      factors.push({
        factor: 'Priority level',
        value: lead.priority,
        impact: priorityScore,
        weight: 1
      });
    }

    return { score, factors };
  }

  private calculateEngagementScore(lead: Lead): { score: number; factors: ScoringFactor[] } {
    let score = 0;
    const factors: ScoringFactor[] = [];

    // Lead age (newer leads score higher)
    const ageInDays = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
    let ageScore = 0;
    if (ageInDays <= 1) ageScore = 20;
    else if (ageInDays <= 7) ageScore = 15;
    else if (ageInDays <= 30) ageScore = 10;
    else ageScore = 5;

    score += ageScore;
    factors.push({
      factor: 'Lead freshness',
      value: `${ageInDays} days`,
      impact: ageScore,
      weight: 1
    });

    // Status progression
    const statusScores = { contacted: 15, qualified: 25, converted: 50 };
    const statusScore = statusScores[lead.status as keyof typeof statusScores] || 0;
    if (statusScore > 0) {
      score += statusScore;
      factors.push({
        factor: 'Status progression',
        value: lead.status,
        impact: statusScore,
        weight: 1
      });
    }

    // Has notes/details
    if (lead.notes && lead.notes.length > 20) {
      score += 10;
      factors.push({
        factor: 'Detailed notes provided',
        value: `${lead.notes.length} characters`,
        impact: 10,
        weight: 1
      });
    }

    return { score, factors };
  }

  private calculateConfidence(lead: Lead): number {
    let completenessScore = 0;
    const fields = ['contact_name', 'email', 'phone', 'organization_name', 'source', 'notes'];
    
    fields.forEach(field => {
      if ((lead as any)[field]) {
        completenessScore += 1;
      }
    });

    return Math.round((completenessScore / fields.length) * 100);
  }

  private generateRecommendation(score: number, factors: ScoringFactor[]): string {
    if (score >= 80) {
      return 'High priority - Schedule immediate follow-up call';
    } else if (score >= 60) {
      return 'Good prospect - Send personalized email within 24 hours';
    } else if (score >= 40) {
      return 'Moderate interest - Add to nurturing campaign';
    } else if (score >= 20) {
      return 'Low priority - Include in general newsletter';
    } else {
      return 'Review and qualify manually';
    }
  }

  private async updateLeadAIScore(leadId: string, score: number, recommendation: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          ai_score: score,
          ai_recommended_action: recommendation,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) {
        console.error('Error updating lead AI score:', error);
      }
    } catch (error) {
      console.error('Error updating lead AI score:', error);
    }
  }
}

export const leadScoringService = LeadScoringService.getInstance();
