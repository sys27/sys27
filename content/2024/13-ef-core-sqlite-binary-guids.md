---
title: How to map GUID to BLOB in EF Core SQLite
description: Starting with EF Core 3.0, GUIDs are stored as TEXT in SQLite. Use a custom value converter to store them as BLOB by converting GUIDs to byte arrays.
tags: .net, ef-core, sql, sqlite
date: 2024-08-11
---

Hello there!

EF Core changed the way how GUIDs are stored in the SQLite database. Starting from version 3.0, they are stored as `TEXT` [GitHub](https://github.com/dotnet/efcore/issues/15078). But what is you want to change it back. Then you need to introduce a value converter to convert GUIDs to byte arrays.

```csharp
public static class ModelBuilderExtensions
{
    public static void ConfigureGuids(this ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            var properties = entity.GetProperties().Where(x => x.ClrType == typeof(Guid));

            foreach (var property in properties)
            {
                property.SetColumnType("BLOB");
                property.SetValueConverter(GuidConverter.Instance);
            }

            properties = entity.GetProperties().Where(x => x.ClrType == typeof(Guid?));

            foreach (var property in properties)
            {
                property.SetColumnType("BLOB");
                property.SetValueConverter(NullableGuidConverter.Instance);
            }
        }
    }
}

public class GuidConverter : ValueConverter<Guid, byte[]>
{
    public static readonly GuidConverter Instance = new GuidConverter();

    public GuidConverter()
        : base(x => x.ToByteArray(), x => new Guid(x))
    {
    }
}

public class NullableGuidConverter : ValueConverter<Guid?, byte[]?>
{
    public static readonly NullableGuidConverter Instance = new NullableGuidConverter();

    public NullableGuidConverter()
        : base(
            x => x != null ? x.Value.ToByteArray() : null,
            x => x != null ? new Guid(x) : null)
    {
    }
}
```

Here is an extension method to use in `OnModelCreating` of `DbContext`. It scans all properties with `Guid` or `Guid?` types, sets their column types as `BLOB`, and registers converters.