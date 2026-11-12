namespace Popkin.Application.Abstractions;

/// <summary>The signed-in caller, read from the session for handlers (never from HttpContext).</summary>
public interface ICurrentPerson
{
    Guid PersonId { get; }

    Guid SessionId { get; }
}
