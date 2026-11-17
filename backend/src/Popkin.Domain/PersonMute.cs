namespace Popkin.Domain;

/// <summary>
/// One person's stop on email and phone alerts about another person's posts, in any Popkin the two
/// share (L2-160). The muted person is told nothing (AC4).
/// </summary>
public sealed class PersonMute
{
    public Guid Id { get; private set; }

    public Guid PersonId { get; private set; }

    public Guid MutedPersonId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    private PersonMute()
    {
    }

    public static PersonMute Create(Guid personId, Guid mutedPersonId, DateTimeOffset now)
    {
        if (personId == mutedPersonId)
        {
            throw new ArgumentException("A person cannot mute themselves.", nameof(mutedPersonId));
        }

        return new PersonMute { Id = Guid.NewGuid(), PersonId = personId, MutedPersonId = mutedPersonId, CreatedAt = now };
    }
}
