using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications.Emails;

namespace Popkin.Infrastructure.Notifications.Emails;

/// <summary>
/// Renders an email's model with its Razor components (ADR 0031): the HTML part from one, the
/// plain-text part from a text-only rendering of the same model, so the two never disagree. No
/// model value is ever written as markup.
/// </summary>
public sealed partial class NotificationEmailRenderer(IServiceProvider services, ILoggerFactory loggers) : INotificationEmailRenderer
{
    public async Task<RenderedEmail> RenderAsync(EmailModel model, CancellationToken cancellationToken)
    {
        var (html, text) = model switch
        {
            PopkinUpdateEmailModel => (typeof(PopkinUpdateEmail), typeof(PopkinUpdateEmailText)),
            KeyDateReminderEmailModel => (typeof(KeyDateReminderEmail), typeof(KeyDateReminderEmailText)),
            StoryDueEmailModel => (typeof(StoryDueEmail), typeof(StoryDueEmailText)),
            WrapUpEmailModel => (typeof(WrapUpEmail), typeof(WrapUpEmailText)),
            DigestEmailModel => (typeof(DigestEmail), typeof(DigestEmailText)),
            _ => throw new ArgumentOutOfRangeException(nameof(model), model.GetType().Name, "No template for this email."),
        };
        var parameters = ParameterView.FromDictionary(new Dictionary<string, object?> { ["Model"] = model });
        await using var renderer = new HtmlRenderer(services, loggers);
        var (htmlPart, textPart) = await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var h = await renderer.RenderComponentAsync(html, parameters);
            var t = await renderer.RenderComponentAsync(text, parameters);
            return (h.ToHtmlString(), t.ToHtmlString());
        });
        var pictures = model.Pictures.Select(p => new InlineImage(p.ContentId, p.BlobKey, "image/jpeg")).ToList();
        return new RenderedEmail(model.Shell.Subject, "<!DOCTYPE html>\n" + htmlPart, Text(textPart), pictures);
    }

    /// <summary>The text part as written: Razor's encoding undone, the blank lines kept to one.</summary>
    private static string Text(string rendered) =>
        ExtraBlankLines().Replace(WebUtility.HtmlDecode(rendered).Replace("\r\n", "\n"), "\n\n").Trim() + "\n";

    [GeneratedRegex(@"\n[ \t]*\n(\s*\n)+")]
    private static partial Regex ExtraBlankLines();
}
