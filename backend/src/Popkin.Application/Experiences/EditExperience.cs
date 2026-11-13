using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;
using Popkin.Application.Security;

namespace Popkin.Application.Experiences;

/// <summary>
/// Changes an experience, for its sharer only (L2-040 AC6). A field that is null was not sent and
/// stays as it is; an empty when or place is cleared. A new picture replaces the one it had, and
/// `RemovePicture` leaves it with none.
/// </summary>
public sealed record EditExperienceCommand(
    Guid PopkinId, Guid ExperienceId, string? Title, string? Kind, string? When, string? Place, PhotoUpload? Picture, bool RemovePicture)
    : IRequest<ExperienceCardDto>;

public sealed class EditExperienceCommandHandler(
    IAppDbContext db, IMembershipGuard guard, IPhotoProcessor processor, IPhotoStore store)
    : IRequestHandler<EditExperienceCommand, ExperienceCardDto>
{
    public async Task<ExperienceCardDto> Handle(EditExperienceCommand request, CancellationToken cancellationToken)
    {
        // Nothing is changed in a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        var experience = await Experiences.RequireAsync(db.Experiences, popkin.Id, request.ExperienceId, cancellationToken);
        if (!experience.CanBeEditedBy(membership))
        {
            throw NotSharer();
        }

        // The rules of sharing hold, and every field is checked before a file is written.
        var title = request.Title is null ? experience.Title : ExperienceFields.Title(request.Title);
        var kind = request.Kind is null ? experience.Kind : ExperienceFields.Kind(request.Kind);
        var when = request.When is null ? experience.When : ExperienceFields.When(request.When);
        var place = request.Place is null ? experience.Place : ExperienceFields.Place(request.Place);
        var processed = request.Picture is null ? null : await ExperiencePictures.ReadAsync(processor, request.Picture, cancellationToken);
        var added = processed is null ? null : await ExperiencePictures.SaveAsync(store, popkin.Id, processed, cancellationToken);

        var replaced = added is not null || request.RemovePicture ? experience.Picture : null;
        experience.Edit(kind, title, when, place);
        if (added is not null || request.RemovePicture)
        {
            experience.SetPicture(added);
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Nothing changed, so the new files belong to nothing.
            await ExperiencePictures.DeleteAsync(store, added);
            throw;
        }

        // Only now does the picture it had belong to nothing.
        await ExperiencePictures.DeleteAsync(store, replaced);
        var score = await ExperienceScores.OfAsync(db, experience, cancellationToken);
        return ExperienceCardDto.Of(experience, popkin, membership, score, store);
    }

    public static ProblemException NotSharer() => new(403, "not_experience_sharer", "Only the member who shared this can do that.");
}
