using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// A message where only a line of text is shown: the Chat tab, the Chat card of the Popkin
/// home, My Popkins and the quote of a reply. A photo without text reads "Photo" (L2-026).
/// </summary>
public static class MessagePreview
{
    public const string PhotoText = "Photo";

    public static string TextOf(string text, Guid? photoId) => text.Length == 0 && photoId is not null ? PhotoText : text;

    public static string TextOf(Message message) => TextOf(message.Text, message.PhotoId);
}
