using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Dates;
using Popkin.Application.Contacts.Security;
using Popkin.Application.Popkins;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Groups;

/// <summary>A member of an open group (L2-146 AC2, AC5): who, how the person knows them, and when they last talked.</summary>
public sealed record GroupMemberDto(
    Guid ContactId,
    string FirstName,
    string FullName,
    string Initials,
    PopkinColour Accent,
    string? PhotoUrl,
    string? KnownAs,
    ContactCircle? Circle,
    DateOnly? LastTalkedOn,
    int? LastTalkedDays);

/// <summary>The Popkin a group opens, while the person is in it (L2-148 AC1, AC4).</summary>
public sealed record GroupPopkinDto(Guid Id, string Name);

/// <summary>A group as Groups lists and opens it (L2-146).</summary>
public sealed record GroupDto(
    Guid Id,
    string Name,
    GroupKind Kind,
    string Emoji,
    PopkinColour Accent,
    string? Note,
    IReadOnlyList<GroupMemberDto> Members,
    IReadOnlyList<KeyDateRowDto> ComingUp,
    GroupPopkinDto? Popkin);

/// <summary>A group's chip on a profile (L2-146 AC4).</summary>
public sealed record GroupChipDto(Guid Id, string Name, string Emoji, PopkinColour Accent);

public sealed record MakeGroupRequest(Guid ClientId, string? Name, string? Kind, string? Note, IReadOnlyList<Guid>? ContactIds);

public sealed record AddGroupPeopleRequest(IReadOnlyList<Guid>? ContactIds);

public sealed record LinkGroupPopkinRequest(Guid? PopkinId);

public static class GroupRules
{
    /// <summary>"Coming up" holds at most this many dates (L2-146 AC5).</summary>
    public const int ComingUpCount = 3;

    public static ProblemException NotFound() => new(404, "group_not_found", "This group isn't in your Contacts.");

    public static ProblemException LinkedElsewhere() =>
        new(409, "group_linked_elsewhere", "This group already has a Popkin you're in.");

    public static string Name(string? name)
    {
        var trimmed = name?.Trim() ?? "";
        if (trimmed.Length == 0)
        {
            throw ProblemException.Invalid("name_required", "Give the group a name, like “Book club”.", "name");
        }

        return trimmed.Length <= ContactGroup.MaxNameLength
            ? trimmed
            : throw ProblemException.Invalid("name_too_long", "Keep it to 40 characters.", "name");
    }

    public static string? Note(string? note)
    {
        var trimmed = note?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return trimmed.Length <= ContactGroup.MaxNoteLength
            ? trimmed
            : throw ProblemException.Invalid("note_too_long", "Keep the note to 500 characters.", "note");
    }

    public static GroupKind Kind(string? kind) =>
        Enum.TryParse<GroupKind>(kind, ignoreCase: false, out var parsed) && Enum.IsDefined(parsed)
            ? parsed
            : throw ProblemException.Invalid("kind_not_allowed", "Choose what kind of group it is.", "kind");

    public static async Task<ContactGroup> RequireOwnedAsync(IAppDbContext db, Guid owner, Guid groupId, CancellationToken cancellationToken) =>
        await db.ContactGroups.OwnedBy(owner).Include(g => g.Members)
            .SingleOrDefaultAsync(g => g.Id == groupId, cancellationToken)
        ?? throw NotFound();

    /// <summary>Every id the caller's own contact, or `404` `contact_not_found`.</summary>
    public static async Task<IReadOnlyList<Guid>> ContactsAsync(
        IContactGuard guard, IReadOnlyList<Guid>? contactIds, CancellationToken cancellationToken)
    {
        var ids = (contactIds ?? []).Distinct().ToList();
        foreach (var id in ids)
        {
            await guard.RequireOwnedAsync(id, cancellationToken);
        }

        return ids;
    }
}

/// <summary>Reads groups as Groups shows them, for the device's day.</summary>
public static class GroupReads
{
    public static GroupChipDto Chip(ContactGroup group) =>
        new(group.Id, group.Name, group.Emoji, AvatarAccent.For(group.Id));

