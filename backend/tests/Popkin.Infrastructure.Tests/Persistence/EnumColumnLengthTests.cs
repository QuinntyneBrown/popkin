// Traces to: L2-088 AC3
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Infrastructure.Tests.Persistence;

/// <summary>
/// An enum kept as its name fits its column. The InMemory provider ignores maximum lengths, so
/// only the model can show that a name such as <c>AdminSignIn</c> would be truncated by SQL Server.
/// </summary>
public sealed class EnumColumnLengthTests
{
    [Fact]
    public void Every_enum_name_fits_the_column_it_is_kept_in()
    {
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"enum-lengths-{Guid.NewGuid():N}").Options);

        var tooLong =
            from entityType in db.Model.GetEntityTypes()
            from property in entityType.GetProperties()
            let enumType = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType
            where enumType.IsEnum && property.GetProviderClrType() == typeof(string)
            let maxLength = property.GetMaxLength()
            where maxLength is not null
            from name in Enum.GetNames(enumType)
            where name.Length > maxLength
            select $"{entityType.DisplayName()}.{property.Name}: {enumType.Name}.{name} is {name.Length} characters, the column holds {maxLength}";

        Assert.Empty(tooLong);
    }
}
