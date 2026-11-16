namespace Popkin.Domain;

/// <summary>
/// A Contacts row kept by one person, its owner (L2-122). The owner is set once, when the row is
/// made, and every read and write of the row starts from it.
/// </summary>
public interface IOwnedByPerson
{
    Guid OwnerId { get; }
}
