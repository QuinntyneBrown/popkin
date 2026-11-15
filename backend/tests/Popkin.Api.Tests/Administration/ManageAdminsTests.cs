using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Administration;

/// <summary>An Owner decides who can use the console (L2-119, L2-078 AC7, L2-086 AC1, AC5).</summary>
public sealed class ManageAdminsTests
{
    // Given an Owner, when they add priya@popkin.app as Support, then she is listed as invited and
    // is sent an invite; when she first signs in, she is active with her role, and the addition is
    // in the audit log (L2-119 AC2, AC4, AC11).
    [Fact]
    public async Task An_owner_adds_an_admin_who_becomes_active_at_first_sign_in()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        var response = await owner.PostAsJsonAsync("/api/admin/admins", new { email = "Priya.Raman@popkin.app", role = "Support" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var added = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("priya.raman@popkin.app", added.GetProperty("email").GetString());
        Assert.Equal("Priya Raman", added.GetProperty("name").GetString());
        Assert.True(added.GetProperty("invited").GetBoolean());
        var invite = Assert.Single(api.AdminInvites.Sent);
        Assert.Equal("priya.raman@popkin.app", invite.Email);
        Assert.Equal("Support", invite.Message.Role.ToString());

        var priya = api.CreateBrowserClient();
        await priya.SignInAsAdminAsync(api, "priya.raman@popkin.app");
        var me = await priya.GetFromJsonAsync<JsonElement>("/api/admin/me");
        Assert.Equal("Support", me.GetProperty("role").GetString());

        var list = await owner.GetFromJsonAsync<JsonElement>("/api/admin/admins");
        Assert.Equal(2, list.GetProperty("count").GetInt32());
        var rows = list.GetProperty("admins").EnumerateArray().ToList();
        Assert.True(rows[0].GetProperty("isYou").GetBoolean());
        Assert.False(rows.Single(r => r.GetProperty("email").GetString() == "priya.raman@popkin.app").GetProperty("invited").GetBoolean());
        var audit = await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit");
        var entry = audit.GetProperty("entries")[0];
        Assert.Equal("AddedAdmin", entry.GetProperty("action").GetString());
        Assert.Equal("Owner", entry.GetProperty("adminName").GetString());
        Assert.Equal("Priya Raman", entry.GetProperty("targetName").GetString());
    }

    // Given an email not at @popkin.app, or already an admin's, when it is added, then nothing is
    // sent and the field says which (L2-119 AC3).
    [Fact]
    public async Task Only_a_new_staff_email_can_be_added()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        var notStaff = await (await owner.PostAsJsonAsync("/api/admin/admins", new { email = "priya@example.com", role = "Viewer" }))
            .AssertProblem(HttpStatusCode.BadRequest, "email_not_staff");
        var exists = await (await owner.PostAsJsonAsync("/api/admin/admins", new { email = "owner@popkin.app", role = "Viewer" }))
            .AssertProblem(HttpStatusCode.BadRequest, "admin_exists");

        Assert.Equal("email", notStaff.GetProperty("field").GetString());
        Assert.Equal("email", exists.GetProperty("field").GetString());
        Assert.Empty(api.AdminInvites.Sent);
    }

    // Given a Support admin, when they try to add an admin, then 403 role_not_allowed and nothing
    // changes; they can still read the list (L2-086 AC1, L2-119 AC10).
    [Fact]
    public async Task A_support_admin_cannot_add_admins()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (support, _) = await api.SignedInAdminAsync(owner, "sam@popkin.app", "Support");

        var refused = await (await support.PostAsJsonAsync("/api/admin/admins", new { email = "lee@popkin.app", role = "Viewer" }))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");

        Assert.Equal("Support", refused.GetProperty("role").GetString());
        Assert.Equal(2, (await support.GetFromJsonAsync<JsonElement>("/api/admin/admins")).GetProperty("count").GetInt32());
    }

    // Given an Owner changes Sam from Support to Viewer, when Sam next opens a page, then it follows
    // the new role; an Owner cannot change their own role (L2-119 AC5, AC7, L2-086 AC5).
    [Fact]
    public async Task A_changed_role_applies_at_the_next_request()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (sam, samId) = await api.SignedInAdminAsync(owner, "sam@popkin.app", "Support");
        var ownerId = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/me")).GetProperty("adminId").GetGuid();

        var response = await owner.PutAsJsonAsync($"/api/admin/admins/{samId}/role", new { role = "Viewer", reason = "Moved to finance" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Viewer", (await sam.GetFromJsonAsync<JsonElement>("/api/admin/me")).GetProperty("role").GetString());
        await (await owner.PutAsJsonAsync($"/api/admin/admins/{ownerId}/role", new { role = "Support" }))
            .AssertProblem(HttpStatusCode.BadRequest, "cannot_change_own_role");
        var entry = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries")[0];
        Assert.Equal("ChangedAdminRole", entry.GetProperty("action").GetString());
        Assert.Equal("Moved to finance", entry.GetProperty("reason").GetString());
    }

    // Given an Owner removes Sam, who is signed in, when Sam makes his next request, then his admin
    // session has ended; he is gone from the list, his past actions stay, and an Owner cannot
    // remove themselves (L2-119 AC6, AC7, L2-078 AC7).
    [Fact]
    public async Task A_removed_admin_is_signed_out_of_the_console()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (sam, samId) = await api.SignedInAdminAsync(owner, "sam@popkin.app", "Support");
        var ownerId = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/me")).GetProperty("adminId").GetGuid();

        var response = await owner.PostAsJsonAsync($"/api/admin/admins/{samId}/remove", new { reason = "Left Popkin" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await sam.GetAsync("/api/admin/me")).StatusCode);
        Assert.Equal(1, (await owner.GetFromJsonAsync<JsonElement>("/api/admin/admins")).GetProperty("count").GetInt32());
        await (await owner.PostAsJsonAsync($"/api/admin/admins/{ownerId}/remove", new { }))
            .AssertProblem(HttpStatusCode.BadRequest, "cannot_remove_self");
        Assert.Equal("RemovedAdmin", (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries")[0].GetProperty("action").GetString());
    }

    // Given a removed admin, when an Owner adds the same email again, then the admin returns with
    // the new role on the same record, invited until they sign in (L2-119 AC2, AC4).
    [Fact]
    public async Task A_removed_admin_can_be_added_again()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (_, samId) = await api.SignedInAdminAsync(owner, "sam@popkin.app", "Support");
        (await owner.PostAsJsonAsync($"/api/admin/admins/{samId}/remove", new { })).EnsureSuccessStatusCode();

        var again = await owner.AddAdminAsync("sam@popkin.app", "Viewer");

        Assert.Equal(samId, again);
        var row = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/admins")).GetProperty("admins").EnumerateArray()
            .Single(r => r.GetProperty("id").GetGuid() == samId);
        Assert.Equal("Viewer", row.GetProperty("role").GetString());
        Assert.True(row.GetProperty("invited").GetBoolean());
    }
}
