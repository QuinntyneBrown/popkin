using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Experiences;

/// <summary>
/// PUT /api/popkins/{popkinId}/experiences/{experienceId}/my-rating: a member gives an experience
/// one rating from one to five stars (L2-039, L2-045 AC2, L2-051). Every case of the average is
/// in `ExperienceScoreTests`.
/// </summary>
public sealed class RateExperienceTests
{
    // Given something the group did that nobody has rated,
    // when a member gives it four stars,
    // then 200 answers their stars and the group's score: 4.0 from one rating, counted under four stars;
    // the experience then shows their rating and that score, and so does its card (L2-039 AC2, L2-037 AC2).
    [Fact]
    public async Task A_member_rates_an_experience()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();

        var response = await lakeside.Host.RateAsync(lakeside.Id, id, 4);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var rated = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(4, rated.GetProperty("stars").GetInt32());
        Assert.Equal((4.0, 1, "0,1,0,0,0"), Score(rated.GetProperty("score")));
        Assert.Equal(["score", "stars"], rated.EnumerateObject().Select(p => p.Name).Order());
        var detail = await lakeside.Host.ExperienceAsync(lakeside.Id, id);
        Assert.Equal((4.0, 1, "0,1,0,0,0"), Score(detail.GetProperty("score")));
        Assert.Equal(4.0, detail.GetProperty("average").GetDouble());
        Assert.Equal(1, detail.GetProperty("ratingCount").GetInt32());
        Assert.Equal(4, detail.GetProperty("myRating").GetProperty("stars").GetInt32());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("myRating").GetProperty("comment").ValueKind);
        Assert.Equal(["comment", "stars"], detail.GetProperty("myRating").EnumerateObject().Select(p => p.Name).Order());
        var card = (await lakeside.Host.ExperiencesAsync(lakeside.Id))[0];
        Assert.Equal(4.0, card.GetProperty("average").GetDouble());
        Assert.Equal(1, card.GetProperty("ratingCount").GetInt32());
    }

    // Given Mara gave five stars and Joel four,
    // when Dev gives four,
    // then the score is 4.3 from three ratings, one under five stars and two under four;
    // Dev sees their own rating, and the card of another experience still has none.
    [Fact]
    public async Task The_score_is_the_average_of_every_members_rating()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var dev = await api.JoinedAsync(lakeside.Code, "Dev Patel", "(415) 555-0124");
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await lakeside.Host.SharedExperienceAsync(lakeside.Id, "La Paloma Taqueria", "Restaurant");
        await lakeside.Host.RatedAsync(lakeside.Id, id, 5);
        await joel.RatedAsync(lakeside.Id, id, 4);

        var rated = await dev.RatedAsync(lakeside.Id, id, 4);

        Assert.Equal((4.3, 3, "1,2,0,0,0"), Score(rated.GetProperty("score")));
        Assert.Equal(4, (await dev.ExperienceAsync(lakeside.Id, id)).GetProperty("myRating").GetProperty("stars").GetInt32());
        Assert.Equal(5, (await lakeside.Host.ExperienceAsync(lakeside.Id, id)).GetProperty("myRating").GetProperty("stars").GetInt32());
        var cards = await dev.ExperiencesAsync(lakeside.Id);
        Assert.Equal(JsonValueKind.Null, cards[0].GetProperty("average").ValueKind);
        Assert.Equal(0, cards[0].GetProperty("ratingCount").GetInt32());
        Assert.Equal((4.3, 3), (cards[1].GetProperty("average").GetDouble(), cards[1].GetProperty("ratingCount").GetInt32()));
    }

    // Given a member who gave a restaurant two stars,
    // when they choose five, and then five again,
    // then their rating changes and the count stays at one (L2-039 AC3).
    [Fact]
    public async Task Choosing_another_star_changes_the_rating_and_not_the_count()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "La Paloma Taqueria", "Restaurant")).Id();
        await lakeside.Host.RatedAsync(lakeside.Id, id, 2);

        var changed = await lakeside.Host.RatedAsync(lakeside.Id, id, 5);
        var repeated = await lakeside.Host.RatedAsync(lakeside.Id, id, 5);

        Assert.Equal(5, changed.GetProperty("stars").GetInt32());
        Assert.Equal((5.0, 1, "1,0,0,0,0"), Score(changed.GetProperty("score")));
        Assert.Equal((5.0, 1, "1,0,0,0,0"), Score(repeated.GetProperty("score")));
    }

    public static TheoryData<string> BadStars => ["""{"stars":0}""", """{"stars":6}""", """{"stars":-1}""", """{"stars":null}""", "{}", """{"stars":4.5}""", """{"stars":"five"}"""];

    // Given a value outside one to five, or none, or one that is not a whole number,
    // when a member rates with it, then 400 stars_out_of_range names the stars, and nothing is saved (L2-039 AC6).
    [Theory]
    [MemberData(nameof(BadStars))]
    public async Task Stars_outside_one_to_five_are_refused(string body)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();

        var response = await lakeside.Host.PutAsync(
            $"/api/popkins/{lakeside.Id}/experiences/{id}/my-rating", new StringContent(body, System.Text.Encoding.UTF8, "application/json"));

        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, "stars_out_of_range");
        Assert.Equal("stars", problem.GetProperty("field").GetString());
        Assert.Equal(0, RatingCount(api));
    }

    // Given a signed-in person who is not a member, or no session,
    // when they rate an experience, then 404 popkin_not_found, or 401;
    // given a member, when they rate an experience that is not in the Popkin, then 404 experience_not_found;
    // and nothing is saved (L2-039 AC6, L2-051).
    [Fact]
    public async Task Only_a_member_rates_an_experience_of_their_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.RateAsync(lakeside.Id, id, 5)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await lakeside.Host.RateAsync(lakeside.Id, Guid.NewGuid(), 5)).AssertProblem(HttpStatusCode.NotFound, "experience_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().RateAsync(lakeside.Id, id, 5)).StatusCode);
        Assert.Equal(0, RatingCount(api));
    }

    // Given something the group wants to do,
    // when a member rates it, then 409 experience_not_rateable;
    // given a wrapped-up Popkin, when a member rates what the group did, then 409 popkin_wrapped_up (L2-045 AC2).
    [Fact]
    public async Task A_want_and_a_wrapped_up_Popkin_take_no_rating()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var want = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Stargazing", "Want")).Id();
        var did = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();

        await (await lakeside.Host.RateAsync(lakeside.Id, want, 5)).AssertProblem(HttpStatusCode.Conflict, "experience_not_rateable");
        await api.WrapUpAsync(lakeside.Id);
        await (await lakeside.Host.RateAsync(lakeside.Id, did, 5)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal(0, RatingCount(api));
    }

    // Given two requests of one member to rate an experience for the first time race,
    // when the second loses on the key of one rating per member and experience,
    // then it changes the rating that won, and the member still has one rating.
    [Fact]
    public async Task Two_first_ratings_that_race_leave_one_rating()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        api.Faults.LoseNextSaveTo = async () =>
        {
            using var scope = api.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var experience = db.Experiences.Single(e => e.Id == id);
            db.ExperienceRatings.Add(experience.Rate(experience.SharerMembershipId, 2, api.Clock.GetUtcNow()));
            await db.SaveChangesAsync();
        };

        var rated = await lakeside.Host.RatedAsync(lakeside.Id, id, 5);

        Assert.Equal(5, rated.GetProperty("stars").GetInt32());
        Assert.Equal((5.0, 1, "1,0,0,0,0"), Score(rated.GetProperty("score")));
        Assert.Equal(1, RatingCount(api));
    }

    /// <summary>A score as its average, its number of ratings and its counts from five stars to one.</summary>
    internal static (double? Average, int RatingCount, string Counts) Score(JsonElement score)
    {
        var counts = score.GetProperty("counts").EnumerateArray().ToList();
        Assert.Equal([5, 4, 3, 2, 1], counts.Select(c => c.GetProperty("stars").GetInt32()));
        return (
            score.GetProperty("average").ValueKind == JsonValueKind.Null ? null : score.GetProperty("average").GetDouble(),
            score.GetProperty("ratingCount").GetInt32(),
            string.Join(',', counts.Select(c => c.GetProperty("count").GetInt32())));
    }

    internal static int RatingCount(ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().ExperienceRatings.Count();
    }
}
