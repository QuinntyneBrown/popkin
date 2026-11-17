// Acceptance Test
// Traces to: L2-132, L2-122
// Description: Deleting a contact removes what was kept about them and nothing else.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Contacts;

/// <summary>DELETE /api/contacts/people/{contactId} (L2-132).</summary>
public sealed class DeleteContactTests
{
    // Given Mara keeps Chidi, with his photo, and Ada,
    // when she deletes Chidi,
    // then Chidi and his photo's file are gone, Ada stays, and reading Chidi is 404.
    [Fact]
    public async Task Deleting_a_contact_removes_them_and_their_photo_and_keeps_the_rest()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = await IdOf(await mara.AddContactAsync(
            ContactsExtensions.Named("Chidi Okafor"), TestPhotos.WithLocation(MagickFormat.Jpeg)));
        await mara.AddedContactAsync("Ada Okafor");
        Assert.Single(api.Photos.Files);

        var response = await mara.DeleteAsync($"/api/contacts/people/{chidi}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(api.Photos.Files);
        await (await mara.GetAsync($"/api/contacts/people/{chidi}"))
            .AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
        var people = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/people?on=2026-09-15");
        Assert.Equal(["Ada Okafor"], people.GetProperty("contacts").EnumerateArray().Select(c => c.GetProperty("name").GetString()));
    }

    // Given Lena's contact, when Mara deletes it, then it is 404 and Lena keeps it (L2-122).
    [Fact]
    public async Task Another_persons_contact_cannot_be_deleted()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var bea = await IdOf(await lena.AddContactAsync(ContactsExtensions.Named("Bea Lind")));

        var response = await mara.DeleteAsync($"/api/contacts/people/{bea}");

        await response.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
        Assert.Equal(HttpStatusCode.OK, (await lena.GetAsync($"/api/contacts/people/{bea}")).StatusCode);
    }

    // Given the save fails, when Mara deletes Chidi, then nothing is removed, his photo neither (L2-132 AC3).
    [Fact]
    public async Task A_failed_delete_removes_nothing()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = await IdOf(await mara.AddContactAsync(
            ContactsExtensions.Named("Chidi Okafor"), TestPhotos.WithLocation(MagickFormat.Jpeg)));
        api.Faults.FailSaves = true;

        var response = await mara.DeleteAsync($"/api/contacts/people/{chidi}");

        api.Faults.FailSaves = false;
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Single(api.Photos.Files);
        Assert.Equal(HttpStatusCode.OK, (await mara.GetAsync($"/api/contacts/people/{chidi}")).StatusCode);
    }

    // Given a photo file that cannot be deleted, when Mara deletes Chidi, then he is gone anyway.
    [Fact]
    public async Task A_file_left_behind_does_not_keep_the_contact()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = await IdOf(await mara.AddContactAsync(
            ContactsExtensions.Named("Chidi Okafor"), TestPhotos.WithLocation(MagickFormat.Jpeg)));
        api.Photos.FailDeletes = true;

        var response = await mara.DeleteAsync($"/api/contacts/people/{chidi}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        using var scope = api.Services.CreateScope();
        Assert.Empty(scope.ServiceProvider.GetRequiredService<AppDbContext>().Contacts);
    }

    private static async Task<Guid> IdOf(HttpResponseMessage added)
    {
        added.EnsureSuccessStatusCode();
        return (await added.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
}
