// Acceptance Test
// Traces to: L2-178, L2-179
// Description: Quick Add saves a contact from a name alone, with a phone, who they are, a circle and a photo, over Add someone's endpoint.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

/// <summary>POST /api/contacts/people with Quick Add's fields only (L2-178, L2-179).</summary>
public sealed class QuickAddTests
{
    [Fact]
    public async Task Given_Quick_Adds_fields_and_a_photo_when_Mara_saves_Femi_then_he_is_kept_with_the_name_trimmed()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.AddContactAsync(
            new
            {
                clientId = Guid.NewGuid(),
                name = "  Femi Bankole ",
                phone = "+44 7700 900631",
                knownAs = "Grace’s fiancé",
                circle = "Friends",
                email = "",
                city = "",
                howWeMet = "",
                loves = Array.Empty<string>(),
            },
            TestPhotos.WithLocation(MagickFormat.Jpeg));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var femi = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Femi Bankole", femi.GetProperty("name").GetString());
        Assert.Equal("+44 7700 900631", femi.GetProperty("phone").GetString());
        Assert.Equal("Grace’s fiancé", femi.GetProperty("knownAs").GetString());
        Assert.Equal("Friends", femi.GetProperty("circle").GetString());
        Assert.Equal(JsonValueKind.Null, femi.GetProperty("email").ValueKind);
        Assert.NotNull(femi.GetProperty("photoUrl").GetString());
        Assert.Equal(1, await mara.ContactsCountAsync());
    }

    [Fact]
    public async Task Given_a_name_of_spaces_only_when_Mara_saves_from_Quick_Add_then_it_is_refused()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.AddContactAsync(new { clientId = Guid.NewGuid(), name = "   ", circle = "Friends" });

        await response.AssertProblem(HttpStatusCode.BadRequest, "contact_name_required");
        Assert.Equal(0, await mara.ContactsCountAsync());
    }
}
