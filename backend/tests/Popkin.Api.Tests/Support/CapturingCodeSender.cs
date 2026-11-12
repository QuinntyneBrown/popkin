using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Api.Tests.Support;

/// <summary>Keeps every code the API sends, so a test can type it; it never reaches a provider.</summary>
public sealed class CapturingCodeSender
{
    private readonly List<(string Destination, string Code)> _sent = [];

    public bool Fail { get; set; }

    public IReadOnlyList<(string Destination, string Code)> Sent => _sent;

    public string LastCodeFor(string destination) => _sent.Last(s => s.Destination == destination).Code;

    public ICodeSender For(ContactChannel channel) => new Sender(this, channel);

    private sealed class Sender(CapturingCodeSender owner, ContactChannel channel) : ICodeSender
    {
        public ContactChannel Channel => channel;

        public Task SendAsync(string destination, string code, CancellationToken cancellationToken)
        {
            if (owner.Fail)
            {
                throw new CodeNotSentException();
            }

            owner._sent.Add((destination, code));
            return Task.CompletedTask;
        }
    }
}
