using Popkin.Domain;

namespace Popkin.Application.Abstractions;

/// <summary>What an admin invite says: who added them, their role and where the console is.</summary>
public sealed record AdminInviteMessage(string InvitedByName, AdminRole Role, string ConsoleUrl);

/// <summary>
/// Emails a new admin that they can sign in to the console (L2-119 AC2), through Azure
/// Communication Services (ADR 0021). Nothing it is given is ever logged.
/// </summary>
public interface IAdminInviteSender
{
    /// <summary>Throws <see cref="AdminInviteNotSentException"/> when the provider cannot deliver it.</summary>
    Task SendAsync(string email, AdminInviteMessage invite, CancellationToken cancellationToken);
}

public sealed class AdminInviteNotSentException() : Exception("The admin invite could not be sent.");
