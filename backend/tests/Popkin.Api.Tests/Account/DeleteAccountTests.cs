using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Account;

/// <summary>
/// DELETE /api/account: the session ends, the active Popkins the person hosts wrap up, and what
/// they shared stays without their name (L2-049 AC1, AC3, AC4).
/// </summary>
public sealed class DeleteAccountTests
{
    // Given Mara, who hosts Lakeside Weekend, where Joel has it open on the hub, and who joined
    // Walt's Popkin with a photo and wrote in it, signed in on two devices,
    // when she deletes her account,
    // then it answers 204 and deletes the cookie; neither device is signed in any more;
    // Lakeside has wrapped up keeping its album, and Joel heard it; Walt's Popkin is still
    // active, and there her message stays, written by "Former member" with no photo, and the
    // photo she joined with is gone from the store.
    [Fact]
    public async Task Deleting_the_account_ends_the_sessions_wraps_up_and_leaves_no_name()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0177");
        var walts = await walt.StartedAsync("Walt’s Popkin", "⚽");
        (await lakeside.Host.JoinAsync(walts.Code, "Mara", TestPhotos.WithLocation(MagickFormat.Jpeg))).EnsureSuccessStatusCode();
        var thread = await lakeside.Host.EveryoneThreadIdAsync(walts.Id);
        await lakeside.Host.SentMessageAsync(walts.Id, thread, "See you Thursday");
        var laptop = api.CreateBrowserClient();
        await laptop.SignInAgainAsync(api, "(415) 555-0148");
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        var files = api.Photos.Files.Count;

        var response = await lakeside.Host.DeleteAsync("/api/account");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("__Host-popkin=;", StringComparison.Ordinal));
        Assert.Equal(HttpStatusCode.Unauthorized, (await lakeside.Host.GetAsync("/api/auth/session")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await laptop.GetAsync("/api/auth/session")).StatusCode);

        var wrapped = api.StoredPopkin(lakeside.Id);
        Assert.Equal(PopkinStatus.WrappedUp, wrapped.Status);
        Assert.True(wrapped.KeepPhotos);
        Assert.Equal(lakeside.Id, (await joelHub.WaitForAsync("PopkinWrappedUp")).Arguments[0].GetGuid());
        Assert.Equal(PopkinStatus.Active, api.StoredPopkin(walts.Id).Status);

        var messages = await walt.MessagesAsync(walts.Id, thread);
        var said = messages.GetProperty("items").EnumerateArray().Single(m => m.GetProperty("text").GetString() == "See you Thursday");
        Assert.Equal("Former member", said.GetProperty("author").GetProperty("firstName").GetString());
        Assert.Equal(JsonValueKind.Null, said.GetProperty("author").GetProperty("avatar").GetProperty("photoUrl").ValueKind);
        Assert.Equal(files - 1, api.Photos.Files.Count);
    }

    // Given Mara, a member of Walt's Popkin, which Walt has open on the hub,
    // when she deletes her account,
    // then Walt hears that her membership left, as when a member leaves (L2-047), and the
    // Popkin counts one member fewer.
    [Fact]
    public async Task The_others_hear_that_the_member_left()
    {
        using var api = new ApiFactory();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0177");
        var walts = await walt.StartedAsync("Walt’s Popkin", "⚽");
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var joined = await (await mara.JoinAsync(walts.Code, "Mara")).Content.ReadFromJsonAsync<JsonElement>();
        await using var waltHub = await api.CreateHubConnectionAsync(walt);

        (await mara.DeleteAsync("/api/account")).EnsureSuccessStatusCode();

        var left = await waltHub.WaitForAsync("MemberLeft");
        Assert.Equal(walts.Id, left.Arguments[0].GetGuid());
        Assert.Equal(joined.GetProperty("membershipId").GetGuid(), left.Arguments[1].GetGuid());
        Assert.Equal(1, (await walt.HomeAsync(walts.Id)).GetProperty("memberCount").GetInt32());
    }

    // Given Mara, who deleted her account, when someone signs up with her phone number,
    // then they are a new person with a new name.
    [Fact]
    public async Task The_same_number_can_sign_up_again_at_once()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        (await mara.DeleteAsync("/api/account")).EnsureSuccessStatusCode();

        var again = await api.SignedUpAsync("Mara O.", "(415) 555-0148");

        Assert.Equal("Mara O.", (await again.GetFromJsonAsync<JsonElement>("/api/account")).GetProperty("name").GetString());
    }

    // Given Mara, who hosts Lakeside, when deleting her account cannot be saved,
    // then it answers 500 and nothing changes: she is still signed in, with her name, and
    // Lakeside is still active.
    [Fact]
    public async Task A_deletion_that_cannot_be_saved_changes_nothing()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        api.Faults.FailSaves = true;

        var response = await lakeside.Host.DeleteAsync("/api/account");
        api.Faults.FailSaves = false;

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("Mara Okafor", (await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/account")).GetProperty("name").GetString());
        Assert.Equal(PopkinStatus.Active, api.StoredPopkin(lakeside.Id).Status);
    }

    // Given no session, when deleting the account is asked for, then it is refused with 401.
    [Fact]
    public async Task Without_a_session_nothing_is_deleted()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().DeleteAsync("/api/account");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
