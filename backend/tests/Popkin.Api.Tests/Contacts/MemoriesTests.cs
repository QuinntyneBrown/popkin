// Acceptance Test
// Traces to: L2-136, L2-135 AC1, L2-132, L2-122, known gap 107 (ruled)
// Description: Photos, files and notes are kept about a contact, listed on their Memories & files
// tab, and a photo is on their timeline.
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

public sealed class MemoriesTests
{
    private static MultipartFormDataContent Upload(byte[] bytes, string fileName, string contentType, Guid clientId, params (string Name, string Value)[] fields)
    {
        var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(content, "file", fileName);
        form.Add(new StringContent(clientId.ToString()), "clientId");
        foreach (var (name, value) in fields)
        {
            form.Add(new StringContent(value), name);
        }

        return form;
    }

    private static async Task<(ApiFactory Api, HttpClient Mara, Guid Chidi)> ChidiAsync()
    {
        var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        return (api, mara, chidi);
    }

    private static Task<JsonElement> MemoriesAsync(HttpClient owner, Guid contact) =>
        owner.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{contact}/memories");

    // Given Mara keeps Chidi, when she adds a photo captioned "Hot sauce night", then it is listed
    // with its caption, its day and its addresses, and it is on his timeline (L2-136 AC2, L2-135 AC1).
    [Fact]
    public async Task A_photo_is_kept_with_its_caption_and_is_on_the_timeline()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;

