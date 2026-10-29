param(
    [string]$ApiUrl = 'http://localhost:5100',
    [ValidateRange(1, 1000)][int]$Count = 35
)

$ErrorActionPreference = 'Stop'
for ($index = 1; $index -le $Count; $index++) {
    $request = @{
        name = 'Demo product {0:D3}' -f $index
        price = [decimal]($index + 0.50)
        stock = $index % 51
    } | ConvertTo-Json
    Invoke-RestMethod -Uri ($ApiUrl.TrimEnd('/') + '/api/products') -Method Post -ContentType 'application/json' -Body $request | Out-Null
}
Write-Output ('Created {0} demo products through the API.' -f $Count)
