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

/// <summary>A notification email's model, rendered by its template (ADR 0031).</summary>
public abstract record EmailModel(EmailShellModel Shell)
{
    /// <summary>The pictures the email carries inline.</summary>
    public virtual IReadOnlyList<EmailPicture> Pictures => [];
}

/// <summary>A line under "Also new in the last {n} minutes" (L2-164 AC6).</summary>
public sealed record AlsoNewRow(string Line, string At);

/// <summary>The lead change of a Popkin update: its headline and its button.</summary>
public abstract record UpdateLead(string Headline, EmailLink Button);

/// <summary>The person's own message a reply answers, shown faded above it.</summary>
public sealed record QuotedMessage(string Text, string At);

/// <summary>A reply, a direct message or a message in Everyone.</summary>
public sealed record MessageLead(string Headline, EmailLink Button, string AuthorName, string Text, string At, QuotedMessage? Answers)
    : UpdateLead(Headline, Button);

/// <summary>A picture in the email, carried inline as `cid:{ContentId}` (popkin-update-email, "Pictures").</summary>
public sealed record EmailPicture(string ContentId, string BlobKey, string Alt);

/// <summary>"{first name} added {n} photos to the album": the newest five and a "+{n}" tile (L2-164 AC2).</summary>
public sealed record PhotosLead(string Headline, EmailLink Button, string? Caption, IReadOnlyList<EmailPicture> Photos, int More)
    : UpdateLead(Headline, Button);

/// <summary>A story of a plan change: "Yours now", its note, and a due date before and after (L2-164 AC3).</summary>
public sealed record PlanStoryLine(string Title, bool YoursNow, string? Note, string? DueBefore, string? DueAfter);

public sealed record PlanLead(string Headline, EmailLink Button, IReadOnlyList<PlanStoryLine> Stories)
    : UpdateLead(Headline, Button);

/// <summary>A change told in a few lines: someone joining, a schedule change, an experience (L2-164 AC4).</summary>
public sealed record NoteLead(string Headline, EmailLink Button, IReadOnlyList<string> Lines, EmailPicture? Picture)
    : UpdateLead(Headline, Button);

/// <summary>The Popkin update email (L2-164).</summary>
public sealed record PopkinUpdateEmailModel(EmailShellModel Shell, UpdateLead Lead, IReadOnlyList<AlsoNewRow> AlsoNew, int WindowMinutes)
    : EmailModel(Shell)
{
    public override IReadOnlyList<EmailPicture> Pictures => Lead switch
    {
        PhotosLead photos => photos.Photos,
        NoteLead { Picture: { } picture } => [picture],
        _ => [],
    };
}

/// <summary>"Last time you talked · {day}": the latest conversation's title and text (L2-166 AC4).</summary>
public sealed record LastTalk(string Heading, string? Title, string? Text);

/// <summary>"On your list": the contact's earliest open follow-up before the day (L2-166 AC3).</summary>
public sealed record OnYourList(string Text, string Planned);

/// <summary>The key date reminder email, ahead of the day or on it (L2-166).</summary>
public sealed record KeyDateReminderEmailModel(
    EmailShellModel Shell,
    string Headline,
    string Details,
    int? Age,
    string Initials,
    EmailPicture? Photo,
    string LovesTitle,
    IReadOnlyList<string> Loves,
    LastTalk? LastTalk,
    OnYourList? OnYourList,
    EmailLink Button,
    EmailLink? SecondButton)
    : EmailModel(Shell)
{
    public override IReadOnlyList<EmailPicture> Pictures => Photo is { } photo ? [photo] : [];
}

/// <summary>The story-due reminder (L2-167 AC1, AC3): the story, its day, "Yours", its points and tag.</summary>
public sealed record StoryDueEmailModel(
    EmailShellModel Shell,
    string Title,
    string DueLine,
    string OwnerInitials,
    int Points,
    string Tag,
    string TagColour,
    EmailLink Button)
    : EmailModel(Shell);

/// <summary>The wrap-up reminder (L2-167 AC2, AC4): when it ends, the album so far, and "Add your photos".</summary>
public sealed record WrapUpEmailModel(
    EmailShellModel Shell,
    string Headline,
    string Body,
    IReadOnlyList<EmailPicture> Photos,
    string? SoFar,
    string? Yours,
    EmailLink Button)
    : EmailModel(Shell)
{
    public override IReadOnlyList<EmailPicture> Pictures => Photos;
}
