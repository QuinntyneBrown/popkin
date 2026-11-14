using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.Experiences;

/// <summary>
/// "We did this": the member who shared an idea, or the Host, turns it into something the group
/// did, which members then rate (L2-042 AC4). It answers the experience as its page shows it.
/// </summary>
public sealed record MarkExperienceDoneCommand(Guid PopkinId, Guid ExperienceId) : IRequest<ExperienceDetailDto>;

public sealed class MarkExperienceDoneCommandHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<MarkExperienceDoneCommand, ExperienceDetailDto>
{
    public async Task<ExperienceDetailDto> Handle(MarkExperienceDoneCommand request, CancellationToken cancellationToken)
    {
        // Nothing is changed in a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        var experience = await Experiences.RequireAsync(db.Experiences, popkin.Id, request.ExperienceId, cancellationToken);
        if (!experience.CanBeMarkedDoneBy(membership))
        {
            throw EditExperienceCommandHandler.NotSharer();
        }

        if (!experience.IsWanted)
        {
            throw SetKeenCommandHandler.NotWanted();
        }

        // Who was keen stays recorded; something the group did shows no keen.
        experience.MarkDone();
        await db.SaveChangesAsync(cancellationToken);
        return await ExperienceDetails.OfAsync(db, store, popkin, membership, experience, cancellationToken);
    }
}
