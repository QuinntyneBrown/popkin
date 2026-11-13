using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.WrapUp;

/// <summary>POST /api/popkins/{popkinId}/wrap-up: the Host wraps up a Popkin (L2-043, L2-051 AC1, AC4).</summary>
public sealed class HostWrapsUpTests
{
    // Given an active Popkin, when its Host wraps it up keeping the album,
    // then 200 with the Popkin and when it wrapped up, and the Popkin is wrapped up with its album kept.
    [Fact]
    public async Task The_Host_wraps_the_Popkin_up_and_keeps_the_album()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.WrapUpAsync(lakeside.Id, new { keepPhotos = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(lakeside.Id, body.GetProperty("popkinId").GetGuid());
        Assert.Equal(api.Clock.GetUtcNow(), body.GetProperty("wrappedUpAt").GetDateTimeOffset());
        var stored = api.StoredPopkin(lakeside.Id);
        Assert.Equal(PopkinStatus.WrappedUp, stored.Status);
        Assert.Equal(api.Clock.GetUtcNow(), stored.WrappedUpAt);
        Assert.True(stored.KeepPhotos);
        Assert.Null(stored.PhotosRemoveAt);
    }

    // Given an active Popkin, when its Host wraps it up without keeping the album,
    // then its photos are to be removed 30 days after the wrap-up (L2-043 AC2, L2-045 AC4).
    [Fact]
    public async Task Without_the_album_kept_the_photos_go_after_30_days()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        await lakeside.Host.WrappedUpAsync(lakeside.Id, keepPhotos: false);

        var stored = api.StoredPopkin(lakeside.Id);
        Assert.False(stored.KeepPhotos);
        Assert.Equal(api.Clock.GetUtcNow().AddDays(30), stored.PhotosRemoveAt);
    }

    public static TheoryData<string> BodiesWithoutAChoice => new() { "{}", "{\"keepPhotos\":null}", "{\"keepPhotos\":\"yes\"}", "{\"keepPhotos\":1}" };

    // Given a body whose keepPhotos is missing or is not a boolean,
    // when the Host sends it, then 400 validation_failed names the field and the Popkin stays active (L2-052 AC1).
    [Theory]
    [MemberData(nameof(BodiesWithoutAChoice))]
    public async Task The_choice_about_the_album_must_be_given(string json)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.PostAsync(
            $"/api/popkins/{lakeside.Id}/wrap-up", new StringContent(json, Encoding.UTF8, "application/json"));

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "validation_failed");
        Assert.Equal("keepPhotos", body.GetProperty("field").GetString());
        Assert.Equal(PopkinStatus.Active, api.StoredPopkin(lakeside.Id).Status);
    }

    // Given a member who is not the Host, when they ask to wrap up, then 403 host_only (L2-043 AC6);
    // given someone who is not a member, then 404 popkin_not_found (L2-051 AC1); the Popkin stays active.
    [Fact]
    public async Task Only_the_Host_wraps_up()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await joel.WrapUpAsync(lakeside.Id)).AssertProblem(HttpStatusCode.Forbidden, "host_only");
        await (await sam.WrapUpAsync(lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await sam.WrapUpAsync(Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");

        Assert.Equal(PopkinStatus.Active, api.StoredPopkin(lakeside.Id).Status);
    }

    // Given a Popkin that has wrapped up, when its Host wraps it up again,
    // then 409 popkin_wrapped_up, and when it wrapped up and the choice about the album stay (L2-045 AC2).
    [Fact]
    public async Task A_Popkin_wraps_up_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var first = await lakeside.Host.WrappedUpAsync(lakeside.Id, keepPhotos: true);
        api.Clock.Advance(TimeSpan.FromMinutes(5));

        await (await lakeside.Host.WrapUpAsync(lakeside.Id, new { keepPhotos = false })).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");

        var stored = api.StoredPopkin(lakeside.Id);
        Assert.Equal(first.GetProperty("wrappedUpAt").GetDateTimeOffset(), stored.WrappedUpAt);
        Assert.True(stored.KeepPhotos);
    }

    // Given the database fails, when the Host wraps up, then 500 and the Popkin is still active (L2-043 AC5).
    [Fact]
    public async Task A_wrap_up_that_fails_leaves_the_Popkin_active()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        api.Faults.FailSaves = true;

        var response = await lakeside.Host.WrapUpAsync(lakeside.Id);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(PopkinStatus.Active, api.StoredPopkin(lakeside.Id).Status);
    }
}
