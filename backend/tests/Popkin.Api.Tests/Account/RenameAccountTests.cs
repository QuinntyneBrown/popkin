using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Account;

/// <summary>PATCH /api/account: a new name shows wherever the person appears (L2-048 AC2, AC3).</summary>
public sealed class RenameAccountTests
{
    private static Task<HttpResponseMessage> RenameAsync(HttpClient client, string? name) =>
        client.PatchAsJsonAsync("/api/account", new { name });

    // Given Mara, who hosts Lakeside Weekend and once joined Walt's Popkin and left it,
    // when she saves " Mara O. " as her name,
    // then the account answers with "Mara O.", her session reads it, Lakeside's members show it,
    // and the Popkin she left still shows the name she had there.
    [Fact]
    public async Task A_new_name_shows_wherever_the_person_appears()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0177");
        var created = await walt.PostAsJsonAsync("/api/popkins", new { name = "Thursday Night Group", emoji = "🎉", colour = "Coral", length = "KeepItGoing" });
        var body = await created.Content.ReadFromJsonAsync<JsonElement>();
        var thursday = body.GetProperty("inviteCode").GetString()!;
        var thursdayId = body.GetProperty("id").GetGuid();
        (await lakeside.Host.JoinAsync(thursday, "Mara")).EnsureSuccessStatusCode();
        await api.LeaveAsync(thursdayId, "Mara");

        var response = await RenameAsync(lakeside.Host, " Mara O. ");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Mara O.", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("name").GetString());
        Assert.Equal("Mara O.", (await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/auth/session")).GetProperty("name").GetString());
        var members = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/members");
        Assert.Equal("Mara O.", members[0].GetProperty("displayName").GetString());
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal("Mara", db.Memberships.Single(m => m.PopkinId == thursdayId && m.PersonId == lakeside.HostPersonId).DisplayName);
    }

    // Given Mara, when she saves an empty name, a name of spaces or one of 41 characters,
    // then each is refused with 400 `name_invalid` on the field `name`, and her name stays.
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("A name that runs to forty-one characters!")]
    public async Task A_name_must_be_1_to_40_characters(string? name)
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await RenameAsync(mara, name);

        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, "name_invalid");
        Assert.Equal("name", problem.GetProperty("field").GetString());
        Assert.Equal("Mara Okafor", (await mara.GetFromJsonAsync<JsonElement>("/api/account")).GetProperty("name").GetString());
    }
}
