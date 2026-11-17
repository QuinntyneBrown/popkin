namespace Popkin.Domain;

/// <summary>
/// One import from the person's Popkins (L2-151): kept so a resend with the same client id answers
/// the first result and imports nobody more.
/// </summary>
public sealed class ImportBatch : IClientWrite
{
    private ImportBatch()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public Guid ClientId { get; private set; }

    /// <summary>How many contacts the import made.</summary>
    public int Imported { get; private set; }

    public DateTimeOffset At { get; private set; }

    public static ImportBatch Record(Guid ownerId, Guid clientId, int imported, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        OwnerId = ownerId,
        ClientId = clientId,
        Imported = imported,
        At = now,
    };
}
