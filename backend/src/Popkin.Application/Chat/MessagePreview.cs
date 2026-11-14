using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// A message where only a line of text is shown: the Chat tab, the Chat card of the Popkin
/// home, My Popkins and the quote of a reply. A photo without text reads "Photo" (L2-026), and
/// one whose photo was removed "Photo removed" (L2-036 AC3).
/// </summary>
public static class MessagePreview
{
    public const string PhotoText = "Photo";

    public const string PhotoRemovedText = "Photo removed";

    public static string TextOf(string text, Guid? photoId, bool photoRemoved = false) =>
        text.Length > 0 ? text
        : photoId is not null ? PhotoText
        : photoRemoved ? PhotoRemovedText
        : text;

    public static string TextOf(Message message) => TextOf(message.Text, message.PhotoId, message.PhotoRemoved);
}
