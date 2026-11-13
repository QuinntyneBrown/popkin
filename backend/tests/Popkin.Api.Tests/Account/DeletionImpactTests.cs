using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Account;

/// <summary>GET /api/account/deletion-impact: the active Popkins that wrap up with the account (L2-049 AC3).</summary>
public sealed class DeletionImpactTests
{
    // Given Mara, who hosts Lakeside Weekend and Thursday Night Group, both active, and a
    // Popkin she wrapped up, and who is a member of Walt's Popkin,
    // when she reads what deleting her account would wrap up,
    // then it is Lakeside Weekend and Thursday Night Group, each with its id, name and emoji.
    [Fact]
    public async Task The_impact_names_the_active_Popkins_the_person_hosts()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var thursday = await lakeside.Host.StartedAsync("Thursday Night Group", "🎉");
        var done = await lakeside.Host.StartedAsync("Book club", "📚");
        await api.WrapUpAsync(done.Id);
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0177");
        var walts = await walt.StartedAsync("Walt’s Popkin", "⚽");
        (await lakeside.Host.JoinAsync(walts.Code, "Mara")).EnsureSuccessStatusCode();

        var impact = await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/account/deletion-impact");

        var hosted = impact.GetProperty("hostedActivePopkins").EnumerateArray().ToList();
        Assert.Equal(["Lakeside Weekend", "Thursday Night Group"], hosted.Select(p => p.GetProperty("name").GetString()).Order());
        var lakesideRow = hosted.Single(p => p.GetProperty("name").GetString() == "Lakeside Weekend");
        Assert.Equal(lakeside.Id, lakesideRow.GetProperty("popkinId").GetGuid());
        Assert.Equal("🏕️", lakesideRow.GetProperty("emoji").GetString());
        Assert.Contains(hosted, p => p.GetProperty("popkinId").GetGuid() == thursday.Id);
    }

    // Given Walt, who hosts nothing, when he reads the impact, then it lists no Popkin.
    [Fact]
    public async Task Someone_who_hosts_nothing_wraps_nothing_up()
    {
        using var api = new ApiFactory();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0177");

        var impact = await walt.GetFromJsonAsync<JsonElement>("/api/account/deletion-impact");

        Assert.Equal(0, impact.GetProperty("hostedActivePopkins").GetArrayLength());
    }

    // Given no session, when the impact is asked for, then it is refused with 401.
    [Fact]
    public async Task Without_a_session_the_impact_is_refused()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().GetAsync("/api/account/deletion-impact");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
