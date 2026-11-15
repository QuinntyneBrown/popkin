using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Application.Administration;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Administration;

/// <summary>Every action in the console, who did it and why, kept and never edited (L2-120).</summary>
public sealed class AuditLogTests
{
    // Given the API added the first Owner at start, when the audit log opens, then that addition is
    // its one entry, written by Popkin, naming the Owner (L2-120 AC1, L2-119 AC9).
    [Fact]
    public async Task The_first_owner_s_addition_is_in_the_audit_log()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        var page = await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit");

        Assert.Equal(1, page.GetProperty("total").GetInt32());
        var entry = Assert.Single(page.GetProperty("entries").EnumerateArray());
        Assert.Equal("AddedAdmin", entry.GetProperty("action").GetString());
        Assert.Equal("Popkin", entry.GetProperty("adminName").GetString());
        Assert.Equal("Admin", entry.GetProperty("targetKind").GetString());
        Assert.Equal("Owner", entry.GetProperty("targetName").GetString());
        Assert.Equal(JsonValueKind.Null, page.GetProperty("next").ValueKind);
    }

    // Given several entries, when the log is read two at a time, then each page holds the next
    // entries, newest first, with none repeated, and says how many there are (L2-120 AC3).
    [Fact]
    public async Task Older_actions_continue_where_the_page_ended()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        for (var i = 0; i < 2; i++)
        {
            (await owner.GetAsync("/api/admin/audit/export")).EnsureSuccessStatusCode();
        }

        var first = await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit?limit=2");
        var next = first.GetProperty("next").GetString();
        var second = await owner.GetFromJsonAsync<JsonElement>($"/api/admin/audit?limit=2&before={next}");

        Assert.Equal(3, first.GetProperty("total").GetInt32());
        Assert.Equal(["ExportedAuditLog", "ExportedAuditLog"], first.GetProperty("entries").EnumerateArray().Select(e => e.GetProperty("action").GetString()));
        Assert.Equal(["AddedAdmin"], second.GetProperty("entries").EnumerateArray().Select(e => e.GetProperty("action").GetString()));
        Assert.Equal(JsonValueKind.Null, second.GetProperty("next").ValueKind);
    }

    // Given the search, when it matches an action's label or nothing, then only the matching
    // entries are listed (L2-120 AC2).
    [Fact]
    public async Task The_search_keeps_the_entries_that_match()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        var added = await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit?search=added%20admin");
        var none = await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit?search=lakeside");

        Assert.Equal(1, added.GetProperty("total").GetInt32());
        Assert.Equal(0, none.GetProperty("total").GetInt32());
        Assert.Empty(none.GetProperty("entries").EnumerateArray());
    }

    // Given any admin, when "Export CSV" is chosen, then a CSV of the matching entries downloads,
    // and the export is itself an entry (L2-120 AC4, AC5).
    [Fact]
    public async Task The_log_exports_as_csv()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        var response = await owner.GetAsync("/api/admin/audit/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.StartsWith("attachment", response.Content.Headers.ContentDisposition?.ToString());
        var lines = (await response.Content.ReadAsStringAsync()).TrimEnd().Split('\n');
        Assert.Equal("Time (UTC),Admin,Admin id,Action,Target kind,Target,Target id,Reason,Details", lines[0].TrimEnd('\r'));
        Assert.Contains(lines, l => l.Contains("Added admin", StringComparison.Ordinal));
        var page = await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit");
        Assert.Equal("ExportedAuditLog", page.GetProperty("entries")[0].GetProperty("action").GetString());
    }

    // Given an entry, when anyone asks to change or delete it, then there is no way to (L2-120 AC6).
    [Fact]
    public async Task No_endpoint_changes_or_deletes_an_entry()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var id = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries")[0].GetProperty("id").GetInt64();

        // No endpoint answers them, so the fallback policy refuses them like any unknown path.
        Assert.False((await owner.DeleteAsync($"/api/admin/audit/{id}")).IsSuccessStatusCode);
        Assert.False((await owner.PutAsJsonAsync($"/api/admin/audit/{id}", new { reason = "x" })).IsSuccessStatusCode);
        Assert.False((await owner.PatchAsJsonAsync($"/api/admin/audit/{id}", new { reason = "x" })).IsSuccessStatusCode);
        Assert.Equal(1, (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("total").GetInt32());
    }

    // Given an entry two years old and a newer one, when the purge runs, then only the old one is
    // deleted (L2-120 AC1, AC6).
    [Fact]
    public async Task Entries_are_deleted_once_they_are_two_years_old()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.AuditEntries.Add(AuditEntry.Write(
                api.Clock.GetUtcNow() - AuditEntry.Retention - TimeSpan.FromDays(1), null, "Popkin", AuditAction.AddedAdmin, AuditTargetKind.Admin, "old", "Old Owner", null, "{}"));
            await db.SaveChangesAsync();
        }

        var purged = await api.SendAsync(new PurgeOldAuditEntriesCommand());

        Assert.Equal(1, purged);
        var page = await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit");
        Assert.Equal("Owner", Assert.Single(page.GetProperty("entries").EnumerateArray()).GetProperty("targetName").GetString());
    }
}
