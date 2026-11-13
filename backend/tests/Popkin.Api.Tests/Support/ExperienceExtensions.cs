using System.Net.Http.Json;
using System.Text.Json;

namespace Popkin.Api.Tests.Support;

public static class ExperienceExtensions
{
    /// <summary>The form an experience is shared or edited with; a null field is not sent.</summary>
    public static MultipartFormDataContent ExperienceForm(
        string? title = null, string? kind = null, string? when = null, string? place = null, byte[]? picture = null, bool? removePicture = null)
    {
        var form = new MultipartFormDataContent();
        void Add(string name, string? value)
        {
            if (value is not null)
            {
                form.Add(new StringContent(value), name);
            }
        }

        Add("title", title);
        Add("kind", kind);
        Add("when", when);
        Add("place", place);
        Add("removePicture", removePicture?.ToString().ToLowerInvariant());
        if (picture is not null)
        {
            var content = new ByteArrayContent(picture);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
            form.Add(content, "picture", "picture.jpg");
        }

        // A multipart body needs at least one part.
        if (!form.Any())
        {
            form.Add(new StringContent(""), "nothing");
        }

        return form;
    }

    public static Task<HttpResponseMessage> ShareExperienceAsync(
        this HttpClient member, Guid popkinId, string? title, string? kind = "Did", string? when = null, string? place = null, byte[]? picture = null) =>
        member.PostAsync($"/api/popkins/{popkinId}/experiences", ExperienceForm(title, kind, when, place, picture));

    /// <summary>Shares an experience that must be saved, and returns its card.</summary>
    public static async Task<JsonElement> SharedExperienceAsync(
        this HttpClient member, Guid popkinId, string title, string kind = "Did", string? when = null, string? place = null, byte[]? picture = null)
    {
        var response = await member.ShareExperienceAsync(popkinId, title, kind, when, place, picture);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static Task<HttpResponseMessage> EditExperienceAsync(
        this HttpClient member, Guid popkinId, Guid experienceId, string? title = null, string? kind = null, string? when = null, string? place = null,
        byte[]? picture = null, bool? removePicture = null) =>
        member.PatchAsync($"/api/popkins/{popkinId}/experiences/{experienceId}", ExperienceForm(title, kind, when, place, picture, removePicture));

    public static Task<JsonElement> ExperiencesAsync(this HttpClient member, Guid popkinId, string query = "") =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/experiences?{query}");

    public static Task<JsonElement> ExperienceAsync(this HttpClient member, Guid popkinId, Guid experienceId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/experiences/{experienceId}");

    public static Task<HttpResponseMessage> RateAsync(this HttpClient member, Guid popkinId, Guid experienceId, object? stars) =>
        member.PutAsJsonAsync($"/api/popkins/{popkinId}/experiences/{experienceId}/my-rating", new { stars });

    /// <summary>Rates an experience, which must be saved, and returns the answer.</summary>
    public static async Task<JsonElement> RatedAsync(this HttpClient member, Guid popkinId, Guid experienceId, int stars)
    {
        var response = await member.RateAsync(popkinId, experienceId, stars);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static Task<HttpResponseMessage> CommentAsync(this HttpClient member, Guid popkinId, Guid experienceId, string? text) =>
        member.PutAsJsonAsync($"/api/popkins/{popkinId}/experiences/{experienceId}/my-rating/comment", new { text });

    /// <summary>Comments on an experience; the comment must be saved, and is returned.</summary>
    public static async Task<JsonElement> CommentedAsync(this HttpClient member, Guid popkinId, Guid experienceId, string text)
    {
        var response = await member.CommentAsync(popkinId, experienceId, text);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static Guid Id(this JsonElement element) => element.GetProperty("id").GetGuid();

    public static List<string?> Titles(this JsonElement cards) =>
        cards.EnumerateArray().Select(c => c.GetProperty("title").GetString()).ToList();

    /// <summary>A person who signs up and joins through the invite code.</summary>
    public static async Task<HttpClient> JoinedAsync(this ApiFactory api, string code, string name, string phone)
    {
        var member = await api.SignedUpAsync(name, phone);
        (await member.JoinAsync(code, name)).EnsureSuccessStatusCode();
        return member;
    }
}
