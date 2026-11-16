using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Connections;

/// <summary>What a connection must be (L2-150, known gap 109 ruled), and one loaded for its owner alone (L2-122).</summary>
public static class ConnectionRules
{
    public static ProblemException NotFound() =>
        new(404, "connection_not_found", "This connection isn't in your Contacts.");

    public static ProblemException Exists() =>
        new(409, "already_connected", "They're already connected.");

    public static ProblemException WhoRequired() =>
        ProblemException.Invalid("who_required", "Pick who they're connected to.", "otherContactId");

    public static ProblemException ToSelf() =>
        ProblemException.Invalid("connection_to_self", "Pick someone else to connect them to.", "otherContactId");

    /// <summary>"In your words": trimmed, none when empty, at most 60 characters.</summary>
    public static string? Words(string? words)
    {
        if (string.IsNullOrWhiteSpace(words))
        {
            return null;
        }

        var trimmed = words.Trim();
        return trimmed.Length <= Connection.MaxWordsLength
            ? trimmed
            : throw ProblemException.Invalid("words_too_long", $"Keep it to {Connection.MaxWordsLength} characters.", "words");
    }

    public static ConnectionKind Kind(string? kind) =>
        Enum.TryParse<ConnectionKind>(kind, ignoreCase: false, out var parsed) && Enum.IsDefined(parsed)
            ? parsed
            : throw ProblemException.Invalid("kind_not_allowed", "Choose family, partner, friend or work.", "kind");

    /// <summary>The line from "You" to a contact, by their circle (L2-149 AC6): none without one.</summary>
    public static ConnectionKind? LineToYou(ContactCircle? circle) => circle switch
    {
        ContactCircle.Family => ConnectionKind.Family,
        ContactCircle.Work => ConnectionKind.Work,
        null => null,
        _ => ConnectionKind.Friend,
    };

    /// <summary>Whether the owner has already connected these two, in either order.</summary>
    public static Task<bool> ExistsAsync(IAppDbContext db, Guid owner, Guid a, Guid b, CancellationToken cancellationToken)
    {
        var (first, second) = Connection.Order(a, b);
        return db.Connections.OwnedBy(owner).AnyAsync(c => c.ContactId == first && c.OtherContactId == second, cancellationToken);
    }
}
