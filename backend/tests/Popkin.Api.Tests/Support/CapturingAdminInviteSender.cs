using Popkin.Application.Abstractions;

namespace Popkin.Api.Tests.Support;

/// <summary>Keeps every admin invite the API sends; it never reaches a provider.</summary>
public sealed class CapturingAdminInviteSender : IAdminInviteSender
{
    private readonly List<(string Email, AdminInviteMessage Message)> _sent = [];

    public bool Fail { get; set; }

    public IReadOnlyList<(string Email, AdminInviteMessage Message)> Sent => _sent;

    public Task SendAsync(string email, AdminInviteMessage invite, CancellationToken cancellationToken)
    {
        if (Fail)
        {
            throw new AdminInviteNotSentException();
        }

        _sent.Add((email, invite));
        return Task.CompletedTask;
    }
}
