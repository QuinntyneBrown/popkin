using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Popkin.Api.Auth;
using Popkin.Api.Problems;
using Popkin.Api.RateLimiting;
using Popkin.Api.Security;
using Popkin.Application;
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
            var field = context.ModelState.FirstOrDefault(e => e.Value?.Errors.Count > 0).Key?.TrimStart('$', '.');
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

app.Run();

public partial class Program;
