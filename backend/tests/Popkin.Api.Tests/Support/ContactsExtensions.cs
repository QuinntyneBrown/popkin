using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Popkin.Api.Tests.Support;

public static class ContactsExtensions
{
    /// <summary>
    /// The form Add someone and Edit send: the part `contact` holds the request as JSON, and the
    /// optional part `photo` one image.
    /// </summary>
    public static MultipartFormDataContent ContactForm(object contact, byte[]? photo = null)
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent(JsonSerializer.Serialize(contact), System.Text.Encoding.UTF8, "application/json"), "contact" },
        };
        if (photo is not null)
        {
            var content = new ByteArrayContent(photo);
            content.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            form.Add(content, "photo", "photo.jpg");
        }

        return form;
    }

    /// <summary>A contact with a name only, sent under a new client id unless one is given.</summary>
    public static object Named(string name, Guid? clientId = null) =>
        new { clientId = clientId ?? Guid.NewGuid(), name, loves = Array.Empty<string>() };

    public static Task<HttpResponseMessage> AddContactAsync(this HttpClient owner, object contact, byte[]? photo = null) =>
        owner.PostAsync("/api/contacts/people", ContactForm(contact, photo));

    /// <summary>Adds a contact that must be saved, and returns its profile.</summary>
    public static async Task<JsonElement> AddedContactAsync(this HttpClient owner, string name)
    {
        var response = await owner.AddContactAsync(Named(name));
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static async Task<int> ContactsCountAsync(this HttpClient owner) =>
        (await owner.GetFromJsonAsync<JsonElement>("/api/contacts/summary")).GetProperty("people").GetInt32();
}
