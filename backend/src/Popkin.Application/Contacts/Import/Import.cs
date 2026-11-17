using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Import;

/// <summary>Someone the person shares a Popkin with, as Import lists them (L2-151 AC1).</summary>
public sealed record ImportPersonDto(Guid PersonId, string Name, string Initials, PopkinColour Accent, string? PhotoUrl);

/// <summary>A Popkin the person is in, with its people A to Z (L2-151 AC1, AC6).</summary>
public sealed record ImportPopkinDto(
    Guid PopkinId, string Name, string Emoji, PopkinColour Colour, int PeopleCount, IReadOnlyList<ImportPersonDto> People);

/// <summary>Everyone to import, counted once each (L2-151 AC2), under each Popkin.</summary>
public sealed record ImportCandidatesDto(int Total, IReadOnlyList<ImportPopkinDto> Popkins);

public sealed record ImportContactsRequest(Guid ClientId, IReadOnlyList<Guid>? PersonIds);

public sealed record ImportResultDto(int Imported);

/// <summary>
/// Who the person shares a Popkin with (docs/detailed-designs/contacts/import-from-popkins): the
/// other members, not left, of every Popkin the person has not left, wrapped up or not, newest
/// first. A deleted account is nobody's candidate. The query and the command read them alike, so
/// Import never copies an account the person does not share a Popkin with (L2-122 AC1).
/// </summary>
internal static class ImportCandidates
{
    public sealed record Shared(Guid PopkinId, string PopkinName, string Emoji, PopkinColour Colour, DateTimeOffset LastActivityAt,
        Guid PersonId, string DisplayName, string? PhotoKey);

    public static async Task<List<Shared>> ReadAsync(IAppDbContext db, Guid owner, CancellationToken cancellationToken)
    {
        var mine = db.Memberships.Where(m => m.PersonId == owner && m.LeftAt == null).Select(m => m.PopkinId);
        var rows = await (
            from m in db.Memberships
            where mine.Contains(m.PopkinId) && m.LeftAt == null && m.PersonId != owner
            join p in db.Popkins on m.PopkinId equals p.Id
            join person in db.People on m.PersonId equals person.Id
            where person.DeletedAt == null
            select new Shared(p.Id, p.Name, p.Emoji, p.Colour, p.LastActivityAt, m.PersonId, m.DisplayName, m.PhotoKey ?? person.PhotoKey))
            .ToListAsync(cancellationToken);
        return rows
            .OrderByDescending(r => r.LastActivityAt)
            .ThenBy(r => r.PopkinId)
            .ThenBy(r => r.DisplayName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();
    }

    /// <summary>The accounts the person already keeps a contact for.</summary>
    public static async Task<HashSet<Guid>> HeldAsync(IAppDbContext db, Guid owner, CancellationToken cancellationToken) =>
        (await db.Contacts.OwnedBy(owner).Where(c => c.PersonId != null).Select(c => c.PersonId!.Value)
            .ToListAsync(cancellationToken)).ToHashSet();
}

public sealed record GetImportCandidatesQuery : IRequest<ImportCandidatesDto>;

/// <summary>"Import from your Popkins" (L2-151 AC1, AC2, AC6): nobody already in Contacts.</summary>
public sealed class GetImportCandidatesQueryHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos)
    : IRequestHandler<GetImportCandidatesQuery, ImportCandidatesDto>
{
    public async Task<ImportCandidatesDto> Handle(GetImportCandidatesQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var held = await ImportCandidates.HeldAsync(db, owner, cancellationToken);
        var rows = (await ImportCandidates.ReadAsync(db, owner, cancellationToken))
            .Where(r => !held.Contains(r.PersonId))
            .ToList();
        var popkins = rows
            .GroupBy(r => r.PopkinId)
            .Select(g =>
            {
                var first = g.First();
                var people = g
                    .Select(r => new ImportPersonDto(
                        r.PersonId,
                        r.DisplayName,
                        PersonName.Initials(r.DisplayName),
                        AvatarAccent.For(r.PersonId),
                        r.PhotoKey is null ? null : photos.GetReadUrl(r.PhotoKey)))
                    .ToList();
                return new ImportPopkinDto(first.PopkinId, first.PopkinName, first.Emoji, first.Colour, people.Count, people);
            })
            .ToList();
        return new ImportCandidatesDto(rows.Select(r => r.PersonId).Distinct().Count(), popkins);
    }
}

public sealed record ImportContactsCommand(ImportContactsRequest Import) : IRequest<ImportResultDto>;

/// <summary>
/// "Import {n} people" (L2-151 AC2, AC4): one contact per person ticked, with the name they show in
/// the first Popkin listed and nothing else; someone already kept is skipped, someone not shared is
/// refused, and nobody is told. One save, so a failure imports nobody.
/// </summary>
public sealed class ImportContactsCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, TimeProvider clock)
    : IRequestHandler<ImportContactsCommand, ImportResultDto>
{
    public async Task<ImportResultDto> Handle(ImportContactsCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var body = request.Import;
        if (await ClientWrites.FindAsync(db.ImportBatches, owner, body.ClientId, cancellationToken) is { } done)
        {
            return new ImportResultDto(done.Imported);
        }

        var ticked = (body.PersonIds ?? []).Distinct().ToList();
        if (ticked.Count == 0)
        {
            throw ProblemException.Invalid("import_nobody", "Tick someone to import.", "personIds");
        }

        var shared = await ImportCandidates.ReadAsync(db, owner, cancellationToken);
        var names = new Dictionary<Guid, string>();
        foreach (var row in shared)
        {
            names.TryAdd(row.PersonId, row.DisplayName);
        }

        if (ticked.Any(id => !names.ContainsKey(id)))
        {
            throw ProblemException.Invalid(
                "import_person_not_shared", "You can only import people you share a Popkin with.", "personIds");
        }

        var held = await ImportCandidates.HeldAsync(db, owner, cancellationToken);
        var now = clock.GetUtcNow();
        var made = ticked.Where(id => !held.Contains(id)).Select(id => Contact.Import(owner, id, names[id], now)).ToList();
        db.Contacts.AddRange(made);
        db.ImportBatches.Add(ImportBatch.Record(owner, body.ClientId, made.Count, now));
        await db.SaveChangesAsync(cancellationToken);
        return new ImportResultDto(made.Count);
    }
}