    public static async Task<IReadOnlyList<GroupDto>> ReadAsync(
        IAppDbContext db, Guid owner, IReadOnlyList<ContactGroup> groups, DateOnly today, IPhotoStore photos, CancellationToken cancellationToken)
    {
        var memberIds = groups.SelectMany(g => g.Members.Select(m => m.ContactId)).Distinct().ToList();
        var contacts = await db.Contacts.OwnedBy(owner).AsNoTracking()
            .Where(c => memberIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, cancellationToken);
        var talked = (await db.TimelineEntries.OwnedBy(owner).AsNoTracking()
                .Where(e => memberIds.Contains(e.ContactId) && e.Kind == TimelineEntryKind.Conversation)
                .Select(e => new { e.ContactId, e.Day })
                .ToListAsync(cancellationToken))
            .GroupBy(e => e.ContactId)
            .ToDictionary(g => g.Key, g => g.Max(e => e.Day));
        var dates = await db.KeyDates.OwnedBy(owner).AsNoTracking()
            .Where(d => memberIds.Contains(d.ContactId))
            .ToListAsync(cancellationToken);
        var linked = groups.Select(g => g.PopkinId).OfType<Guid>().Distinct().ToList();
        var open = await db.Popkins.AsNoTracking()
            .Where(p => linked.Contains(p.Id))
            .Where(p => db.Memberships.Any(m => m.PopkinId == p.Id && m.PersonId == owner && m.LeftAt == null))
            .ToDictionaryAsync(p => p.Id, p => new GroupPopkinDto(p.Id, p.Name), cancellationToken);
        var yearOn = today.AddYears(1);

        return groups.Select(group =>
        {
            // In the order they joined; those who joined together A to Z (L2-146 AC5).
            var members = group.Members
                .Where(m => contacts.ContainsKey(m.ContactId))
                .OrderBy(m => m.AddedAt)
                .ThenBy(m => contacts[m.ContactId].Name, StringComparer.OrdinalIgnoreCase)
                .Select(m => contacts[m.ContactId])
                .ToList();
            var ids = members.Select(c => c.Id).ToHashSet();
            var comingUp = dates
                .Where(d => ids.Contains(d.ContactId))
                .Select(d => (Date: d, On: d.NextOccurrence(today)))
                .Where(x => x.On is { } on && on < yearOn)
                .OrderBy(x => x.On)
                .Take(GroupRules.ComingUpCount)
                .Select(x => KeyDateRules.Row(x.Date, contacts[x.Date.ContactId], x.On!.Value, today, photos))
                .ToList();
            return new GroupDto(
                group.Id,
                group.Name,
                group.Kind,
                group.Emoji,
                AvatarAccent.For(group.Id),
                group.Note,
                members.Select(c => new GroupMemberDto(
                    c.Id,
                    PersonName.FirstName(c.Name),
                    c.Name,
                    PersonName.Initials(c.Name),
                    AvatarAccent.For(c.Id),
                    c.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
                    c.KnownAs,
                    c.Circle,
                    talked.TryGetValue(c.Id, out var day) ? day : null,
                    talked.TryGetValue(c.Id, out var on) ? today.DayNumber - on.DayNumber : null)).ToList(),
                comingUp,
                group.PopkinId is { } popkinId && open.TryGetValue(popkinId, out var popkin) ? popkin : null);
        }).ToList();
    }

    /// <summary>The contact's groups, by name, for their profile's chips (L2-146 AC4).</summary>
    public static async Task<IReadOnlyList<GroupChipDto>> OfContactAsync(
        IAppDbContext db, Guid owner, Guid contactId, CancellationToken cancellationToken) =>
        (await db.ContactGroups.OwnedBy(owner).AsNoTracking()
            .Where(g => g.Members.Any(m => m.ContactId == contactId))
            .ToListAsync(cancellationToken))
        .OrderBy(g => g.Name, StringComparer.OrdinalIgnoreCase)
        .Select(Chip)
        .ToList();
}

/// <summary>Groups (L2-146): the caller's groups by kind, then name; nobody else's (L2-122).</summary>
public sealed record GetGroupsQuery(string? On) : IRequest<IReadOnlyList<GroupDto>>;

public sealed class GetGroupsQueryHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<GetGroupsQuery, IReadOnlyList<GroupDto>>
{
    public async Task<IReadOnlyList<GroupDto>> Handle(GetGroupsQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        // The contact form reads the groups for their names only, without the device's day.
        var today = request.On is null ? DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime) : ContactsDayValidator.Parse(request.On);
        var groups = (await db.ContactGroups.OwnedBy(current.PersonId).AsNoTracking().Include(g => g.Members)
                .ToListAsync(cancellationToken))
            .OrderBy(g => g.Kind)
            .ThenBy(g => g.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(g => g.CreatedAt)
            .ToList();
        return await GroupReads.ReadAsync(db, current.PersonId, groups, today, photos, cancellationToken);
    }
}

public sealed record MakeGroupCommand(MakeGroupRequest Group, string? On) : IRequest<MadeGroup>;

/// <summary>The group, and whether this request made it (201) or a resend found it (200).</summary>
public sealed record MadeGroup(GroupDto Group, bool Created);

/// <summary>"Make the group" (L2-147 AC1, AC2, AC5): checked, then saved once with its people.</summary>
public sealed class MakeGroupCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, TimeProvider clock, IPhotoStore photos)
    : IRequestHandler<MakeGroupCommand, MadeGroup>
{
    public async Task<MadeGroup> Handle(MakeGroupCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var today = request.On is null ? DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime) : ContactsDayValidator.Parse(request.On);
        var body = request.Group;
        var created = false;
        if (await ClientWrites.FindAsync(db.ContactGroups.Include(g => g.Members), owner, body.ClientId, cancellationToken) is not { } group)
        {
            var name = GroupRules.Name(body.Name);
            var kind = GroupRules.Kind(body.Kind);
            var note = GroupRules.Note(body.Note);
            var people = await GroupRules.ContactsAsync(guard, body.ContactIds, cancellationToken);
            group = ContactGroup.Make(owner, name, kind, note, people, body.ClientId, clock.GetUtcNow());
            db.ContactGroups.Add(group);
            await db.SaveChangesAsync(cancellationToken);
            created = true;
        }

        var read = await GroupReads.ReadAsync(db, owner, [group], today, photos, cancellationToken);
        return new MadeGroup(read[0], created);
    }
}

