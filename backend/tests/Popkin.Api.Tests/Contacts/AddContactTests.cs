// Acceptance Test
// Traces to: L2-129, L2-122
// Description: Add someone keeps a contact for its owner alone, refuses one without a name, and saves a resend once.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

/// <summary>POST /api/contacts/people: Add someone (L2-129).</summary>
public sealed class AddContactTests
{
    [Fact]
    public async Task Given_Mara_when_she_adds_Femi_with_who_he_is_and_his_details_then_his_profile_answers_and_he_is_counted()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.AddContactAsync(new
        {
            clientId = Guid.NewGuid(),
            name = "  Femi Bankole ",
            knownAs = "Old colleague",
            circle = "Work",
            phone = "07700 900123",
            email = "femi@example.com",
            city = "Leeds",
            loves = new[] { "Jazz", "cycling" },
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var femi = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = femi.GetProperty("id").GetGuid();
        Assert.Equal($"/api/contacts/people/{id}", response.Headers.Location?.OriginalString);
        Assert.Equal("Femi Bankole", femi.GetProperty("name").GetString());
        Assert.Equal("Femi", femi.GetProperty("firstName").GetString());
        Assert.Equal("FB", femi.GetProperty("initials").GetString());
        Assert.Equal("Old colleague", femi.GetProperty("knownAs").GetString());
        Assert.Equal("Work", femi.GetProperty("circle").GetString());
        Assert.Equal("07700 900123", femi.GetProperty("phone").GetString());
        Assert.Equal("femi@example.com", femi.GetProperty("email").GetString());
        Assert.Equal("Leeds", femi.GetProperty("city").GetString());
        Assert.Equal(["Jazz", "cycling"], femi.GetProperty("loves").EnumerateArray().Select(l => l.GetString()));
        Assert.Equal(JsonValueKind.Null, femi.GetProperty("photoUrl").ValueKind);
        Assert.Equal(1, await mara.ContactsCountAsync());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Given_no_name_when_Mara_saves_then_it_is_refused_and_nothing_is_saved(string name)
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.AddContactAsync(ContactsExtensions.Named(name));

        await response.AssertProblem(HttpStatusCode.BadRequest, "contact_name_required");
        Assert.Equal(0, await mara.ContactsCountAsync());
    }

    [Fact]
    public async Task Given_a_save_already_made_when_it_is_sent_again_with_the_same_client_id_then_it_saves_once()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var clientId = Guid.NewGuid();
        var first = await (await mara.AddContactAsync(ContactsExtensions.Named("Femi Bankole", clientId))).Content.ReadFromJsonAsync<JsonElement>();

        var again = await mara.AddContactAsync(ContactsExtensions.Named("Femi Bankole", clientId));

        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
        var resent = await again.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(first.GetProperty("id").GetGuid(), resent.GetProperty("id").GetGuid());
        Assert.Equal(1, await mara.ContactsCountAsync());
    }

    [Fact]
    public async Task Given_Mara_keeps_Femi_when_Joel_asks_for_his_summary_then_Femi_is_not_counted()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var joel = await api.SignedUpAsync("Joel Fischer", "(415) 555-0123");
        await mara.AddedContactAsync("Femi Bankole");

        Assert.Equal(0, await joel.ContactsCountAsync());
    }

    [Fact]
    public async Task Given_a_circle_that_is_not_one_of_the_five_when_Mara_saves_then_it_is_refused()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.AddContactAsync(new { clientId = Guid.NewGuid(), name = "Femi Bankole", circle = "Rivals", loves = Array.Empty<string>() });

        await response.AssertProblem(HttpStatusCode.BadRequest, "contact_circle_not_allowed");
    }

    [Fact]
    public async Task Given_Contacts_is_switched_off_when_Mara_adds_someone_then_it_is_not_found_as_off()
    {
        using var api = new ApiFactory();
        api.Settings["Features:Contacts"] = "false";
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.AddContactAsync(ContactsExtensions.Named("Femi Bankole"));

        await response.AssertProblem(HttpStatusCode.NotFound, "feature_off");
    }

    [Fact]
    public async Task Given_a_photo_when_Mara_adds_Femi_with_it_then_his_profile_shows_it_without_its_location()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.AddContactAsync(ContactsExtensions.Named("Femi Bankole"), TestPhotos.WithLocation(MagickFormat.Jpeg, 3000, 2000));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var photoUrl = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("photoUrl").GetString()!;
        var file = await api.CreateBrowserClient().GetAsync(photoUrl);
        using var stored = new MagickImage(await file.Content.ReadAsByteArrayAsync());
        Assert.Null(stored.GetExifProfile());
        Assert.Equal(512u, stored.Width);
    }

    [Fact]
    public async Task Given_a_file_that_is_not_an_image_when_Mara_adds_Femi_with_it_then_it_is_refused_and_nothing_is_kept()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.AddContactAsync(ContactsExtensions.Named("Femi Bankole"), "not a photo at all"u8.ToArray());

        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, "photo_type_not_allowed");
        Assert.Equal("photo", problem.GetProperty("field").GetString());
        Assert.Empty(api.Photos.Files);
        Assert.Equal(0, await mara.ContactsCountAsync());
    }

    [Fact]
    public async Task Given_the_save_fails_when_Mara_adds_Femi_with_a_photo_then_the_photo_is_not_kept()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        api.Faults.FailSaves = true;

        var response = await mara.AddContactAsync(ContactsExtensions.Named("Femi Bankole"), TestPhotos.WithLocation(MagickFormat.Jpeg));

        api.Faults.FailSaves = false;
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Empty(api.Photos.Files);
        Assert.Equal(0, await mara.ContactsCountAsync());
    }
}
