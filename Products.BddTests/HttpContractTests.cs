using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Products.Application.Abstractions;
using Products.Application.Models;
using Products.Domain.Entities;
using Products.Domain.ValueObjects;
using Xunit;

namespace Products.BddTests;

public sealed class HttpContractTests
{
    private static WebApplicationFactory<Program> CreateFactory() =>
        new WebApplicationFactory<Program>()
            .WithWebHostBuilder(host =>
            {
                host.UseEnvironment("Testing");

                host.ConfigureServices(services =>
                {
                    services.RemoveAll<IProductRepository>();

                    services.AddSingleton<IProductRepository>(
                        new FakeProductRepository());
                });
            });

    [Fact]
    public async Task DomainValidationIsTranslatedToBadRequest()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/products",
            new
            {
                name = "Lens",
                price = 0m,
                stock = 1
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var details = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        Assert.Equal(
            400,
            details.RootElement.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task MissingRequestFieldIsRejectedBeforeUseCase()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/products",
            new
            {
                name = "Lens",
                stock = 1
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ProductListIncludesStock()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var products = await client.GetFromJsonAsync<PagedResult<ProductDto>>(
            "/api/products");

        Assert.NotNull(products);
        Assert.Equal(5, Assert.Single(products.Items).Stock);
        Assert.Equal(1, products.Page);
        Assert.Equal(10, products.PageSize);
        Assert.Equal(1, products.TotalCount);
        Assert.Equal(1, products.TotalPages);
    }

    [Fact]
    public async Task MissingProductMapsToNotFound()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            "/api/products/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(0)]
    [InlineData(99999)]
    [InlineData(1000000)]
    public async Task InvalidProductIdentifierMapsToBadRequest(int id)
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(
            $"/api/products/{id}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task InsufficientStockMapsToConflict()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsync(
            "/api/products/100000/decrement-stock/99",
            null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/products?page=0")]
    [InlineData("/api/products?pageSize=101")]
    [InlineData("/api/products?min=20&max=10")]
    [InlineData("/api/products/search")]
    [InlineData("/api/products/stock-level?min=0")]
    public async Task InvalidPaginationAndMissingFiltersReturnBadRequest(string path)
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RequestedPageAndSizeAreReturnedInTheResponse()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();
        var result = await client.GetFromJsonAsync<PagedResult<ProductDto>>("/api/products?page=2&pageSize=1");
        Assert.NotNull(result);
        Assert.Equal(2, result.Page);
        Assert.Equal(1, result.PageSize);
        Assert.Equal(1, result.TotalCount);
        Assert.Empty(result.Items);
    }

    private sealed class FakeProductRepository : IProductRepository
    {
        public async Task<PagedResult<Product>> GetPageAsync(ProductQuery query, CancellationToken cancellationToken)
        {
            var products = await GetAllAsync(cancellationToken);
            return new PagedResult<Product>(
                products.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToArray(),
                query.Page, query.PageSize, products.Count);
        }

        public Task<IReadOnlyList<Product>> GetAllAsync(
            CancellationToken cancellationToken)
        {
            var product = Product.Create("Lens", 1m, 5);

            typeof(Product)
                .GetProperty(nameof(Product.Id))!
                .SetValue(product, Product.CreateIdentifier(100000));

            return Task.FromResult<IReadOnlyList<Product>>([product]);
        }

        public Task<Product?> GetByIdAsync(
            PositiveNumber<int> id,
            CancellationToken cancellationToken) =>
            Task.FromResult<Product?>(null);

        public Task<Product> AddAsync(
            Product product,
            CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<bool> UpdateAsync(
            PositiveNumber<int> id,
            Product product,
            CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<bool> DeleteAsync(
            PositiveNumber<int> id,
            CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<Product>> SearchAsync(
            string name,
            CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<Product>> GetByStockRangeAsync(
            int minimum,
            int maximum,
            CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<StockChangeResult> IncreaseStockAsync(
            PositiveNumber<int> id,
            PositiveNumber<int> quantity,
            CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<StockChangeResult> DecreaseStockAsync(
            PositiveNumber<int> id,
            PositiveNumber<int> quantity,
            CancellationToken cancellationToken) =>
            Task.FromResult(StockChangeResult.InsufficientStock);
    }
}