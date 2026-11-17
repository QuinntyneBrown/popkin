using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// Each change that notifies adds one NotificationEvent in its own save, with its audience and
/// ids only (deliver-notifications, "What records an event"; L2-174 AC3).
/// </summary>
public sealed class RecordedEventTests
{
    private static readonly DateTimeOffset Wednesday = new(2027, 2, 17, 12, 0, 0, TimeSpan.Zero);

    /// <summary>The events recorded, oldest first; Ruth's joining is left out unless asked for.</summary>
    private static List<NotificationEvent> Events(ApiFactory api, bool joins = false)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().NotificationEvents.AsNoTracking()
            .Where(e => joins || e.Kind != NotificationKind.PeopleJoining)
            .OrderBy(e => e.OccurredAt)
            .ToList();
    }

    private static async Task<(ApiFactory Api, StartedPopkin Lakeside, HttpClient Ruth, Guid RuthId, Guid MaraId)> LakesideWithRuthAsync()
    {
        var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        return (api, lakeside, ruth, await ruth.PersonIdAsync(), await lakeside.Host.PersonIdAsync());
    }

    private static void AssertMembersEvent(NotificationEvent e, NotificationKind kind, Guid popkinId, Guid actor)
    {
        Assert.Equal(kind, e.Kind);
        Assert.Equal(NotificationAudience.Members, e.Audience);
        Assert.Equal(popkinId, e.PopkinId);
        Assert.Equal(actor, e.ActorPersonId);
        Assert.Null(e.DispatchedAt);
    }

    // Given Ruth in Lakeside, when she writes in Everyone, then one GroupChat event for its
    // members; when Mara replies to her, a GroupChat event and a MentionsAndReplies event for Ruth.
    [Fact]
    public async Task A_message_in_Everyone_and_a_reply_record_their_events()
    {
        var (api, lakeside, ruth, ruthId, maraId) = await LakesideWithRuthAsync();
        using var _ = api;
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);

        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Paddles?")).Id();
        await lakeside.Host.RepliedAsync(lakeside.Id, everyone, asked, "Mine");

        var events = Events(api);
        Assert.Equal(3, events.Count);
        AssertMembersEvent(events[0], NotificationKind.GroupChat, lakeside.Id, ruthId);
        Assert.Equal(asked, events[0].SubjectId);
        var reply = Assert.Single(events, e => e.Kind == NotificationKind.MentionsAndReplies);
        Assert.Equal(NotificationAudience.Recipient, reply.Audience);
        Assert.Equal(ruthId, reply.RecipientPersonId);
        Assert.Equal(maraId, reply.ActorPersonId);
        Assert.Contains(events, e => e.Kind == NotificationKind.GroupChat && e.SubjectId == reply.SubjectId);
        Assert.All(events, e => Assert.Null(e.Facts));
    }

    // Given a direct message between Mara and Ruth, when Mara writes in it, then one
    // DirectMessages event for Ruth only (L2-174 AC2).
    [Fact]
    public async Task A_direct_message_records_an_event_for_the_other_member_only()
    {
        var (api, lakeside, ruth, ruthId, maraId) = await LakesideWithRuthAsync();
        using var _ = api;
        var thread = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await ruth.MembershipIdAsync(lakeside.Id));

        await lakeside.Host.SentMessageAsync(lakeside.Id, thread, "Lunch?");

        var e = Assert.Single(Events(api));
        Assert.Equal(NotificationKind.DirectMessages, e.Kind);
        Assert.Equal(NotificationAudience.Recipient, e.Audience);
        Assert.Equal(ruthId, e.RecipientPersonId);
        Assert.Equal(maraId, e.ActorPersonId);
    }

    // A refused message records nothing.
    [Fact]
    public async Task A_refused_change_records_nothing()
    {
        var (api, lakeside, _, _, _) = await LakesideWithRuthAsync();
        using var __ = api;
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);

        var response = await lakeside.Host.SendMessageAsync(lakeside.Id, everyone, "   ");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(Events(api));
    }

    // When Ruth adds a photo, then one NewPhotos event for the members.
    [Fact]
    public async Task A_photo_records_new_photos()
    {
        var (api, lakeside, ruth, ruthId, _) = await LakesideWithRuthAsync();
        using var _ = api;

        var photo = await ruth.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg), "Dock");

        var e = Assert.Single(Events(api));
        AssertMembersEvent(e, NotificationKind.NewPhotos, lakeside.Id, ruthId);
        Assert.Equal(photo.Id(), e.SubjectId);
    }

    // When Mara adds a story, gives it to Ruth, moves it and deletes it, then each records a
    // PlanChanges event; giving it names Ruth, and the facts hold the before and after with no
    // title (popkin-update-email, "Plan facts").
    [Fact]
    public async Task Each_plan_change_records_plan_changes()
    {
        var (api, lakeside, ruth, ruthId, maraId) = await LakesideWithRuthAsync();
        using var _ = api;
        var ruthMember = await ruth.MembershipIdAsync(lakeside.Id);

        var story = (await (await lakeside.Host.AddStoryAsync(lakeside.Id, "Book the cabin")).Content.ReadFromJsonAsync<JsonElement>()).Id();
        (await lakeside.Host.SaveStoryAsync(lakeside.Id, story, "Book the cabin", ownerMembershipId: ruthMember, dueDate: "2027-02-20")).EnsureSuccessStatusCode();
        (await lakeside.Host.MoveStoryAsync(lakeside.Id, story, "Doing")).EnsureSuccessStatusCode();
        (await lakeside.Host.DeleteStoryAsync(lakeside.Id, story)).EnsureSuccessStatusCode();

        var events = Events(api);
        Assert.Equal(4, events.Count);
        Assert.All(events, e => AssertMembersEvent(e, NotificationKind.PlanChanges, lakeside.Id, maraId));
        Assert.All(events, e => Assert.Equal(story, e.SubjectId));
        Assert.Equal(ruthId, events[1].RecipientPersonId);
        var given = JsonDocument.Parse(events[1].Facts!).RootElement;
        Assert.Equal(ruthMember, given.GetProperty("ownerTo").GetGuid());
        Assert.Equal("2027-02-20", given.GetProperty("dueTo").GetString());
        Assert.DoesNotContain("cabin", events[1].Facts!, StringComparison.OrdinalIgnoreCase);
        var moved = JsonDocument.Parse(events[2].Facts!).RootElement;
        Assert.Equal("ToDo", moved.GetProperty("columnFrom").GetString());
        Assert.Equal("Doing", moved.GetProperty("columnTo").GetString());
        Assert.Null(events[2].RecipientPersonId);
    }

    // When Mara books time off, saves her hours, sets the event and removes it, then each records
    // a ScheduleChanges event.
    [Fact]
    public async Task Each_schedule_change_records_schedule_changes()
    {
        var (api, lakeside, _, _, maraId) = await LakesideWithRuthAsync();
        using var _ = api;
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);

        (await lakeside.Host.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/schedule/time-off/{mara}",
            new { week = "2027-02-15", days = new[] { "Off", "Working", "Working", "Working", "Working" } })).EnsureSuccessStatusCode();
        (await lakeside.Host.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/schedule/hours/{mara}",
            new { from = "2027-02-20", days = Enumerable.Range(0, 7).Select(_ => Array.Empty<object>()).ToArray() })).EnsureSuccessStatusCode();
        (await lakeside.Host.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/event",
            new { label = "Cabin week", firstDay = "2027-02-15", lastDay = "2027-02-19" })).EnsureSuccessStatusCode();
        (await lakeside.Host.DeleteAsync($"/api/popkins/{lakeside.Id}/event")).EnsureSuccessStatusCode();

        var events = Events(api);
        Assert.Equal(4, events.Count);
        Assert.All(events, e => AssertMembersEvent(e, NotificationKind.ScheduleChanges, lakeside.Id, maraId));
    }

    // When Ruth joins, then one PeopleJoining event about her membership, with her as the actor.
    [Fact]
    public async Task Joining_records_people_joining()
    {
        var (api, lakeside, ruth, ruthId, _) = await LakesideWithRuthAsync();
        using var _ = api;

        var e = Assert.Single(Events(api, joins: true));

        AssertMembersEvent(e, NotificationKind.PeopleJoining, lakeside.Id, ruthId);
        Assert.Equal(await ruth.MembershipIdAsync(lakeside.Id), e.SubjectId);
    }

    // When Ruth shares an experience, rates it and comments on it, then each records an
    // Experiences event about it.
    [Fact]
    public async Task Sharing_rating_and_commenting_record_experiences()
    {
        var (api, lakeside, ruth, ruthId, _) = await LakesideWithRuthAsync();
        using var _ = api;

        var experience = (await ruth.SharedExperienceAsync(lakeside.Id, "Sunset paddle")).Id();
        await ruth.RatedAsync(lakeside.Id, experience, 5);
        await ruth.CommentedAsync(lakeside.Id, experience, "Calm water");

        var events = Events(api);
        Assert.Equal(3, events.Count);
        Assert.All(events, e => AssertMembersEvent(e, NotificationKind.Experiences, lakeside.Id, ruthId));
        Assert.All(events, e => Assert.Equal(experience, e.SubjectId));
    }
}
