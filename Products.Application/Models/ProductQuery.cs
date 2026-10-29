namespace Products.Application.Models;

public sealed record ProductQuery
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 10;
    public string? Name { get; init; }
    public int? Min { get; init; }
    public int? Max { get; init; }
}
