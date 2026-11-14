using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Mvc;

namespace Popkin.Api.Problems;

/// <summary>Tells a body the action refused for its size from a field that breaks its rule.</summary>
public static class RequestLimits
{
    public static bool BodyTooLarge(ActionContext context)
    {
        var limit = context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<IRequestSizeLimitMetadata>()?.MaxRequestBodySize;
        if (limit is { } max && context.HttpContext.Request.ContentLength > max)
        {
            return true;
        }

        // A body without a length is stopped by the server as it is read, past the limit.
        return context.ModelState.Values
            .SelectMany(entry => entry.Errors)
            .Select(error => error.Exception)
            .Any(exception => Chain(exception).OfType<BadHttpRequestException>().Any(bad => bad.StatusCode == StatusCodes.Status413PayloadTooLarge));
    }

    private static IEnumerable<Exception> Chain(Exception? exception)
    {
        for (; exception is not null; exception = exception.InnerException)
        {
            yield return exception;
        }
    }
}
