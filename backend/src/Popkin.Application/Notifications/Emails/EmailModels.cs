namespace Popkin.Application.Notifications.Emails;

/// <summary>The Popkin's tile in an email's header (L2-163 AC2).</summary>
public sealed record PopkinHeader(string Name, string Emoji, string Colour);

public sealed record EmailLink(string Label, string Url);

/// <summary>What every notification email shares: envelope, header and footer (L2-163).</summary>
public sealed record EmailShellModel(
    string Subject,
    string Preheader,
    string FromDisplayName,
    PopkinHeader? Popkin,
    string Reason,
    EmailLink? Mute,
    string SettingsUrl,
    string UnsubscribeUrl,
    string PostalAddress);

/// <summary>A notification email's model, rendered by its template (ADR 0030).</summary>
public abstract record EmailModel(EmailShellModel Shell);

/// <summary>A line under "Also new in the last {n} minutes" (L2-164 AC6).</summary>
public sealed record AlsoNewRow(string Line, string At);

/// <summary>The lead change of a Popkin update: its headline and its button.</summary>
public abstract record UpdateLead(string Headline, EmailLink Button);

/// <summary>The person's own message a reply answers, shown faded above it.</summary>
public sealed record QuotedMessage(string Text, string At);

/// <summary>A reply, a direct message or a message in Everyone.</summary>
public sealed record MessageLead(string Headline, EmailLink Button, string AuthorName, string Text, string At, QuotedMessage? Answers)
    : UpdateLead(Headline, Button);

/// <summary>The Popkin update email (L2-164).</summary>
public sealed record PopkinUpdateEmailModel(EmailShellModel Shell, UpdateLead Lead, IReadOnlyList<AlsoNewRow> AlsoNew, int WindowMinutes)
    : EmailModel(Shell);
