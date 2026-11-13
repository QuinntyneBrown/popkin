using Popkin.Application.Abstractions;

namespace Popkin.Api.Tests.Support;

/// <summary>Issues the codes a test queues, then 482913, the code the mocks show.</summary>
public sealed class FixedCodeGenerator : ICodeGenerator
{
    private readonly Queue<string> _next = new();

    public void Next(params string[] codes)
    {
        foreach (var code in codes)
        {
            _next.Enqueue(code);
        }
    }

    public string NewCode() => _next.Count > 0 ? _next.Dequeue() : "482913";
}
