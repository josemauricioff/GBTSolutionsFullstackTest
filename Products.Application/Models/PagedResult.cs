namespace Products.Application.Models;

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount)
{
    public int TotalPages => (int)((TotalCount + (long)PageSize - 1) / PageSize);
}
