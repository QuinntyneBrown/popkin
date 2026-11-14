using MediatR;
using Popkin.Domain;

namespace Popkin.Application.Auth;

/// <summary>
/// The ways sign-up and sign-in reach a person (L2-084): email always, a phone only once
/// `Features:PhoneSignIn` is <c>true</c> (ADR 0023).
/// </summary>
public sealed record SignInChannels(bool PhoneSignIn)
{
    public IReadOnlyList<ContactChannel> Offered { get; } =
        PhoneSignIn ? [ContactChannel.Phone, ContactChannel.Email] : [ContactChannel.Email];

    public bool Offers(ContactChannel channel) => Offered.Contains(channel);
}

public sealed record SignInChannelsDto(IReadOnlyList<ContactChannel> Channels);

/// <summary>Which ways to reach a person sign-up and sign-in offer (L2-084 AC1).</summary>
public sealed record GetSignInChannelsQuery : IRequest<SignInChannelsDto>;

public sealed class GetSignInChannelsQueryHandler(SignInChannels channels) : IRequestHandler<GetSignInChannelsQuery, SignInChannelsDto>
{
    public Task<SignInChannelsDto> Handle(GetSignInChannelsQuery request, CancellationToken cancellationToken) =>
        Task.FromResult(new SignInChannelsDto(channels.Offered));
}
