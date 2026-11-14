using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Popkins;

/// <summary>
/// PUT /api/popkins/{popkinId}/length: the Host changes how long the Popkin lasts, under the rules
/// of L2-009, and the time left changes for every member (L2-020 AC4, AC5).
/// </summary>
public sealed class ChangePopkinLengthTests
{
    // Given Lakeside Weekend, for the weekend, its Host and a member, each with the Popkin open,
    // when the Host chooses "Until a date" three days away,
    // then the answer, the home and PopkinChanged carry the new end and length.
    [Fact]
    public async Task The_Host_changes_the_end_and_every_member_hears_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        var endsAt = api.Clock.GetUtcNow().AddDays(3);

        var response = await lakeside.Host.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/length", new { length = "UntilDate", endsAt });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        AssertLength(saved, "UntilDate", endsAt);
        AssertLength(await joel.HomeAsync(lakeside.Id), "UntilDate", endsAt);
        var changed = await joelHub.WaitForAsync("PopkinChanged");
        Assert.Equal(lakeside.Id, changed.Arguments[0].GetGuid());
        AssertLength(changed.Arguments[1], "UntilDate", endsAt);
    }

    // Given Lakeside Weekend, for the weekend, when the Host chooses "Keep it going", then it has no end.
    [Fact]
    public async Task Keep_it_going_takes_the_end_away()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/length", new { length = "KeepItGoing", endsAt = (DateTimeOffset?)null });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AssertLength(await lakeside.Host.HomeAsync(lakeside.Id), "KeepItGoing", null);
    }

    // Given the Host, when they choose a date less than an hour away,
    // then 400 ends_at_out_of_range and the end stays.
    [Fact]
    public async Task An_end_too_soon_is_refused_under_the_rules_of_a_new_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/length", new { length = "UntilDate", endsAt = api.Clock.GetUtcNow().AddMinutes(30) });

        await response.AssertProblem(HttpStatusCode.BadRequest, "ends_at_out_of_range");
        AssertLength(await lakeside.Host.HomeAsync(lakeside.Id), "TheWeekend", lakeside.EndsAt);
    }

    // Given a member who is not the Host, when they try to change the length, then 403 host_only.
    [Fact]
    public async Task A_member_who_is_not_the_Host_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");

        var response = await joel.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/length", new { length = "KeepItGoing", endsAt = (DateTimeOffset?)null });

        await response.AssertProblem(HttpStatusCode.Forbidden, "host_only");
    }

    private static void AssertLength(JsonElement popkin, string length, DateTimeOffset? endsAt)
    {
        Assert.Equal(length, popkin.GetProperty("length").GetString());
        var end = popkin.GetProperty("endsAt");
        Assert.Equal(endsAt, end.ValueKind == JsonValueKind.Null ? null : end.GetDateTimeOffset());
    }
}
