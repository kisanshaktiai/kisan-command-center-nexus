
// Repository pattern type definitions
export interface Repository<T, TId = string> {
  findById(id: TId): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: TId): Promise<void>;
}

export interface QueryRepository<T> {
  findByQuery(query: Query): Promise<T[]>;
  count(query: Query): Promise<number>;
}

export interface Query {
  filters: Record<string, unknown>;
  sorting: SortingCriteria[];
  pagination: PaginationCriteria;
}

export interface SortingCriteria {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationCriteria {
  page: number;
  size: number;
}
