namespace Popkin.Domain;

/// <summary>
/// The record that a new Popkin's invite was sent to one person of an old Popkin's crew, so it
/// is sent to them once however often the Host asks (L2-046 AC5).
/// </summary>
public sealed class CrewInvite
{
    private CrewInvite()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The new Popkin the invite is to.</summary>
    public Guid PopkinId { get; private set; }

    public Guid PersonId { get; private set; }

    public DateTimeOffset SentAt { get; private set; }

    public static CrewInvite Sent(Guid popkinId, Guid personId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        PersonId = personId,
        SentAt = now,
    };
}
