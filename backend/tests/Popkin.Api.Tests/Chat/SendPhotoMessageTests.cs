using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;
using Popkin.Domain;

namespace Popkin.Api.Tests.Chat;

/// <summary>A message that carries a photo, with or without text (L2-026 AC1, AC2, L2-028).</summary>
public sealed class SendPhotoMessageTests
{
    // Given a photo a member uploaded for Everyone,
    // when they send a message with it and no text,
    // then 201 answers the message with empty text and the photo, the thread reads it the same,
    // and a message without a photo has `photo` null.
    [Fact]
    public async Task A_member_sends_a_photo_without_text()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var upload = await lakeside.Host.UploadThreadPhotoAsync(lakeside.Id, threadId, TestPhotos.FromAPhone(width: 800, height: 600));
        var uploaded = await upload.Content.ReadFromJsonAsync<JsonElement>();
        var plain = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning!");

        var response = await lakeside.Host.SendPhotoMessageAsync(lakeside.Id, threadId, uploaded.GetProperty("id").GetGuid());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var sent = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("", sent.GetProperty("text").GetString());
        var photo = sent.GetProperty("photo");
        Assert.Equal(uploaded.GetProperty("id").GetGuid(), photo.GetProperty("id").GetGuid());
        Assert.Equal((800, 600), (photo.GetProperty("width").GetInt32(), photo.GetProperty("height").GetInt32()));
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync(photo.GetProperty("url").GetString())).StatusCode);
        Assert.Equal(JsonValueKind.Null, plain.GetProperty("photo").ValueKind);
        var page = await lakeside.Host.MessagesAsync(lakeside.Id, threadId);
        var read = page.GetProperty("items").EnumerateArray().Single(m => m.GetProperty("id").GetGuid() == sent.GetProperty("id").GetGuid());
        Assert.Equal(photo.GetProperty("id").GetGuid(), read.GetProperty("photo").GetProperty("id").GetGuid());
    }

    // Given a photo and a caption-like text, when a member sends both, then the message keeps
    // its text, trimmed, with the photo.
    [Fact]
    public async Task A_member_sends_a_photo_with_text()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);

        var sent = await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, threadId, "  Dock was glass this morning ");

        Assert.Equal("Dock was glass this morning", sent.GetProperty("text").GetString());
        Assert.NotEqual(JsonValueKind.Null, sent.GetProperty("photo").ValueKind);
    }

    // Given a member, when they post neither text nor a photo, then 400 message_empty names `text`.
    [Fact]
    public async Task A_message_needs_text_or_a_photo()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);

        var response = await lakeside.Host.SendPhotoMessageAsync(lakeside.Id, threadId, photoId: null, text: "  ");

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "message_empty");
        Assert.Equal("text", body.GetProperty("field").GetString());
        Assert.Equal("Write a message or choose a photo.", body.GetProperty("title").GetString());
    }

    // Given photos that are not the member's own upload for this thread, or are on a message
    // already, when the member sends a message with one, then 400 photo_not_found names `photoId`.
    [Fact]
    public async Task A_message_carries_only_the_senders_unsent_upload_for_its_thread()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt Brennan");
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var walts = await walt.UploadedThreadPhotoIdAsync(lakeside.Id, everyoneId);
        var forTheDirectMessage = await lakeside.Host.UploadedThreadPhotoIdAsync(lakeside.Id, directId);
        var album = (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();
        var sentAlready = (await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, everyoneId)).GetProperty("photo").GetProperty("id").GetGuid();

        foreach (var (what, photoId) in new[]
        {
            ("no photo", Guid.NewGuid()),
            ("another member's upload", walts),
            ("an upload for another thread", forTheDirectMessage),
            ("a photo of the album", album),
            ("a photo on a message already", sentAlready),
        })
        {
            var response = await lakeside.Host.SendPhotoMessageAsync(lakeside.Id, everyoneId, photoId, "Look");

            Assert.True(response.StatusCode == HttpStatusCode.BadRequest, what);
            var body = await response.AssertProblem(HttpStatusCode.BadRequest, "photo_not_found");
            Assert.Equal("photoId", body.GetProperty("field").GetString());
        }

        Assert.Single((await lakeside.Host.MessagesAsync(lakeside.Id, everyoneId)).GetProperty("items").EnumerateArray(),
            m => m.GetProperty("photo").ValueKind != JsonValueKind.Null);
    }

    // Given a photo message whose answer was lost, when its author sends it again under the
    // same client message id, then 200 answers the stored message with its photo (L2-028 AC1).
    [Fact]
    public async Task A_repeated_photo_message_answers_the_stored_one()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var photoId = await lakeside.Host.UploadedThreadPhotoIdAsync(lakeside.Id, threadId);
        var clientMessageId = Guid.NewGuid();
        var first = await lakeside.Host.SendPhotoMessageAsync(lakeside.Id, threadId, photoId, clientMessageId: clientMessageId);

        var again = await lakeside.Host.SendPhotoMessageAsync(lakeside.Id, threadId, photoId, clientMessageId: clientMessageId);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var stored = await again.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(photoId, stored.GetProperty("photo").GetProperty("id").GetGuid());
        Assert.Single((await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).GetProperty("items").EnumerateArray(),
            m => m.GetProperty("photo").ValueKind != JsonValueKind.Null);
    }

    // Given two sends of one photo under different client message ids that race,
    // when the second loses to the first as it saves,
    // then it answers 400 photo_not_found, not a server error, and the photo is on one message.
    [Fact]
    public async Task A_photo_send_that_loses_the_race_for_its_photo_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var photoId = await lakeside.Host.UploadedThreadPhotoIdAsync(lakeside.Id, threadId);
        api.Faults.LoseNextSaveTo = async () =>
        {
            using var scope = api.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var host = db.Memberships.Single(m => m.PopkinId == lakeside.Id && m.Role == MembershipRole.Host);
            var photo = db.Photos.Single(p => p.Id == photoId);
            db.Messages.Add(Message.Send(threadId, host.Id, "", Guid.NewGuid(), api.Clock.GetUtcNow(), photo: photo));
            await db.SaveChangesAsync();
        };

        var response = await lakeside.Host.SendPhotoMessageAsync(lakeside.Id, threadId, photoId);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "photo_not_found");
        Assert.Equal("photoId", body.GetProperty("field").GetString());
        Assert.Equal(1, api.MessageCount());
    }

    // Given two members with Popkin open, when one sends a photo message in Everyone,
    // then the other's MessageAdded carries the message with its photo, as the sender was answered (L2-027 AC1).
    [Fact]
    public async Task A_photo_message_reaches_the_others_with_its_photo()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        var sent = await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, threadId, "Dock");

        var received = await joelHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == sent.GetProperty("id").GetGuid());
        Assert.Equal(sent.GetRawText(), received.Arguments[0].GetRawText());
        Assert.Equal(sent.GetProperty("photo").GetProperty("id").GetGuid(), received.Arguments[0].GetProperty("photo").GetProperty("id").GetGuid());
    }
}
