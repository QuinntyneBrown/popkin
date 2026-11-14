using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Popkin.Api.Auth;
using Popkin.Api.Hubs;
using Popkin.Api.Problems;
using Popkin.Api.RateLimiting;
using Popkin.Api.Security;
using Popkin.Application;
using Popkin.Application.Abstractions;
using Popkin.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);
builder.Services
    .AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
    .ConfigureApiBehaviorOptions(options =>
    {
        // A field that breaks its rule (type, length, allowed values) is 400 with a `code` and
        // the field it names (L2-052 AC1).
        options.InvalidModelStateResponseFactory = context =>
        {
            // A body over the action's limit is 413, whether the server or the form reader stopped it.
            if (RequestLimits.BodyTooLarge(context))
            {
                var tooLarge = new ProblemDetails { Status = 413, Title = "The request is too large." };
                tooLarge.Extensions["code"] = "request_too_large";
                return new ObjectResult(tooLarge) { StatusCode = 413, ContentTypes = { "application/problem+json" } };
            }

            // A JSON value of the wrong type is reported twice: under its path (`$.keepPhotos`)
            // and under the name of the body's parameter. The path names the field.
            var invalid = context.ModelState.Where(e => e.Value?.Errors.Count > 0).Select(e => e.Key).ToList();
            var field = (invalid.FirstOrDefault(key => key.StartsWith("$.", StringComparison.Ordinal)) ?? invalid.FirstOrDefault())?.TrimStart('$', '.');
            var details = new ProblemDetails { Status = 400, Title = "A field is not valid." };
            details.Extensions["code"] = "validation_failed";
            if (!string.IsNullOrEmpty(field))
            {
                details.Extensions["field"] = char.ToLowerInvariant(field[0]) + field[1..];
            }

            return new ObjectResult(details) { StatusCode = 400, ContentTypes = { "application/problem+json" } };
        };
    });
// No exception detail, stack trace or internal name ever reaches a response (L2-052 AC5).
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
{
    context.ProblemDetails.Detail = null;
    context.ProblemDetails.Extensions.Remove("exception");
});
builder.Services.AddExceptionHandler<ProblemExceptionHandler>();
builder.Services.AddExceptionHandler<UnexpectedExceptionHandler>();
builder.Services.AddPopkinRateLimits();

// The hub speaks the JSON of the controllers: camelCase, enums as their names. Detailed hub
// errors are for Development only (L2-052 AC5). Its state lives in this one instance (ADR 0009).
// A refused hub call fails with the ProblemDetails `code` of the refusal.
builder.Services
    .AddSignalR(options =>
    {
        options.EnableDetailedErrors = builder.Environment.IsDevelopment();
        // A session description of 32 KB and its envelope pass the default of 32 KB; nothing
        // larger than 64 KB is read.
        options.MaximumReceiveMessageSize = 64 * 1024;
        options.AddFilter<ProblemHubFilter>();
        options.AddFilter<SignalRateLimitFilter>();
    })
    .AddJsonProtocol(options => options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSingleton<IUserIdProvider, PersonUserIdProvider>();
builder.Services.AddSingleton<IPopkinNotifier, SignalRPopkinNotifier>();
builder.Services.AddSingleton<IPopkinConnections, HubPopkinConnections>();
builder.Services.AddHostedService<PresenceBroadcaster>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// The session cookie and the server-side session behind it; 401 and 403, never a redirect.
builder.Services.AddPopkinSessions();

// Every endpoint requires a signed-in caller unless it opts out with [AllowAnonymous].
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

var app = builder.Build();

app.UseMiddleware<SecurityHeadersMiddleware>();
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseExceptionHandler();
app.UseStatusCodePages();

// Swagger stays above UseAuthentication so the fallback policy never hides the API description.
if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<SameSiteRequestMiddleware>();
app.UseRouting();
app.UseAuthentication();
// After authentication, so a limit counted per person can read who is asking.
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();
app.MapHub<PopkinHub>(PopkinHub.Path);

app.Run();

public partial class Program;
