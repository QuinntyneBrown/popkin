using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Chat;

/// <summary>A repeated send stores nothing twice (L2-028 AC1: "Try again" after a lost answer).</summary>
public sealed class RepeatedSendTests
{
    // Given a member whose message was stored but whose answer was lost,
    // when they send it again under the same client message id, even with other text,
    // then 200 answers the stored message and the thread holds it once.
    [Fact]
    public async Task Sending_the_same_client_message_id_again_returns_the_stored_message()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var clientMessageId = Guid.NewGuid();
        var first = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "On my way", clientMessageId);
        api.Clock.Advance(TimeSpan.FromSeconds(30));

        var again = await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, "On my way!!", clientMessageId);

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var body = await again.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(first.GetProperty("id").GetGuid(), body.GetProperty("id").GetGuid());
        Assert.Equal("On my way", body.GetProperty("text").GetString());
        Assert.Equal(first.GetProperty("sentAt").GetDateTimeOffset(), body.GetProperty("sentAt").GetDateTimeOffset());
        Assert.Equal(["On my way"], (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given two members whose devices chose the same client message id,
    // when each sends, then each message is stored: the id is the author's own.
    [Fact]
    public async Task A_client_message_id_is_stored_once_per_author()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        var clientMessageId = Guid.NewGuid();
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "From Mara", clientMessageId);

        var response = await joel.SendMessageAsync(lakeside.Id, threadId, "From Joel", clientMessageId);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Contains("From Joel", (await joel.MessagesAsync(lakeside.Id, threadId)).Texts());
        Assert.Contains("From Mara", (await joel.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given two sends of one client message id that race,
    // when the second loses to the first as it saves,
    // then it answers 200 with the winner and the thread holds one message.
    [Fact]
    public async Task A_send_that_loses_the_race_to_its_twin_returns_the_winner()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var clientMessageId = Guid.NewGuid();
        var winnerId = Guid.Empty;
        api.Faults.LoseNextSaveTo = async () =>
        {
            using var scope = api.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var host = db.Memberships.Single(m => m.PopkinId == lakeside.Id && m.Role == MembershipRole.Host);
            var winner = Message.Send(threadId, host.Id, "On my way", clientMessageId, api.Clock.GetUtcNow());
            winnerId = winner.Id;
            db.Messages.Add(winner);
            await db.SaveChangesAsync();
        };

        var response = await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, "On my way", clientMessageId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(winnerId, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid());
        Assert.Equal(["On my way"], (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
        Assert.Equal(1, api.MessageCount());
    }
}
