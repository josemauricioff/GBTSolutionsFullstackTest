export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ProductQuery {
  page: number;
  pageSize: number;
  name?: string;
  min?: number;
  max?: number;
}
