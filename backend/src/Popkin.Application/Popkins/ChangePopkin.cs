using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Popkins;

/// <summary>
/// A Popkin's settings as its Host last saved them, and the version that orders them: the
/// answer to a change and the argument of `PopkinChanged` (L2-020 AC3, AC4).
/// </summary>
public sealed record PopkinDto(Guid Id, string Name, string Emoji, PopkinColour Colour, DateTimeOffset? EndsAt, long Version)
{
    public static PopkinDto Of(PopkinSpace popkin) =>
        new(popkin.Id, popkin.Name, popkin.Emoji, popkin.Colour, popkin.EndsAt, popkin.Version);
}

/// <summary>The Host changes the Popkin's name, emoji and colour, under the rules of L2-008 (L2-020 AC3, AC5).</summary>
public sealed record ChangePopkinLookCommand(Guid PopkinId, string? Name, string? Emoji, string? Colour) : IRequest<PopkinDto>;

public sealed class ChangePopkinLookCommandHandler(IAppDbContext db, IMembershipGuard guard, IPopkinNotifier notifier)
    : IRequestHandler<ChangePopkinLookCommand, PopkinDto>
{
    public async Task<PopkinDto> Handle(ChangePopkinLookCommand request, CancellationToken cancellationToken)
    {
        // Who may ask, and whether the Popkin is still open, come before what was asked.
        var (popkin, _) = await guard.RequireHostAsync(request.PopkinId, cancellationToken);
        popkin.ChangeLook(PopkinInput.Name(request.Name), PopkinInput.Emoji(request.Emoji), PopkinInput.Colour(request.Colour));
        return await PopkinChanges.SaveAsync(db, notifier, popkin, cancellationToken);
    }
}

/// <summary>Saves a change to a Popkin's settings and tells every member once it is committed.</summary>
internal static class PopkinChanges
{
    public static async Task<PopkinDto> SaveAsync(IAppDbContext db, IPopkinNotifier notifier, PopkinSpace popkin, CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Saved from an older version: a wrap-up won the race, or another change did.
            var wrappedUp = await db.Popkins.AsNoTracking()
                .AnyAsync(p => p.Id == popkin.Id && p.Status == PopkinStatus.WrappedUp, CancellationToken.None);
            if (wrappedUp)
            {
                throw MembershipGuard.WrappedUp();
            }

            throw;
        }

        var changed = PopkinDto.Of(popkin);
        await notifier.PopkinChanged(popkin.Id, changed);
        return changed;
    }
}
