using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;
using Popkin.Application.Photos;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.FollowUps;

/// <summary>
/// One follow-up as Follow-ups and a profile list it (L2-141): its contact's first name, initials,
/// colour and photo (all null for none), its day, and a promise's channel and day.
/// </summary>
public sealed record FollowUpDto(
    Guid Id,
    string Text,
    Guid? ContactId,
    string? ContactFirstName,
    string? ContactInitials,
    PopkinColour? ContactAccent,
    string? ContactPhotoUrl,
    DateOnly? DueOn,
    bool IsPromise,
    TalkChannel? PromisedVia,
    DateOnly? PromisedOn,
    DateTimeOffset CreatedAt,
    DateTimeOffset? DoneAt)
{
    public static FollowUpDto Of(FollowUp followUp, Contact? contact, IPhotoStore photos) =>
        new(
            followUp.Id,
            followUp.Text,
            followUp.ContactId,
            contact is null ? null : PersonName.FirstName(contact.Name),
            contact is null ? null : PersonName.Initials(contact.Name),
            contact is null ? null : AvatarAccent.For(contact.Id),
            contact?.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
            followUp.DueOn,
            followUp.IsPromise,
            followUp.PromisedVia,
            followUp.PromisedOn,
            followUp.CreatedAt,
            followUp.DoneAt);
}

/// <summary>"Add a follow-up": the day as `yyyy-MM-dd`, or none.</summary>
public sealed record AddFollowUpRequest(Guid ClientId, string? Text, Guid? ContactId, string? DueOn);

public sealed record SetFollowUpDoneRequest(bool Done);

/// <summary>What a follow-up must be (L2-142 AC1, known gap 106 ruled), and one loaded for its owner alone (L2-122).</summary>
public static class FollowUpRules
{
    public static ProblemException NotFound() => new(404, "follow_up_not_found", "This follow-up isn't in your Contacts.");

    public static string Text(string? text)
    {
        var trimmed = FollowUp.Trimmed(text) ?? throw ProblemException.Invalid("text_required", "Say what to do.", "text");
        return trimmed.Length <= FollowUp.MaxTextLength
            ? trimmed
            : throw ProblemException.Invalid("text_too_long", $"Keep it to {FollowUp.MaxTextLength} characters.", "text");
    }

    public static DateOnly? Due(string? dueOn) =>
        string.IsNullOrWhiteSpace(dueOn) ? null
        : DateOnly.TryParseExact(dueOn, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day) ? day
        : throw ProblemException.Invalid("due_not_valid", "That day isn't in the calendar.", "dueOn");

    public static async Task<FollowUp> RequireOwnedAsync(IAppDbContext db, Guid owner, Guid id, CancellationToken cancellationToken) =>
        await db.FollowUps.OwnedBy(owner).SingleOrDefaultAsync(f => f.Id == id, cancellationToken) ?? throw NotFound();

    public static async Task<FollowUpDto> DtoAsync(IAppDbContext db, FollowUp followUp, IPhotoStore photos, CancellationToken cancellationToken)
    {
        var contact = followUp.ContactId is { } id
            ? await db.Contacts.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id, cancellationToken)
            : null;
        return FollowUpDto.Of(followUp, contact, photos);
    }
}

/// <summary>Follow-ups (L2-141): every one of the caller's, open and done, oldest first.</summary>
public sealed record GetFollowUpsQuery : IRequest<IReadOnlyList<FollowUpDto>>;

public sealed class GetFollowUpsQueryHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos)
    : IRequestHandler<GetFollowUpsQuery, IReadOnlyList<FollowUpDto>>
{
    public async Task<IReadOnlyList<FollowUpDto>> Handle(GetFollowUpsQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var followUps = await db.FollowUps.OwnedBy(owner).AsNoTracking().ToListAsync(cancellationToken);
        var people = await db.Contacts.OwnedBy(owner).AsNoTracking().ToDictionaryAsync(c => c.Id, cancellationToken);
        return followUps
            .OrderBy(f => f.CreatedAt)
            .Select(f => FollowUpDto.Of(f, f.ContactId is { } id ? people.GetValueOrDefault(id) : null, photos))
            .ToList();
    }
}

public sealed record AddFollowUpCommand(AddFollowUpRequest FollowUp) : IRequest<AddedFollowUp>;

/// <summary>The follow-up, and whether this request added it (201) or a resend found it (200).</summary>
public sealed record AddedFollowUp(FollowUpDto FollowUp, bool Created);

public sealed class AddFollowUpCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<AddFollowUpCommand, AddedFollowUp>
{
    public async Task<AddedFollowUp> Handle(AddFollowUpCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var body = request.FollowUp;
        if (await ClientWrites.FindAsync(db.FollowUps, owner, body.ClientId, cancellationToken) is { } saved)
        {
            return new AddedFollowUp(await FollowUpRules.DtoAsync(db, saved, photos, cancellationToken), false);
        }

        var contact = body.ContactId is { } id ? await guard.RequireOwnedAsync(id, cancellationToken) : null;
        var followUp = FollowUp.Add(owner, body.ClientId, contact?.Id, FollowUpRules.Text(body.Text), FollowUpRules.Due(body.DueOn), clock.GetUtcNow());
        db.FollowUps.Add(followUp);
        await db.SaveChangesAsync(cancellationToken);
        return new AddedFollowUp(FollowUpDto.Of(followUp, contact, photos), true);
    }
}

/// <summary>"Mark done" and "Mark not done" (L2-142 AC2, AC3); asking for the state it has changes nothing.</summary>
public sealed record SetFollowUpDoneCommand(Guid FollowUpId, bool Done) : IRequest<FollowUpDto>;

public sealed class SetFollowUpDoneCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<SetFollowUpDoneCommand, FollowUpDto>
{
    public async Task<FollowUpDto> Handle(SetFollowUpDoneCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var followUp = await FollowUpRules.RequireOwnedAsync(db, current.PersonId, request.FollowUpId, cancellationToken);
        if (request.Done)
        {
            followUp.MarkDone(clock.GetUtcNow());
        }
        else
        {
            followUp.MarkNotDone();
        }

        await db.SaveChangesAsync(cancellationToken);
        return await FollowUpRules.DtoAsync(db, followUp, photos, cancellationToken);
    }
}
