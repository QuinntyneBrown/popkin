using System.Text.Json;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Notifications;

/// <summary>
/// Adds a change's NotificationEvent to the handler's unit of work, so the change and its event
/// are saved together or not at all (deliver-notifications). Ids, dates and enum values only.
/// </summary>
public static class NotificationOutbox
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>A change for the active members of the Popkin but the actor.</summary>
    public static void ForMembers(
        this IAppDbContext db,
        NotificationKind kind,
        Guid popkinId,
        Guid actorPersonId,
        Guid subjectId,
        DateTimeOffset now,
        Guid? namedPersonId = null,
        object? facts = null) =>
        db.NotificationEvents.Add(NotificationEvent.Record(
            kind, NotificationAudience.Members, popkinId, actorPersonId, subjectId, namedPersonId, now,
            facts: facts is null ? null : JsonSerializer.Serialize(facts, Json)));

    /// <summary>A change for one person only (a reply's author, the other member of a direct message).</summary>
    public static void ForOne(
        this IAppDbContext db, NotificationKind kind, Guid popkinId, Guid actorPersonId, Guid subjectId, Guid recipientPersonId, DateTimeOffset now) =>
        db.NotificationEvents.Add(NotificationEvent.Record(
            kind, NotificationAudience.Recipient, popkinId, actorPersonId, subjectId, recipientPersonId, now));
}
