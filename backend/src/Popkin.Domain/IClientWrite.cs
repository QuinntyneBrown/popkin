namespace Popkin.Domain;

/// <summary>
/// A row a Contacts write makes, carrying the identifier the web app gave that write: a resend
/// with the same client id answers the row already saved (L2-123 AC4). Its table keeps one row
/// per owner and client id.
/// </summary>
public interface IClientWrite : IOwnedByPerson
{
    Guid ClientId { get; }
}
