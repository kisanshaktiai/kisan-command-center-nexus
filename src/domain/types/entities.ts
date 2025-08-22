
// Domain entity type definitions
export interface DomainEntity {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AggregateRoot extends DomainEntity {
  domainEvents: DomainEvent[];
}

export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  version: number;
  timestamp: Date;
  data: Record<string, unknown>;
}
