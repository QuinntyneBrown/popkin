using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;
using Popkin.Application.Photos;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Connections;

/// <summary>A face on the map (L2-149 AC1, AC6): who, their colour and photo, and how the person knows them.</summary>
public sealed record MapPersonDto(
    Guid ContactId,
    string FirstName,
    string FullName,
    string Initials,
    PopkinColour Accent,
    string? PhotoUrl,
    string? KnownAs,
    ContactCircle? Circle);

/// <summary>A line between two faces, the pair smaller id first.</summary>
public sealed record ConnectionDto(Guid Id, Guid ContactId, Guid OtherContactId, ConnectionKind Kind, string? Words, bool Promised)
{
    public static ConnectionDto Of(Connection connection) =>
        new(connection.Id, connection.ContactId, connection.OtherContactId, connection.Kind, connection.Words, connection.Promised);
}

/// <summary>Connections (L2-149): the faces in the order they were first connected, and the lines.</summary>
public sealed record ConnectionMapDto(IReadOnlyList<MapPersonDto> People, IReadOnlyList<ConnectionDto> Connections);

/// <summary>"People around {first name}" on a profile (L2-150 AC4): the other contact and the connection's words.</summary>
public sealed record AroundDto(
    Guid Id,
    Guid ContactId,
    string Name,
    string Initials,
    PopkinColour Accent,
    string? PhotoUrl,
    ConnectionKind Kind,
    string? Words,
    bool Promised);

/// <summary>"Connect": the two contacts, how they know each other and, optionally, in the owner's words.</summary>
public sealed record ConnectRequest(Guid ClientId, Guid ContactId, Guid? OtherContactId, string? Kind, string? Words, bool Promised);

/// <summary>"How they connect" in Add someone (L2-150 AC9): a connection to save with the contact.</summary>
public sealed record ConnectionDraftDto(Guid OtherContactId, string? Kind, string? Words, bool Promised);

public static class ConnectionReads
{
    public static MapPersonDto Person(Contact contact, IPhotoStore photos) =>
        new(
            contact.Id,
            PersonName.FirstName(contact.Name),
            contact.Name,
            PersonName.Initials(contact.Name),
            AvatarAccent.For(contact.Id),
            contact.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
            contact.KnownAs,
            contact.Circle);

    /// <summary>The contact's connections, oldest first, each with the contact at the other end.</summary>
    public static async Task<IReadOnlyList<AroundDto>> AroundAsync(
        IAppDbContext db, Guid owner, Guid contactId, IPhotoStore photos, CancellationToken cancellationToken)
    {
        var connections = await db.Connections.OwnedBy(owner).AsNoTracking()
            .Where(c => c.ContactId == contactId || c.OtherContactId == contactId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(cancellationToken);
        var others = connections.Select(c => c.Other(contactId)).ToList();
        var contacts = await db.Contacts.OwnedBy(owner).AsNoTracking()
            .Where(c => others.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, cancellationToken);
        return connections
            .Where(c => contacts.ContainsKey(c.Other(contactId)))
            .Select(c =>
            {
                var other = contacts[c.Other(contactId)];
                return new AroundDto(
                    c.Id,
                    other.Id,
                    other.Name,
                    PersonName.Initials(other.Name),
                    AvatarAccent.For(other.Id),
                    other.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
                    c.Kind,
                    c.Words,
                    c.Promised);
            })
            .ToList();
    }
}

/// <summary>Connections (L2-149): the caller's own connections and the contacts in them (L2-122).</summary>
public sealed record GetConnectionMapQuery : IRequest<ConnectionMapDto>;

public sealed class GetConnectionMapQueryHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos)
    : IRequestHandler<GetConnectionMapQuery, ConnectionMapDto>
{
    public async Task<ConnectionMapDto> Handle(GetConnectionMapQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var connections = await db.Connections.OwnedBy(owner).AsNoTracking()
            .OrderBy(c => c.CreatedAt)
            .ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);
        var order = connections.SelectMany(c => new[] { c.ContactId, c.OtherContactId }).Distinct().ToList();
        var people = await db.Contacts.OwnedBy(owner).AsNoTracking()
            .Where(c => order.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, cancellationToken);
        return new ConnectionMapDto(
            order.Where(people.ContainsKey).Select(id => ConnectionReads.Person(people[id], photos)).ToList(),
            connections.Select(ConnectionDto.Of).ToList());
    }
}

