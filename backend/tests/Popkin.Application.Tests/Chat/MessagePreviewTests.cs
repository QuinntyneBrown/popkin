using Popkin.Application.Chat;

namespace Popkin.Application.Tests.Chat;

/// <summary>A message as a preview or a quote reads it: a photo without text reads "Photo" (L2-026).</summary>
public sealed class MessagePreviewTests
{
    [Theory]
    [InlineData("", true, "Photo")]
    [InlineData("Dock was glass this morning", true, "Dock was glass this morning")]
    [InlineData("Who's bringing the firewood?", false, "Who's bringing the firewood?")]
    [InlineData("", false, "")]
    public void A_preview_reads_the_text_or_Photo(string text, bool hasPhoto, string preview) =>
        Assert.Equal(preview, MessagePreview.TextOf(text, hasPhoto ? Guid.NewGuid() : null));
}