        var response = await mara.PostAsync($"/api/contacts/people/{chidi}/memories/photos", Upload(
            TestPhotos.WithLocation(MagickFormat.Jpeg), "IMG_4471.jpg", "image/jpeg", Guid.NewGuid(),
            ("caption", " Hot sauce night "), ("takenOn", "2026-08-08")));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var photo = Assert.Single((await MemoriesAsync(mara, chidi)).GetProperty("photos").EnumerateArray());
        Assert.Equal("Hot sauce night", photo.GetProperty("caption").GetString());
        Assert.Equal("2026-08-08", photo.GetProperty("day").GetString());
        Assert.False(string.IsNullOrEmpty(photo.GetProperty("thumbnailUrl").GetString()));
        Assert.False(string.IsNullOrEmpty(photo.GetProperty("photoUrl").GetString()));
        Assert.Equal(2, api.Photos.Files.Count);
        var timeline = await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{chidi}/timeline?show=all");
        var memory = Assert.Single(timeline.GetProperty("entries").EnumerateArray());
        Assert.Equal("Memory", memory.GetProperty("kind").GetString());
        Assert.Equal("Hot sauce night", memory.GetProperty("title").GetString());
        Assert.Equal("2026-08-08", memory.GetProperty("day").GetString());
        Assert.False(string.IsNullOrEmpty(memory.GetProperty("photoUrl").GetString()));
    }

    // Given a photo over 25 MB, when it is added, then it is refused and nothing is kept (L2-136 AC3).
    [Fact]
    public async Task A_photo_over_25_MB_is_refused()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;
        var photo = TestPhotos.WithLocation(MagickFormat.Jpeg);
        var large = photo.Concat(new byte[(25 * 1024 * 1024) + 1 - photo.Length]).ToArray();

        var response = await mara.PostAsync($"/api/contacts/people/{chidi}/memories/photos", Upload(large, "big.jpg", "image/jpeg", Guid.NewGuid()));

        await response.AssertProblem(HttpStatusCode.BadRequest, "photo_too_large");
        Assert.Empty(api.Photos.Files);
    }

    // Given text called a photo, when it is added as a photo, then it is refused (L2-052 AC3).
    [Fact]
    public async Task Something_that_is_not_a_photo_is_refused_as_one()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;

        var response = await mara.PostAsync($"/api/contacts/people/{chidi}/memories/photos",
            Upload("not a photo"u8.ToArray(), "photo.jpg", "image/jpeg", Guid.NewGuid()));

        await response.AssertProblem(HttpStatusCode.BadRequest, "photo_type_not_allowed");
    }

    // Given the same photo sent twice, when the second arrives, then it is kept once (L2-124).
    [Fact]
    public async Task A_resend_keeps_one_photo()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;
        var clientId = Guid.NewGuid();
        var bytes = TestPhotos.WithLocation(MagickFormat.Jpeg);

        await mara.PostAsync($"/api/contacts/people/{chidi}/memories/photos", Upload(bytes, "a.jpg", "image/jpeg", clientId));
        var again = await mara.PostAsync($"/api/contacts/people/{chidi}/memories/photos", Upload(bytes, "a.jpg", "image/jpeg", clientId));

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Single((await MemoriesAsync(mara, chidi)).GetProperty("photos").EnumerateArray());
        Assert.Equal(2, api.Photos.Files.Count);
    }

    // Given the save fails, when a photo is added, then no file is left (L2-136).
    [Fact]
    public async Task A_failed_save_leaves_no_file()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;
        api.Faults.FailSaves = true;

        var response = await mara.PostAsync($"/api/contacts/people/{chidi}/memories/photos",
            Upload(TestPhotos.WithLocation(MagickFormat.Jpeg), "a.jpg", "image/jpeg", Guid.NewGuid()));

        api.Faults.FailSaves = false;
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Empty(api.Photos.Files);
    }

    // Given a PDF, when Mara adds it as a file, then it is listed with its name, size and a
    // download address (gap 107, ruled).
    [Fact]
    public async Task A_file_is_kept_as_it_is()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;
        var pdf = "%PDF-1.7\n% the wedding speech\n"u8.ToArray();

        var response = await mara.PostAsync($"/api/contacts/people/{chidi}/memories/files",
            Upload(pdf, "Wedding speech.pdf", "application/pdf", Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var file = Assert.Single((await MemoriesAsync(mara, chidi)).GetProperty("files").EnumerateArray());
        Assert.Equal("Wedding speech.pdf", file.GetProperty("fileName").GetString());
        Assert.Equal(pdf.Length, file.GetProperty("sizeBytes").GetInt64());
        Assert.False(string.IsNullOrEmpty(file.GetProperty("downloadUrl").GetString()));
        Assert.Single(api.Photos.Files);
    }

    // Given a program, when it is added as a file, then it is refused (gap 107, ruled).
    [Fact]
    public async Task A_file_of_another_kind_is_refused()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;

        var response = await mara.PostAsync($"/api/contacts/people/{chidi}/memories/files",
            Upload([0x4D, 0x5A, 0x90, 0x00, 0x03], "setup.exe", "application/octet-stream", Guid.NewGuid()));

        await response.AssertProblem(HttpStatusCode.BadRequest, "file_type_not_allowed");
        Assert.Empty(api.Photos.Files);
    }

    // Given gift ideas, when Mara keeps them as a note, then the note is listed with its day; an
    // empty note is refused (gap 107, ruled).
    [Fact]
    public async Task A_note_is_kept_and_needs_words()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;

        var kept = await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/memories/notes", new
        {
            clientId = Guid.NewGuid(),
            text = "Gift ideas: Fela reissue on vinyl, Dishoom cookbook, bike lights",
        });
        var empty = await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/memories/notes", new
        {
            clientId = Guid.NewGuid(),
            text = "  ",
        });

        Assert.Equal(HttpStatusCode.Created, kept.StatusCode);
        await empty.AssertProblem(HttpStatusCode.BadRequest, "note_required");
        var note = Assert.Single((await MemoriesAsync(mara, chidi)).GetProperty("notes").EnumerateArray());
        Assert.Equal("Gift ideas: Fela reissue on vinyl, Dishoom cookbook, bike lights", note.GetProperty("text").GetString());
        Assert.False(string.IsNullOrEmpty(note.GetProperty("updatedOn").GetString()));
    }

    // Given Lena's contact, when Mara reads or adds their memories, then it is 404 (L2-122).
    [Fact]
    public async Task Another_persons_contact_has_no_memories_for_you()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var bea = (await lena.AddedContactAsync("Bea Lind")).GetProperty("id").GetGuid();

        var read = await mara.GetAsync($"/api/contacts/people/{bea}/memories");
        var note = await mara.PostAsJsonAsync($"/api/contacts/people/{bea}/memories/notes", new { clientId = Guid.NewGuid(), text = "Hi" });

        await read.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
        await note.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
    }

    // Given Chidi's photo and file, when he is deleted, then their files go with him (L2-132).
    [Fact]
    public async Task Deleting_a_contact_deletes_their_memories_files()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;
        await mara.PostAsync($"/api/contacts/people/{chidi}/memories/photos",
            Upload(TestPhotos.WithLocation(MagickFormat.Jpeg), "a.jpg", "image/jpeg", Guid.NewGuid()));
        await mara.PostAsync($"/api/contacts/people/{chidi}/memories/files",
            Upload("%PDF-1.7\n"u8.ToArray(), "a.pdf", "application/pdf", Guid.NewGuid()));

        (await mara.DeleteAsync($"/api/contacts/people/{chidi}")).EnsureSuccessStatusCode();

        Assert.Empty(api.Photos.Files);
    }

    // Given Chidi with a conversation, a photo and a note, when his profile opens, then it counts
    // what Delete would remove with him (L2-132 AC1).
    [Fact]
    public async Task The_profile_counts_what_goes_with_the_contact()
    {
        var (api, mara, chidi) = await ChidiAsync();
        using var _ = api;
        (await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/conversations", new
        {
            clientId = Guid.NewGuid(),
            channel = "Phone",
            loggedAt = "2026-09-15T08:40:00-07:00",
            note = "First week at Arup",
        })).EnsureSuccessStatusCode();
        (await mara.PostAsync($"/api/contacts/people/{chidi}/memories/photos",
            Upload(TestPhotos.WithLocation(MagickFormat.Jpeg), "a.jpg", "image/jpeg", Guid.NewGuid()))).EnsureSuccessStatusCode();
        (await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/memories/notes", new { clientId = Guid.NewGuid(), text = "Gift ideas" }))
            .EnsureSuccessStatusCode();

        var profile = await (await mara.GetContactAsync(chidi)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(1, profile.GetProperty("kept").GetProperty("timelineEntries").GetInt32());
        Assert.Equal(2, profile.GetProperty("kept").GetProperty("memories").GetInt32());
    }
}
