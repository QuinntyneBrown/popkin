using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Api.Tests.Support;

/// <summary>Keeps every crew invite the API sends, so a test can read it; it never reaches a provider.</summary>
public sealed class CapturingCrewInviteSender
{
    private readonly List<(ContactChannel Channel, string Destination, CrewInviteMessage Invite)> _sent = [];

    public bool Fail { get; set; }

    public IReadOnlyList<(ContactChannel Channel, string Destination, CrewInviteMessage Invite)> Sent => _sent;

    public ICrewInviteSender For(ContactChannel channel) => new Sender(this, channel);

    private sealed class Sender(CapturingCrewInviteSender owner, ContactChannel channel) : ICrewInviteSender
    {
        public ContactChannel Channel => channel;

        public Task SendAsync(string destination, CrewInviteMessage invite, CancellationToken cancellationToken)
        {
            if (owner.Fail)
            {
                throw new CrewInviteNotSentException();
            }

            owner._sent.Add((channel, destination, invite));
            return Task.CompletedTask;
        }
    }
}
