namespace Popkin.Application.Abstractions;

/// <summary>The signed-in caller, read from the session for handlers (never from HttpContext).</summary>
public interface ICurrentPerson
{
    Guid PersonId { get; }

    /// <summary>The caller's id, or null on an endpoint open without a session when there is none.</summary>
    Guid? FindPersonId();

    Guid SessionId { get; }
}