public sealed record AddGroupPeopleCommand(Guid GroupId, AddGroupPeopleRequest People, string? On) : IRequest<GroupDto>;

/// <summary>"Add {n} people" (L2-147 AC3): those not in it join; those in it are left alone.</summary>
public sealed class AddGroupPeopleCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, TimeProvider clock, IPhotoStore photos)
    : IRequestHandler<AddGroupPeopleCommand, GroupDto>
{
    public async Task<GroupDto> Handle(AddGroupPeopleCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var today = request.On is null ? DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime) : ContactsDayValidator.Parse(request.On);
        var group = await GroupRules.RequireOwnedAsync(db, owner, request.GroupId, cancellationToken);
        var people = await GroupRules.ContactsAsync(guard, request.People.ContactIds, cancellationToken);
        group.Add(people, clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
        return (await GroupReads.ReadAsync(db, owner, [group], today, photos, cancellationToken))[0];
    }
}

public sealed record LinkGroupPopkinCommand(Guid GroupId, LinkGroupPopkinRequest Link) : IRequest;

/// <summary>
/// "Start a Popkin with them" (L2-148 AC3–AC5): the Host of the new Popkin links the group to it
/// and its invite goes to each member by the details kept on the contact, a phone by text, else an
/// email; one with neither, or whose send fails, is skipped. Asking again for the same Popkin
/// sends nothing more. The contact is told nothing of Contacts or the group.
/// </summary>
public sealed class LinkGroupPopkinCommandHandler(
    IAppDbContext db,
    ICurrentPerson current,
    ContactsSwitch contacts,
    IMembershipGuard guard,
    InviteLinkBuilder links,
    IEnumerable<ICrewInviteSender> senders)
    : IRequestHandler<LinkGroupPopkinCommand>
{
    public async Task Handle(LinkGroupPopkinCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var group = await GroupRules.RequireOwnedAsync(db, owner, request.GroupId, cancellationToken);
        var popkinId = request.Link.PopkinId
            ?? throw ProblemException.Invalid("validation_failed", "Say which Popkin to start with them.", "popkinId");
        var (popkin, host) = await guard.RequireHostAsync(popkinId, cancellationToken);
        var previousStillOpen = group.PopkinId is { } previous && previous != popkin.Id
            && await db.Memberships.AnyAsync(m => m.PopkinId == previous && m.PersonId == owner && m.LeftAt == null, cancellationToken);
        if (previousStillOpen)
        {
            throw GroupRules.LinkedElsewhere();
        }

        if (!group.LinkTo(popkin.Id, previousStillOpen))
        {
            return;
        }

        var ids = group.Members.Select(m => m.ContactId).ToList();
        var members = await db.Contacts.OwnedBy(owner).AsNoTracking()
            .Where(c => ids.Contains(c.Id))
            .ToListAsync(cancellationToken);
        var invite = new CrewInviteMessage(popkin.Name, PersonName.FirstName(host.DisplayName), links.Build(popkin.InviteCode));
        foreach (var member in members)
        {
            var (channel, destination) = !string.IsNullOrWhiteSpace(member.Phone)
                ? (ContactChannel.Phone, member.Phone)
                : (ContactChannel.Email, member.Email);
            if (string.IsNullOrWhiteSpace(destination))
            {
                continue;
            }

            try
            {
                await senders.Single(s => s.Channel == channel).SendAsync(destination, invite, cancellationToken);
            }
            catch (CrewInviteNotSentException)
            {
                // Skipped: the created screen offers the Popkin's own link (L2-148 AC5).
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// The "Groups" toggles of Add someone and Edit (L2-147 AC6): the contact is put in the groups
/// given and taken out of the rest. Without the list, Edit leaves their groups alone.
/// </summary>
public static class GroupMemberships
{
    public static async Task<IReadOnlyList<ContactGroup>?> ValidateAsync(
        IAppDbContext db, Guid owner, IReadOnlyList<Guid>? groupIds, CancellationToken cancellationToken)
    {
        if (groupIds is null)
        {
            return null;
        }

        var ids = groupIds.Distinct().ToList();
        var groups = await db.ContactGroups.OwnedBy(owner).Include(g => g.Members)
            .Where(g => ids.Contains(g.Id))
            .ToListAsync(cancellationToken);
        return groups.Count == ids.Count ? groups : throw GroupRules.NotFound();
    }

    public static async Task ApplyAsync(
        IAppDbContext db, Guid contactId, IReadOnlyList<ContactGroup>? groups, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (groups is null)
        {
            return;
        }

        var keep = groups.Select(g => g.Id).ToHashSet();
        db.ContactGroupMembers.RemoveRange(await db.ContactGroupMembers
            .Where(m => m.ContactId == contactId && !keep.Contains(m.GroupId))
            .ToListAsync(cancellationToken));
        foreach (var group in groups)
        {
            group.Add([contactId], now);
        }
    }
}
