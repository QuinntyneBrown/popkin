using Popkin.Domain;

namespace Popkin.Application.Abstractions;

/// <summary>What a crew invite says: the new Popkin, who started it and the link that joins it.</summary>
public sealed record CrewInviteMessage(string PopkinName, string HostFirstName, string Link);

/// <summary>
/// Delivers the invite of a new Popkin to a member of an old one, over one channel, to the
/// contact detail they sign in with (L2-046 AC5). Azure Communication Services
/// sends both channels (ADR 0021). Nothing it is given is ever logged (L2-054 AC3).
/// </summary>
public interface ICrewInviteSender
{
    ContactChannel Channel { get; }

    /// <summary>Throws <see cref="CrewInviteNotSentException"/> when the provider cannot deliver it.</summary>
    Task SendAsync(string destination, CrewInviteMessage invite, CancellationToken cancellationToken);
}

public sealed class CrewInviteNotSentException() : Exception("The crew invite could not be sent.");
