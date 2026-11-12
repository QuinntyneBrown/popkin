using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
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
        var name = (request.Name ?? "").Trim();
        if (name.Length == 0)
        {
            throw ProblemException.Invalid("name_required", "Give your Popkin a name.", "name");
        }

        if (name.Length > PopkinRules.MaxNameLength)
        {
            throw ProblemException.Invalid("name_too_long", "A name is at most 40 characters.", "name");
        }

        if (request.Emoji is null || !PopkinRules.Emoji.Contains(request.Emoji))
        {
            throw ProblemException.Invalid("emoji_not_allowed", "Pick one of the twelve emoji.", "emoji");
        }

        if (!Enum.TryParse<PopkinColour>(request.Colour, ignoreCase: false, out var colour) || !Enum.IsDefined(colour) || int.TryParse(request.Colour, out _))
        {
            throw ProblemException.Invalid("colour_not_allowed", "Pick one of the seven colours.", "colour");
        }

        if (!Enum.TryParse<PopkinLength>(request.Length, ignoreCase: false, out var length) || !Enum.IsDefined(length) || int.TryParse(request.Length, out _))
        {
            throw ProblemException.Invalid("length_not_allowed", "Pick how long it lasts.", "length");
        }

        CheckEnd(length, request.EndsAt, now);

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

            var (popkin, everyone) = PopkinSpace.Start(host, name, request.Emoji, colour, request.EndsAt, code, now);
            db.Popkins.Add(popkin);
            db.ChatThreads.Add(everyone);
            await db.SaveChangesAsync(cancellationToken);
            return new PopkinCreatedDto(popkin.Id, popkin.Name, popkin.Emoji, popkin.Colour, popkin.EndsAt, popkin.InviteCode, links.Build(popkin.InviteCode));
        }
    }

    private static void CheckEnd(PopkinLength length, DateTimeOffset? endsAt, DateTimeOffset now)
    {
        var allowed = length switch
        {
            PopkinLength.KeepItGoing => endsAt is null,
            PopkinLength.UntilDate => endsAt is { } end && end - now >= PopkinRules.MinimumLength && end - now <= PopkinRules.MaximumLength,
            _ => endsAt is { } end && end > now && end - now <= PopkinRules.MaximumLength,
        };
        if (!allowed)
        {
            throw ProblemException.Invalid("ends_at_out_of_range", "Pick a time at least an hour from now and less than a year away.", "endsAt");
        }
    }
}
