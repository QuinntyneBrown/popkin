// Acceptance Test
// Traces to: L2-130, L2-128, L2-122
// Description: A contact is read and edited by its owner alone; anyone else's, or one that is not there, is not found.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

/// <summary>GET and PUT /api/contacts/people/{contactId}: a contact read and edited (L2-128, L2-130).</summary>
public sealed class EditContactTests
{
    [Fact]
    public async Task Given_Mara_keeps_Chidi_when_she_reads_him_then_his_profile_answers()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await mara.GetContactAsync(chidi);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(chidi, profile.GetProperty("id").GetGuid());
        Assert.Equal("Chidi", profile.GetProperty("firstName").GetString());
    }

    [Fact]
    public async Task Given_Mara_keeps_Chidi_when_Lena_reads_him_then_he_is_not_found_as_an_unknown_contact_is()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var foreign = await lena.GetContactAsync(chidi);
        var unknown = await lena.GetContactAsync(Guid.NewGuid());

        var refused = await foreign.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
        var missing = await unknown.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
        Assert.Equal(missing.GetProperty("title").GetString(), refused.GetProperty("title").GetString());
        Assert.DoesNotContain("Chidi", await foreign.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Given_Mara_keeps_Chidi_with_a_photo_when_she_edits_his_details_then_they_change_and_the_photo_is_kept()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var added = await (await mara.AddContactAsync(
            new { clientId = Guid.NewGuid(), name = "Chidi Okafor", circle = "Family", city = "Lagos", loves = new[] { "Jollof" } },
            TestPhotos.WithLocation(MagickFormat.Jpeg))).Content.ReadFromJsonAsync<JsonElement>();
        var chidi = added.GetProperty("id").GetGuid();

        var response = await mara.EditContactAsync(chidi, new
        {
            clientId = Guid.NewGuid(),
            name = " Chidi Okafor-Bello ",
            knownAs = "Brother",
            circle = "Family",
            email = "chidi@example.com",
            loves = new[] { "Jollof", "Highlife" },
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var edited = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(chidi, edited.GetProperty("id").GetGuid());
        Assert.Equal("Chidi Okafor-Bello", edited.GetProperty("name").GetString());
        Assert.Equal("Brother", edited.GetProperty("knownAs").GetString());
        Assert.Equal("chidi@example.com", edited.GetProperty("email").GetString());
        Assert.Equal(JsonValueKind.Null, edited.GetProperty("city").ValueKind);
        Assert.Equal(["Jollof", "Highlife"], edited.GetProperty("loves").EnumerateArray().Select(l => l.GetString()));
        Assert.NotEqual(JsonValueKind.Null, edited.GetProperty("photoUrl").ValueKind);
        Assert.Single(api.Photos.Files);
        var read = await (await mara.GetContactAsync(chidi)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Chidi Okafor-Bello", read.GetProperty("name").GetString());
        Assert.Equal(1, await mara.ContactsCountAsync());
    }

    [Fact]
    public async Task Given_no_name_when_Mara_saves_an_edit_then_it_is_refused_and_nothing_changes()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await mara.EditContactAsync(chidi, ContactsExtensions.Named(" "));

        await response.AssertProblem(HttpStatusCode.BadRequest, "contact_name_required");
        var read = await (await mara.GetContactAsync(chidi)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Chidi Okafor", read.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_Mara_keeps_Chidi_when_Lena_edits_him_then_he_is_not_found_and_nothing_changes()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await lena.EditContactAsync(chidi, ContactsExtensions.Named("Someone Else"));

        await response.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
        var read = await (await mara.GetContactAsync(chidi)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Chidi Okafor", read.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_Contacts_is_switched_off_when_Mara_reads_a_contact_then_it_is_not_found_as_off()
    {
        using var api = new ApiFactory();
        api.Settings["Features:Contacts"] = "false";
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.GetContactAsync(Guid.NewGuid());

        await response.AssertProblem(HttpStatusCode.NotFound, "feature_off");
    }

    [Fact]
    public async Task Given_Chidi_has_a_photo_when_Mara_saves_Edit_with_a_new_one_then_it_replaces_the_old()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var added = await (await mara.AddContactAsync(ContactsExtensions.Named("Chidi Okafor"), TestPhotos.WithLocation(MagickFormat.Jpeg)))
            .Content.ReadFromJsonAsync<JsonElement>();
        var chidi = added.GetProperty("id").GetGuid();
        var oldKey = Assert.Single(api.Photos.Files.Keys);

        var response = await mara.EditContactAsync(chidi, ContactsExtensions.Named("Chidi Okafor"), TestPhotos.WithLocation(MagickFormat.Png));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var newKey = Assert.Single(api.Photos.Files.Keys);
        Assert.NotEqual(oldKey, newKey);
        var edited = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.NotEqual(added.GetProperty("photoUrl").GetString(), edited.GetProperty("photoUrl").GetString());
    }
}
