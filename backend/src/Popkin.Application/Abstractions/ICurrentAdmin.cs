namespace Popkin.Application.Abstractions;

/// <summary>The signed-in admin, read from the admin session for handlers (never from HttpContext).</summary>
public interface ICurrentAdmin
{
    Guid AdminId { get; }

    Guid SessionId { get; }
}
