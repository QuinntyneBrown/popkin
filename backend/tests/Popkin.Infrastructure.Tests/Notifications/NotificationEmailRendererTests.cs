using System.Text.RegularExpressions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications.Emails;
using Popkin.Infrastructure.Notifications.Emails;

namespace Popkin.Infrastructure.Tests.Notifications;

/// <summary>The renderer of notification emails (ADR 0031, L2-163).</summary>
public sealed partial class NotificationEmailRendererTests
{
    private static readonly EmailShellModel Shell = new(
        "Walt replied to you in Lakeside Weekend",
        "Count me in",
        "Walt via Popkin",
        new PopkinHeader("Lakeside Weekend", "🏕️", "Teal"),
        "You’re getting this because you’re in Lakeside Weekend and asked for mentions and replies by email, as it happens.",
        new EmailLink("Mute Lakeside Weekend", "https://app.popkin.community/account/notifications?tab=popkins&mute=1"),
        "https://app.popkin.community/account/notifications?tab=types",
        "https://app.popkin.community/unsubscribe?t=abc",
        "Popkin Ltd · 4 Brewery Wharf, Leeds LS10 1JQ");

    private static PopkinUpdateEmailModel Reply(string text, params AlsoNewRow[] also) => new(
        Shell,
        new MessageLead(
            "Walt replied to you",
            new EmailLink("Reply in Popkin", "https://app.popkin.community/p/1/chat/everyone"),
            "Walt Brennan",
            text,
            "10:41",
            new QuotedMessage("Who’s up for the sunrise canoe?", "10:31")),
        also,
        10);

    private static Task<RenderedEmail> RenderAsync(EmailModel model)
    {
        var services = new ServiceCollection().AddLogging().BuildServiceProvider();
        return new NotificationEmailRenderer(services, NullLoggerFactory.Instance).RenderAsync(model, CancellationToken.None);
    }

    // A member's words with markup arrive encoded in the HTML and as written in the text (L2-163 AC7).
    [Fact]
    public async Task Members_words_are_encoded_in_the_HTML_and_kept_in_the_text()
    {
        var email = await RenderAsync(Reply("<script>alert(1)</script> & co"));

        Assert.DoesNotContain("<script>", email.Html);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt; &amp; co", email.Html);
        Assert.Contains("<script>alert(1)</script> & co", email.Text);
    }

    // The HTML says its language, and every image has alt text (L2-163 AC4).
    [Fact]
    public async Task The_HTML_has_its_language_and_every_image_its_alt()
    {
        var email = await RenderAsync(Reply("Count me in"));

        Assert.StartsWith("<!DOCTYPE html>", email.Html);
        Assert.Contains("<html lang=\"en\">", email.Html);
        Assert.All(ImageTags().Matches(email.Html), img => Assert.Contains("alt=", img.Value));
    }

    // The text part holds every link of the HTML part (L2-163 AC4).
    [Fact]
    public async Task The_text_holds_every_link_of_the_HTML()
    {
        var email = await RenderAsync(Reply("Count me in", new AlsoNewRow("Dev added 6 photos", "10:38")));

        var links = Hrefs().Matches(email.Html).Select(m => System.Net.WebUtility.HtmlDecode(m.Groups[1].Value)).ToList();
        Assert.Equal(4, links.Count);
        Assert.All(links, link => Assert.Contains(link, email.Text));
    }

    // The two Popkin reminders keep every link in their text part and give every photo its alt (L2-163 AC4, L2-167).
    [Fact]
    public async Task The_Popkin_reminders_keep_their_links_in_the_text()
    {
        var button = new EmailLink("Open the plan", "https://app.popkin.community/p/1/plan");
        var story = await RenderAsync(new StoryDueEmailModel(Shell, "Book the cabin", "Due tomorrow, Friday.", "GA", 3, "Stay", "Plum", button));
        var wrapUp = await RenderAsync(new WrapUpEmailModel(
            Shell,
            "Lakeside Weekend wraps up tomorrow at 6 pm",
            "After that the chat closes and the album becomes a keepsake. Photos you add now make the recap.",
            [new EmailPicture("photo-1", "thumbs/1.jpg", "The dock at dawn")],
            "48 photos so far from 11 people.",
            "You’ve added 14.",
            new EmailLink("Add your photos", "https://app.popkin.community/p/1/photos")));

        foreach (var email in new[] { story, wrapUp })
        {
            var links = Hrefs().Matches(email.Html).Select(m => System.Net.WebUtility.HtmlDecode(m.Groups[1].Value)).ToList();
            Assert.All(links, link => Assert.Contains(link, email.Text));
            Assert.All(ImageTags().Matches(email.Html), img => Assert.Contains("alt=", img.Value));
        }

        Assert.Contains("<strong>48 photos</strong> so far from 11 people. You’ve added 14.", wrapUp.Html.Replace("&#x2019;", "’"));
        Assert.Contains("Yours · 3 points · Stay", story.Text);
    }

