using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Popkin.Api.Tests.Support;

/// <summary>Keeps every line the API logs, formatted, so a test can read what was written.</summary>
public sealed class CapturingLoggerProvider : ILoggerProvider
{
    private readonly ConcurrentQueue<string> _lines = new();

    public IReadOnlyList<string> Lines => _lines.ToList();

    public ILogger CreateLogger(string categoryName) => new Logger(_lines);

    public void Dispose()
    {
    }

    private sealed class Logger(ConcurrentQueue<string> lines) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            lines.Enqueue(formatter(state, exception));
    }
}
