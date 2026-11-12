using System.Security.Cryptography;
using Popkin.Application.Abstractions;

namespace Popkin.Infrastructure.Auth;

public sealed class RandomCodeGenerator : ICodeGenerator
{
    public string NewCode() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
}

/// <summary>
/// Development only: issues the configured code every time (`Auth:DevelopmentCode`), so the API
/// recorder can confirm a code it never sees. Never registered outside Development.
/// </summary>
public sealed class DevelopmentCodeGenerator(string code) : ICodeGenerator
{
    public string NewCode() => code;
}