    // A digest encodes members' words, keeps every link in its text and gives each photo its alt (L2-163, L2-165).
    [Fact]
    public async Task A_digest_encodes_its_lines_and_keeps_its_links()
    {
        var email = await RenderAsync(new DigestEmailModel(
            Shell with { Popkin = null },
            "Evening, Ruth",
            "Everything since 6 pm yesterday",
            "1 thing needs you",
            [new DigestNeed("Book the cabin", "Yours in Lakeside Weekend · due Fri 18 Sep")],
            [new DigestSection(
                new PopkinHeader("Lakeside Weekend", "🏕️", "Teal"),
                3,
                [new EmailPicture("photo-1", "thumbs/1.jpg", "The dock at dawn")],
                ["Joel: “<b>paddles</b> & oars”"],
                "and 2 messages in the chat",
                "https://app.popkin.community/p/1")],
            new EmailLink("Open Popkin", "https://app.popkin.community/popkins")));

        Assert.Contains("&lt;b&gt;paddles&lt;/b&gt; &amp; oars", email.Html);
        Assert.Contains("Joel: “<b>paddles</b> & oars”", email.Text);
        var links = Hrefs().Matches(email.Html).Select(m => System.Net.WebUtility.HtmlDecode(m.Groups[1].Value)).ToList();
        Assert.All(links, link => Assert.Contains(link, email.Text));
        Assert.All(ImageTags().Matches(email.Html), img => Assert.Contains("alt=", img.Value));
        Assert.Contains("Lakeside Weekend · 3 new", email.Text);
    }

    // The footer has the narrowest mute, settings and unsubscribe, in order, then the postal address (L2-163 AC5).
    [Fact]
    public async Task The_footer_has_its_three_links_in_order_and_the_address()
    {
        var email = await RenderAsync(Reply("Count me in"));

        var mute = email.Html.IndexOf(">Mute Lakeside Weekend<", StringComparison.Ordinal);
        var settings = email.Html.IndexOf(">Notification settings<", StringComparison.Ordinal);
        var unsubscribe = email.Html.IndexOf(">Unsubscribe from all email<", StringComparison.Ordinal);
        var address = email.Html.IndexOf("4 Brewery Wharf", StringComparison.Ordinal);
        Assert.True(mute > 0 && mute < settings && settings < unsubscribe && unsubscribe < address, email.Html);
        Assert.Contains("Popkin Ltd · 4 Brewery Wharf, Leeds LS10 1JQ", email.Text);
    }

    // With no other change there is no "Also new"; with one, it is listed (L2-164 AC1, AC6).
    [Fact]
    public async Task Also_new_is_shown_only_for_a_bundle()
    {
        var single = await RenderAsync(Reply("Count me in"));
        var bundle = await RenderAsync(Reply("Count me in", new AlsoNewRow("Dev added 6 photos", "10:38")));

        Assert.DoesNotContain("Also new", single.Html);
        Assert.Contains("Also new in the last 10 minutes", bundle.Html);
        Assert.Contains("- Dev added 6 photos · 10:38", bundle.Text);
    }

    // Each picture is carried inline under the id the HTML refers to, with alt text, and the
    // photos past the fifth are counted in a "+{n}" tile (L2-164 AC2).
    [Fact]
    public async Task The_inline_images_match_the_cid_references()
    {
        var photos = Enumerable.Range(1, 5).Select(i => new EmailPicture($"photo-{i}", $"key-{i}", $"Photo {i}")).ToList();
        var model = Reply("x") with
        {
            Lead = new PhotosLead("Dev added 6 photos to the album", new EmailLink("See the album", "https://app.popkin.community/p/1/photos"), "Dock at dawn", photos, 1),
        };

        var email = await RenderAsync(model);

        Assert.Equal(photos.Select(p => p.ContentId), email.InlineImages.Select(i => i.ContentId));
        Assert.All(email.InlineImages, image => Assert.Contains($"src=\"cid:{image.ContentId}\"", email.Html));
        Assert.Matches("email-photos__more[^>]*>(\\+|&#x2B;)1<", email.Html);
        Assert.All(ImageTags().Matches(email.Html), img => Assert.Contains("alt=\"Photo", img.Value));
    }

    [GeneratedRegex("<img[^>]*>")]
    private static partial Regex ImageTags();

    [GeneratedRegex("href=\"([^\"]+)\"")]
    private static partial Regex Hrefs();
}
