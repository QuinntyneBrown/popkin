using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// How a photo message reads where only its text is shown: the Chat tab, the Chat card of the
/// Popkin home, My Popkins and the quote of a reply (L2-019 AC3, L2-022, L2-025 AC2, L2-026).
/// </summary>
public sealed class PhotoMessagePreviewTests
{
    // Given Walt's photo without text, latest in Everyone and in his direct message with Mara,
    // when Mara reads the Chat tab, the home's Chat card and My Popkins, then each reads "Photo".
    [Fact]
    public async Task A_photo_without_text_reads_Photo_in_every_preview()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var everyoneId = await walt.EveryoneThreadIdAsync(lakeside.Id);
        var directId = await walt.DirectThreadIdAsync(lakeside.Id, await lakeside.Host.MembershipIdAsync(lakeside.Id));
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await walt.SentPhotoMessageAsync(lakeside.Id, directId);
        await walt.SentPhotoMessageAsync(lakeside.Id, everyoneId);

        var threads = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/threads");
        var card = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/threads/everyone/preview");
        var mine = await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/popkins");

        Assert.Equal("Photo", threads.GetProperty("everyone").GetProperty("latest").GetProperty("text").GetString());
        Assert.Equal("Photo", threads.GetProperty("direct")[0].GetProperty("latest").GetProperty("text").GetString());
        Assert.Equal("Photo", card.GetProperty("messages").EnumerateArray().Last().GetProperty("text").GetString());
        Assert.Equal("Photo", mine.GetProperty("active")[0].GetProperty("latestMessage").GetProperty("text").GetString());
    }

    // Given Walt's photo with text, latest in Everyone,
    // when Mara reads the Chat tab, then it reads the text.
    [Fact]
    public async Task A_photo_with_text_reads_its_text()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var everyoneId = await walt.EveryoneThreadIdAsync(lakeside.Id);
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await walt.SentPhotoMessageAsync(lakeside.Id, everyoneId, "Dock was glass this morning");

        var threads = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/threads");

        Assert.Equal("Dock was glass this morning", threads.GetProperty("everyone").GetProperty("latest").GetProperty("text").GetString());
    }

    // Given a photo message without text and one with text,
    // when Mara replies to each, then the quote of the first reads "Photo" and that of the second its text.
    [Fact]
    public async Task The_quote_of_a_photo_without_text_reads_Photo()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var everyoneId = await walt.EveryoneThreadIdAsync(lakeside.Id);
        var bare = await walt.SentPhotoMessageAsync(lakeside.Id, everyoneId);
        var captioned = await walt.SentPhotoMessageAsync(lakeside.Id, everyoneId, "Dock was glass");

        foreach (var (quoted, snippet) in new[] { (bare, "Photo"), (captioned, "Dock was glass") })
        {
            var response = await lakeside.Host.PostAsJsonAsync(
                $"/api/popkins/{lakeside.Id}/threads/{everyoneId}/messages",
                new { clientMessageId = Guid.NewGuid(), text = "Lovely", replyToMessageId = quoted.GetProperty("id").GetGuid() });
            response.EnsureSuccessStatusCode();
            var reply = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(snippet, reply.GetProperty("quote").GetProperty("snippet").GetString());
            Assert.Equal("Walt", reply.GetProperty("quote").GetProperty("authorFirstName").GetString());
        }
    }
}
