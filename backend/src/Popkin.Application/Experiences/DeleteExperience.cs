using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.Experiences;

/// <summary>Deletes an experience, for its sharer or the Host (L2-040 AC6). Its ratings and comments go with it.</summary>
public sealed record DeleteExperienceCommand(Guid PopkinId, Guid ExperienceId) : IRequest;

public sealed class DeleteExperienceCommandHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<DeleteExperienceCommand>
{
    public async Task Handle(DeleteExperienceCommand request, CancellationToken cancellationToken)
    {
        // Nothing is changed in a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        var experience = await Experiences.RequireAsync(db.Experiences, popkin.Id, request.ExperienceId, cancellationToken);
        if (!experience.CanBeDeletedBy(membership))
        {
            throw EditExperienceCommandHandler.NotSharer();
        }

        // The ratings, and the comments they carry, are removed in the same save as the experience.
        var ratings = await db.ExperienceRatings.Where(r => r.ExperienceId == experience.Id).ToListAsync(cancellationToken);
        db.ExperienceRatings.RemoveRange(ratings);
        db.Experiences.Remove(experience);
        await db.SaveChangesAsync(cancellationToken);

        // Only now does its picture belong to nothing.
        await ExperiencePictures.DeleteAsync(store, experience.Picture);
    }
}
