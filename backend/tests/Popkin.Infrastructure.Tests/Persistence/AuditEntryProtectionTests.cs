// Traces to: L2-120 AC6
using Microsoft.EntityFrameworkCore;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Infrastructure.Tests.Persistence;

/// <summary>Nobody can edit the audit log; only an entry two years old can be deleted (L2-120 AC6).</summary>
public sealed class AuditEntryProtectionTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    [Fact]
    public async Task A_changed_entry_is_not_saved()
    {
        await using var db = NewContext();
        var entry = await AddEntryAsync(db, Now);

        db.Entry(entry).Property(e => e.Reason).CurrentValue = "rewritten";

        await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task A_recent_entry_cannot_be_deleted()
    {
        await using var db = NewContext();
        var entry = await AddEntryAsync(db, Now - AuditEntry.Retention + TimeSpan.FromDays(1));

        db.AuditEntries.Remove(entry);

        await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task An_entry_two_years_old_can_be_deleted()
    {
        await using var db = NewContext();
        var entry = await AddEntryAsync(db, Now - AuditEntry.Retention - TimeSpan.FromDays(1));

        db.AuditEntries.Remove(entry);
        await db.SaveChangesAsync();

        Assert.Empty(db.AuditEntries);
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase($"audit-{Guid.NewGuid():N}").Options);

    private static async Task<AuditEntry> AddEntryAsync(AppDbContext db, DateTimeOffset at)
    {
        var entry = AuditEntry.Write(at, null, "Popkin", AuditAction.AddedAdmin, AuditTargetKind.Admin, Guid.NewGuid().ToString(), "Owner", "Kept", "{}");
        db.AuditEntries.Add(entry);
        await db.SaveChangesAsync();
        return entry;
    }
}
