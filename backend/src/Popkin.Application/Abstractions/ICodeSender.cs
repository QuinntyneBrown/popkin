using Popkin.Domain;

namespace Popkin.Application.Abstractions;

/// <summary>Delivers a code over one channel. Azure Communication Services sends both (ADR 0021).</summary>
public interface ICodeSender
{
    ContactChannel Channel { get; }

    /// <summary>Throws <see cref="CodeNotSentException"/> when the provider cannot deliver it.</summary>
    Task SendAsync(string destination, string code, CancellationToken cancellationToken);
}

public sealed class CodeNotSentException() : Exception("The code could not be sent.");
