using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Popkins;

public sealed record PopkinCreatedDto(Guid Id, string Name, string Emoji, PopkinColour Colour, DateTimeOffset? EndsAt, string InviteCode, string InviteUrl);

/// <summary>
/// Starts a Popkin (L2-010). The client resolves `EndsAt`, because only the device knows its
/// midnight and Sunday; the server checks it (L2-009 AC3).
/// </summary>
public sealed record CreatePopkinCommand(string? Name, string? Emoji, string? Colour, string? Length, DateTimeOffset? EndsAt) : IRequest<PopkinCreatedDto>;

public sealed class CreatePopkinCommandHandler(
    IAppDbContext db,
    ICurrentPerson current,
    TimeProvider clock,
    IInviteCodeGenerator codes,
    InviteLinkBuilder links) : IRequestHandler<CreatePopkinCommand, PopkinCreatedDto>
{
    private const int CodeAttempts = 5;

    public async Task<PopkinCreatedDto> Handle(CreatePopkinCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var name = PopkinInput.Name(request.Name);
        var emoji = PopkinInput.Emoji(request.Emoji);
        var colour = PopkinInput.Colour(request.Colour);
        var endsAt = PopkinInput.End(PopkinInput.Length(request.Length), request.EndsAt, now);

        var host = await db.People.SingleAsync(p => p.Id == current.PersonId, cancellationToken);
        for (var attempt = 1; ; attempt++)
        {
            var code = codes.NewCode();
            // A collision draws a new code; the unique index backs this up on a real database.
            if (await db.Popkins.AnyAsync(p => p.InviteCode == code, cancellationToken))
            {
                if (attempt < CodeAttempts)
                {
                    continue;
                }

                throw new InvalidOperationException("No free invite code was found.");
            }

            var (popkin, everyone) = PopkinSpace.Start(host, name, emoji, colour, endsAt, code, now);
            db.Popkins.Add(popkin);
            db.ChatThreads.Add(everyone);
            await db.SaveChangesAsync(cancellationToken);
            return new PopkinCreatedDto(popkin.Id, popkin.Name, popkin.Emoji, popkin.Colour, popkin.EndsAt, popkin.InviteCode, links.Build(popkin.InviteCode));
        }
    }
}
