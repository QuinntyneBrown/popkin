using ImageMagick;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Application.Account;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Account;

/// <summary>
/// `PurgeDeletedAccountsCommand`, which the Worker sends every day, reached here through MediatR:
/// a deleted account's personal data is erased within 30 days (L2-049 AC4, L2-054).
/// </summary>
public sealed class PurgeDeletedAccountsTests
{
    // Given Mara, with an account photo and a message in Lakeside, who deleted her account,
    // and Walt, who did not,
    // when the erasure runs a day later,
    // then Mara's name, phone number and photo are gone, the photo's file too, and so are her
    // sessions and the codes sent to her number; her message stays; Walt is untouched;
    // and when it runs again, there is nothing left to erase.
    [Fact]
    public async Task A_deleted_accounts_personal_data_is_erased()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photo = new ByteArrayContent(TestPhotos.WithLocation(MagickFormat.Jpeg));
        photo.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        (await lakeside.Host.PutAsync("/api/account/photo", new MultipartFormDataContent { { photo, "photo", "me.jpg" } })).EnsureSuccessStatusCode();
        var thread = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await lakeside.Host.SentMessageAsync(lakeside.Id, thread, "Pancakes at 8:30");
        await api.SignedUpAsync("Walt Brennan", "(415) 555-0177");
        (await lakeside.Host.DeleteAsync("/api/account")).EnsureSuccessStatusCode();
        var messages = api.MessageCount();
        api.Clock.Advance(TimeSpan.FromDays(1));

        var erased = await api.SendAsync(new PurgeDeletedAccountsCommand());
        var again = await api.SendAsync(new PurgeDeletedAccountsCommand());

        Assert.Equal(1, erased);
        Assert.Equal(0, again);
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var mara = db.People.Single(p => p.Id == lakeside.HostPersonId);
        Assert.Equal("", mara.Name);
        Assert.Null(mara.Phone);
        Assert.Null(mara.Email);
        Assert.Null(mara.PhotoKey);
        Assert.Equal(api.Clock.GetUtcNow(), mara.ErasedAt);
        Assert.DoesNotContain(api.Photos.Files.Keys, k => k.StartsWith("avatars/", StringComparison.Ordinal));
        Assert.DoesNotContain(db.Sessions, s => s.PersonId == mara.Id);
        Assert.DoesNotContain(db.VerificationCodes, c => c.Destination == "+14155550148");
        Assert.Equal(messages, api.MessageCount());
        var waltPerson = db.People.Single(p => p.Name == "Walt Brennan");
        Assert.Equal("+14155550177", waltPerson.Phone);
        Assert.Contains(db.Sessions, s => s.PersonId == waltPerson.Id);
    }

    // Given Mara, who deleted her account, and someone who then signed up with her number,
    // when the erasure runs, then the new account and its code are untouched.
    [Fact]
    public async Task A_new_account_with_the_same_number_is_untouched()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        (await mara.DeleteAsync("/api/account")).EnsureSuccessStatusCode();
        api.Clock.Advance(TimeSpan.FromMinutes(11));
        await api.SignedUpAsync("Mara O.", "(415) 555-0148");

        await api.SendAsync(new PurgeDeletedAccountsCommand());

        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var again = db.People.Single(p => p.DeletedAt == null);
        Assert.Equal("+14155550148", again.Phone);
        Assert.Contains(db.Sessions, s => s.PersonId == again.Id);
        Assert.Contains(db.VerificationCodes, c => c.Destination == "+14155550148" && c.SentAt > db.People.Single(p => p.DeletedAt != null).DeletedAt);
    }
}
