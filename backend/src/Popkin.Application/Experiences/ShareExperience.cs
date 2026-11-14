using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>Shares an experience in a Popkin: a title, a kind and, when given, a when, a place and a picture (L2-040).</summary>
public sealed record ShareExperienceCommand(Guid PopkinId, string? Title, string? Kind, string? When, string? Place, PhotoUpload? Picture)
    : IRequest<ExperienceCardDto>;

public sealed class ShareExperienceCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoProcessor processor, IPhotoStore store)
    : IRequestHandler<ShareExperienceCommand, ExperienceCardDto>
{
    public async Task<ExperienceCardDto> Handle(ShareExperienceCommand request, CancellationToken cancellationToken)
    {
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);

        // Every field is checked before a file is written.
        var title = ExperienceFields.Title(request.Title);
        var kind = ExperienceFields.Kind(request.Kind);
        var when = ExperienceFields.When(request.When);
        var place = ExperienceFields.Place(request.Place);
        var processed = request.Picture is null ? null : await ExperiencePictures.ReadAsync(processor, request.Picture, cancellationToken);
        var picture = processed is null ? null : await ExperiencePictures.SaveAsync(store, popkin.Id, processed, cancellationToken);

        var experience = Experience.Share(popkin.Id, membership.Id, kind, title, when, place, picture, clock.GetUtcNow());
        db.Experiences.Add(experience);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // No experience was shared, so the files belong to nothing.
            await ExperiencePictures.DeleteAsync(store, picture);
            throw;
        }

        return ExperienceCardDto.Of(experience, popkin, membership, ExperienceScore.None, keenCount: 0, store);
    }
}
