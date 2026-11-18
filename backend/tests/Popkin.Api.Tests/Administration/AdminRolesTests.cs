using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Administration;

/// <summary>What each role may do, as the API tells the admin app (L2-086).</summary>
public sealed class AdminRolesTests
{
    // Given the first Owner, when GET /api/admin/me is read, then `allowed` names every action an
    // Owner may take, so the admin app disables nothing for them (L2-086 AC3).
    [Fact]
    public async Task An_owner_is_allowed_every_action()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        var me = await owner.GetFromJsonAsync<JsonElement>("/api/admin/me");

        var allowed = me.GetProperty("allowed").EnumerateArray().Select(a => a.GetString()).ToList();
        Assert.Contains("ManageAdmins", allowed);
        Assert.Contains("StartDeletion", allowed);
        Assert.Contains("ExportAuditLog", allowed);
        Assert.Equal(24, allowed.Count);
    }

    // Given one Owner, when "What each role can do" is read, then it counts the admins of each role
    // and lists the table of L2-086 in its order (L2-086 AC4).
    [Fact]
    public async Task The_roles_table_counts_the_admins_of_each_role()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        var roles = await owner.GetFromJsonAsync<JsonElement>("/api/admin/roles");

        var counts = roles.GetProperty("counts");
        Assert.Equal(1, counts.GetProperty("owner").GetInt32());
        Assert.Equal(0, counts.GetProperty("support").GetInt32());
        Assert.Equal(0, counts.GetProperty("viewer").GetInt32());
        var rows = roles.GetProperty("rows").EnumerateArray().ToList();
        Assert.Equal(13, rows.Count);
        Assert.Equal("Deletion", rows[2].GetProperty("row").GetString());
        Assert.True(rows[2].GetProperty("owner").GetBoolean());
        Assert.False(rows[2].GetProperty("support").GetBoolean());
        Assert.False(rows[2].GetProperty("viewer").GetBoolean());
    }
}
