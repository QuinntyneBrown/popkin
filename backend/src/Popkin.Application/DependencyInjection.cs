using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Popkin.Application.Auth;
using Popkin.Application.Calls;
using Popkin.Application.Popkins;
using Popkin.Application.Realtime;
using Popkin.Application.Security;
using Popkin.Application.Telemetry;
using Popkin.Application.WrapUp;

namespace Popkin.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration? configuration = null)
    {
        services.AddMediatR(configuration =>
            configuration.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddScoped<CodeIssuer>();
        services.AddScoped<IMembershipGuard, MembershipGuard>();
        services.AddScoped<Contacts.Security.IContactGuard, Contacts.Security.ContactGuard>();
        services.AddScoped<Abstractions.IAdminGuard, Administration.AdminGuard>();
        services.AddScoped<Administration.IAuditLog, Administration.AuditLog>();
        services.AddSingleton<Administration.AdminRosterGate>();
        services.AddScoped<CallLeaver>();
        services.AddScoped<Members.MemberDepartures>();
        services.AddScoped<PopkinWrapUpService>();
        services.AddSingleton<CallDisconnectGrace>();
        services.AddSingleton<PopkinMetrics>();
        // Who is here now is kept in this process: one API instance (ADR 0009).
        services.AddSingleton<PresenceTracker>();
        services.AddSingleton(new InviteLinkBuilder(configuration?["Invites:BaseUrl"] ?? "https://popk.in/"));
        // ADR 0023: off unless the setting is true.
        services.AddSingleton(new SignInChannels(bool.TryParse(configuration?["Features:PhoneSignIn"], out var phone) && phone));
        services.AddSingleton(new Contacts.ContactsSwitch(bool.TryParse(configuration?["Features:Contacts"], out var contacts) && contacts));
        // ADR 0028: empty while no Web Push key is configured.
        services.AddSingleton(new Notifications.Devices.PushPublicKey(configuration?["Push:PublicKey"] ?? ""));
        // Every link in an email opens the web app (L2-163 AC6).
        services.AddSingleton(new Notifications.Emails.PopkinUrlBuilder(configuration?["App:Origin"] ?? "https://app.popkin.community"));
        services.AddSingleton<Notifications.Emails.NotificationLinks>();
        services.AddSingleton(new Notifications.Emails.NotificationEmailSettings(configuration?["Email:PostalAddress"] ?? ""));
        services.AddScoped<Notifications.Emails.PopkinUpdateEmailComposer>();
        services.AddScoped<Notifications.Emails.KeyDateReminderEmailComposer>();
        services.AddScoped<Notifications.Emails.StoryDueEmailComposer>();
        services.AddScoped<Notifications.Emails.WrapUpEmailComposer>();
        services.AddScoped<Notifications.Emails.DigestEmailComposer>();
        services.AddScoped<Notifications.Dispatch.UpdateEmails>();
        return services;
    }
}
