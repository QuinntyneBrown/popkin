using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// A photo of a direct message is the two members' own (L2-023 AC2, AC3, L2-051 AC1, AC2): only
/// they hear of it and open it; an uploaded photo that was never sent opens for no one.
/// </summary>
public sealed class DirectMessagePhotoPrivacyTests
{
    // Given a photo Mara sent Walt in their direct message,
    // when each of them opens it in the photo view, then 200: its display image, Mara as its
    // sharer, no neighbours since it is in no album, and only Mara may delete it;
    // when Ruth, a third member, opens it, then 404 photo_not_found, as for no photo.
    [Fact]
    public async Task Only_the_two_members_open_a_direct_message_photo()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone());
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var photoId = (await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, directId, "Just us")).GetProperty("photo").GetProperty("id").GetGuid();

        var marasView = await lakeside.Host.PhotoAsync(lakeside.Id, photoId);
        var waltsView = await walt.PhotoAsync(lakeside.Id, photoId);
        var ruths = await ruth.GetAsync($"/api/popkins/{lakeside.Id}/photos/{photoId}");

        foreach (var view in new[] { marasView, waltsView })
        {
            Assert.Equal(photoId, view.GetProperty("id").GetGuid());
            Assert.Equal("Mara", view.GetProperty("uploader").GetProperty("firstName").GetString());
            Assert.Equal(HttpStatusCode.OK, (await walt.GetAsync(view.GetProperty("imageUrl").GetString())).StatusCode);
            Assert.Equal(JsonValueKind.Null, view.GetProperty("previousPhotoId").ValueKind);
            Assert.Equal(JsonValueKind.Null, view.GetProperty("nextPhotoId").ValueKind);
        }

        Assert.True(marasView.GetProperty("isMine").GetBoolean());
        Assert.True(marasView.GetProperty("canDelete").GetBoolean());
        Assert.False(waltsView.GetProperty("isMine").GetBoolean());
        Assert.False(waltsView.GetProperty("canDelete").GetBoolean());
        await ruths.AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
    }

    // Given a photo Walt uploaded for Everyone and one for his direct message with Mara, neither sent,
    // when anyone opens either in the photo view, Walt included, then 404 photo_not_found.
    [Fact]
    public async Task A_photo_that_was_never_sent_opens_for_no_one()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var everyoneId = await walt.EveryoneThreadIdAsync(lakeside.Id);
        var directId = await walt.DirectThreadIdAsync(lakeside.Id, await lakeside.Host.MembershipIdAsync(lakeside.Id));
        var unsent = new[]
        {
            await walt.UploadedThreadPhotoIdAsync(lakeside.Id, everyoneId),
            await walt.UploadedThreadPhotoIdAsync(lakeside.Id, directId),
        };

        foreach (var photoId in unsent)
        {
            foreach (var member in new[] { walt, lakeside.Host })
            {
                var response = await member.GetAsync($"/api/popkins/{lakeside.Id}/photos/{photoId}");
                await response.AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
            }
        }
    }

    // Given Mara, Walt and Ruth with Popkin open,
    // when Mara sends Walt a photo in their direct message and then one in Everyone,
    // then Ruth hears only the Everyone message, and Walt hears both, the first with its photo.
    [Fact]
    public async Task A_direct_message_photo_reaches_only_the_two()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        await using var waltHub = await api.CreateHubConnectionAsync(walt);
        await using var ruthHub = await api.CreateHubConnectionAsync(ruth);

        var direct = await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, directId);
        var everyone = await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, everyoneId);

        var waltsDirect = await waltHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == direct.GetProperty("id").GetGuid());
        Assert.Equal(direct.GetProperty("photo").GetProperty("id").GetGuid(), waltsDirect.Arguments[0].GetProperty("photo").GetProperty("id").GetGuid());
        await waltHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == everyone.GetProperty("id").GetGuid());
        await ruthHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == everyone.GetProperty("id").GetGuid());
        await ruthHub.WaitForAsync("PhotosAdded", e => e.Arguments[1][0].GetGuid() == everyone.GetProperty("photo").GetProperty("id").GetGuid());
        Assert.DoesNotContain(ruthHub.ReceivedNamed("MessageAdded"), e => e.Arguments[0].GetProperty("id").GetGuid() == direct.GetProperty("id").GetGuid());
        Assert.Equal(
            [everyone.GetProperty("photo").GetProperty("id").GetGuid()],
            ruthHub.ReceivedNamed("PhotosAdded").Select(e => e.Arguments[1][0].GetGuid()));
    }
}