public sealed record ConnectCommand(ConnectRequest Connection) : IRequest<MadeConnection>;

/// <summary>The connection, and whether this request made it (201) or a resend found it (200).</summary>
public sealed record MadeConnection(ConnectionDto Connection, bool Created);

/// <summary>"Connect" (L2-150 AC1–6): both contacts the caller's own, connected once.</summary>
public sealed class ConnectCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, TimeProvider clock)
    : IRequestHandler<ConnectCommand, MadeConnection>
{
    public async Task<MadeConnection> Handle(ConnectCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var body = request.Connection;
        if (await ClientWrites.FindAsync(db.Connections, owner, body.ClientId, cancellationToken) is { } saved)
        {
            return new MadeConnection(ConnectionDto.Of(saved), false);
        }

        var other = body.OtherContactId ?? throw ConnectionRules.WhoRequired();
        if (other == body.ContactId)
        {
            throw ConnectionRules.ToSelf();
        }

        var kind = ConnectionRules.Kind(body.Kind);
        var words = ConnectionRules.Words(body.Words);
        await guard.RequireOwnedAsync(body.ContactId, cancellationToken);
        await guard.RequireOwnedAsync(other, cancellationToken);
        if (await ConnectionRules.ExistsAsync(db, owner, body.ContactId, other, cancellationToken))
        {
            throw ConnectionRules.Exists();
        }

        var connection = Connection.Connect(owner, body.ContactId, other, kind, words, body.Promised, body.ClientId, clock.GetUtcNow());
        db.Connections.Add(connection);
        await db.SaveChangesAsync(cancellationToken);
        return new MadeConnection(ConnectionDto.Of(connection), true);
    }
}

public sealed record DisconnectCommand(Guid ConnectionId) : IRequest;

/// <summary>Removes one of the caller's connections (L2-150 AC9).</summary>
public sealed class DisconnectCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts)
    : IRequestHandler<DisconnectCommand>
{
    public async Task Handle(DisconnectCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var connection = await db.Connections.OwnedBy(current.PersonId)
            .SingleOrDefaultAsync(c => c.Id == request.ConnectionId, cancellationToken)
            ?? throw ConnectionRules.NotFound();
        db.Connections.Remove(connection);
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// "How they connect" saved with the contact (L2-150 AC9): checked before anything is saved, then
/// added and removed in the contact's own save.
/// </summary>
public static class ConnectionDrafts
{
    public static IReadOnlyList<(Guid Other, ConnectionKind Kind, string? Words, bool Promised)> Validate(
        IReadOnlyList<ConnectionDraftDto>? drafts) =>
        (drafts ?? []).Select(d => (d.OtherContactId, ConnectionRules.Kind(d.Kind), ConnectionRules.Words(d.Words), d.Promised)).ToList();

    public static async Task ApplyAsync(
        IAppDbContext db,
        IContactGuard guard,
        Contact contact,
        IReadOnlyList<(Guid Other, ConnectionKind Kind, string? Words, bool Promised)> connect,
        IReadOnlyList<Guid>? disconnect,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var owner = contact.OwnerId;
        foreach (var id in disconnect ?? [])
        {
            var connection = await db.Connections.OwnedBy(owner)
                .SingleOrDefaultAsync(c => c.Id == id && (c.ContactId == contact.Id || c.OtherContactId == contact.Id), cancellationToken)
                ?? throw ConnectionRules.NotFound();
            db.Connections.Remove(connection);
        }

        foreach (var (other, kind, words, promised) in connect)
        {
            if (other == contact.Id)
            {
                throw ConnectionRules.ToSelf();
            }

            await guard.RequireOwnedAsync(other, cancellationToken);
            if (await ConnectionRules.ExistsAsync(db, owner, contact.Id, other, cancellationToken))
            {
                throw ConnectionRules.Exists();
            }

            db.Connections.Add(Connection.Connect(owner, contact.Id, other, kind, words, promised, Guid.NewGuid(), now));
        }
    }
}
