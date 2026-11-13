using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

public static class ApiExtensions
{
    /// <summary>Every verification code in the store, read through a fresh context.</summary>
    public static List<VerificationCode> StoredCodes(this ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().VerificationCodes.ToList();
    }

    /// <summary>Requests a sign-up code and returns the verification id.</summary>
    public static async Task<Guid> RequestCodeAsync(this HttpClient client, string destination, string channel = "Phone", string purpose = "SignUp")
    {
        var response = await client.PostAsJsonAsync("/api/auth/codes", new { purpose, channel, destination });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("verificationId").GetGuid();
    }

    /// <summary>Signs up end to end: requests a code, then confirms it with a name.</summary>
    public static async Task SignUpAsync(this HttpClient client, ApiFactory api, string name, string phone)
    {
        var verificationId = await client.RequestCodeAsync(phone);
        var code = api.Codes.Sent.Last().Code;
        var response = await client.PostAsJsonAsync($"/api/auth/codes/{verificationId}/confirm", new { code, name });
        response.EnsureSuccessStatusCode();
    }

    /// <summary>A new person, signed up and signed in.</summary>
    public static async Task<HttpClient> SignedUpAsync(this ApiFactory api, string name, string phone)
    {
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, name, phone);
        return client;
    }

    /// <summary>Mara signs up and starts Lakeside Weekend, Teal, for the weekend (the cast of the mocks).</summary>
    public static async Task<StartedPopkin> StartLakesideAsync(this ApiFactory api, string length = "TheWeekend")
    {
        var host = api.CreateBrowserClient();
        await host.SignUpAsync(api, "Mara Okafor", "(415) 555-0148");
        var endsAt = length == "KeepItGoing" ? (DateTimeOffset?)null : api.Clock.GetUtcNow().AddDays(1);
        var response = await host.PostAsJsonAsync("/api/popkins", new { name = "Lakeside Weekend", emoji = "🏕️", colour = "Teal", length, endsAt });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = body.GetProperty("id").GetGuid();
        using var scope = api.Services.CreateScope();
        var hostPersonId = scope.ServiceProvider.GetRequiredService<AppDbContext>().Popkins.Single(p => p.Id == id).HostPersonId;
        return new StartedPopkin(id, body.GetProperty("inviteCode").GetString()!, endsAt, hostPersonId, host);
    }

    /// <summary>Joins through an invite code with a name and, when given, a photo file.</summary>
    public static Task<HttpResponseMessage> JoinAsync(this HttpClient client, string code, string displayName, byte[]? photo = null, string fileName = "me.jpg", string contentType = "image/jpeg")
    {
        var form = new MultipartFormDataContent { { new StringContent(displayName), "displayName" } };
        if (photo is not null)
        {
            var file = new ByteArrayContent(photo);
            file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
            form.Add(file, "photo", fileName);
        }

        return client.PostAsync($"/api/invites/{code}/join", form);
    }

    /// <summary>
    /// Adds members straight to the store, a minute apart, for a cast larger than one address may
    /// sign up within ten minutes (L2-053 AC1).
    /// </summary>
    public static async Task AddMembersAsync(this ApiFactory api, Guid popkinId, params string[] names)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var popkin = db.Popkins.Single(p => p.Id == popkinId);
        var host = db.Memberships.Single(m => m.PopkinId == popkinId && m.Role == MembershipRole.Host);
        foreach (var name in names)
        {
            api.Clock.Advance(TimeSpan.FromMinutes(1));
            var person = Person.Create(name, ContactChannel.Email, $"{Guid.NewGuid():N}@example.com", api.Clock.GetUtcNow());
            db.People.Add(person);
            db.Memberships.Add(popkin.Join(person.Id, name, host.Id, api.Clock.GetUtcNow()));
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Marks a member as having left now, straight in the store: leaving a Popkin is journey 16,
    /// and until then the domain has no way to do it.
    /// </summary>
    public static async Task LeaveAsync(this ApiFactory api, Guid popkinId, string displayName)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var membership = db.Memberships.Single(m => m.PopkinId == popkinId && m.DisplayName == displayName);
        db.Entry(membership).Property(m => m.LeftAt).CurrentValue = api.Clock.GetUtcNow();
        await db.SaveChangesAsync();
    }

    public static int MembershipCount(this ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().Memberships.Count();
    }

    /// <summary>Wraps a Popkin up now, as the Host or the clock will (journey 9).</summary>
    public static async Task WrapUpAsync(this ApiFactory api, Guid popkinId)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Popkins.Single(p => p.Id == popkinId).WrapUp(api.Clock.GetUtcNow());
        await db.SaveChangesAsync();
    }
}

/// <summary>A Popkin a test started, with its Host's signed-in client.</summary>
public sealed record StartedPopkin(Guid Id, string Code, DateTimeOffset? EndsAt, Guid HostPersonId, HttpClient Host);
