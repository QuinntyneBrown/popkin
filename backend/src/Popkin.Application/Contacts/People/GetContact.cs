using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Dates;
using Popkin.Application.Contacts.Security;

namespace Popkin.Application.Contacts.People;

/// <summary>
/// One contact of the caller's, as the profile and the edit form show them (L2-128, L2-130), with
/// their key dates counted from the device's day `On` (yyyy-MM-dd), or the server's day without
/// it. The profile's own design adds the rest of what it shows.
/// </summary>
public sealed record GetContactQuery(Guid ContactId, string? On = null) : IRequest<ContactProfileDto>;

public sealed class GetContactQueryHandler(
    ContactsSwitch contacts, IContactGuard guard, IAppDbContext db, ICurrentPerson current, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<GetContactQuery, ContactProfileDto>
{
    public async Task<ContactProfileDto> Handle(GetContactQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var today = request.On is null ? DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime) : ContactsDayValidator.Parse(request.On);
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        var dates = await db.KeyDates.OwnedBy(current.PersonId).AsNoTracking()
            .Where(d => d.ContactId == contact.Id).ToListAsync(cancellationToken);
        var kept = new ContactKeptDto(
            await db.TimelineEntries.OwnedBy(current.PersonId).CountAsync(e => e.ContactId == contact.Id, cancellationToken),
            await db.Memories.OwnedBy(current.PersonId).CountAsync(m => m.ContactId == contact.Id, cancellationToken));
        return ContactProfileDto.Of(contact, photos, KeyDateRules.ForProfile(dates, today), kept);
    }
}
