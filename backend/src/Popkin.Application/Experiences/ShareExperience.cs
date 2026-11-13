using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>Shares an experience in a Popkin: a title, a kind and, when given, a when and a place (L2-040).</summary>
public sealed record ShareExperienceCommand(Guid PopkinId, string? Title, string? Kind, string? When, string? Place) : IRequest<ExperienceCardDto>;

public sealed class ShareExperienceCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore store)
    : IRequestHandler<ShareExperienceCommand, ExperienceCardDto>
{
    public async Task<ExperienceCardDto> Handle(ShareExperienceCommand request, CancellationToken cancellationToken)
    {
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);

        var experience = Experience.Share(
            popkin.Id,
            membership.Id,
            ExperienceFields.Kind(request.Kind),
            ExperienceFields.Title(request.Title),
            ExperienceFields.When(request.When),
            ExperienceFields.Place(request.Place),
            clock.GetUtcNow());
        db.Experiences.Add(experience);
        await db.SaveChangesAsync(cancellationToken);

        return ExperienceCardDto.Of(experience, popkin, membership, store);
    }
}
